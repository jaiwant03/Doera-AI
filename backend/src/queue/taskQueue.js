import { v4 as uuidv4 } from 'uuid';
import Task from '../models/Task.js';
import AgentExecution from '../models/AgentExecution.js';
import Message from '../models/Message.js';
import Integration from '../models/Integration.js';
import agentGraph from '../workflows/agentGraph.js';
import realtimeServer from '../websocket/wsServer.js';
import nativeWorkflows from '../workflows/nativeWorkflows.js';
import buildEvidenceBasedResponse from '../services/evidenceResponseBuilder.js';
import { buildTaskLookup } from '../utils/queryHelper.js';
import { logger } from '../utils/logger.js';

class TaskQueue {
  constructor() {
    this.runningTasks = new Map(); // taskId -> { abortController, task }
  }

  /**
   * Enqueue and run a task asynchronously
   */
  async enqueueTask(taskDoc, isResume = false) {
    const taskId = taskDoc.taskId || taskDoc._id.toString();
    logger.info(`[Task Queue] Enqueuing task ${taskId} for asynchronous execution (isResume: ${isResume}).`);

    const abortController = new AbortController();
    this.runningTasks.set(taskId, { abortController, task: taskDoc });

    // Trigger Native Workflow 01 directly in Node.js
    nativeWorkflows.triggerTaskExecution(taskDoc).catch((err) => {
      logger.warn('[Task Queue] Native workflow trigger error:', err.message);
    });

    // Run execution loop in background
    setImmediate(async () => {
      try {
        await this.runTaskExecution(taskId, isResume);
      } catch (err) {
        logger.error(`[Task Queue] Uncaught error running task ${taskId}:`, err.message);
      }
    });

    return taskDoc;
  }

  /**
   * Main task execution loop
   */
  async runTaskExecution(taskId, isResume = false) {
    const task = await Task.findOne(buildTaskLookup(taskId));
    if (!task) return;

    // Fetch user integrations (e.g. Gmail OAuth, Calendar)
    const userIntegration = await Integration.findOne({ userId: task.userId, status: 'connected' });

    // Setup real-time event listener for LangGraph
    const onEvent = async (event) => {
      // Check if cancelled
      const active = this.runningTasks.get(taskId);
      if (active?.abortController?.signal?.aborted) {
        throw new Error('TASK_CANCELLED_BY_USER');
      }

      // Log AgentExecution to DB
      await AgentExecution.create({
        taskId: task._id,
        agentName: ['Orchestrator', 'Discovery', 'Communication', 'Quotation', 'Scheduling', 'Verification', 'Recovery'].includes(event.currentAgent)
          ? event.currentAgent
          : 'Orchestrator',
        agentType: 'autonomous',
        status: event.step?.status === 'completed' ? 'completed' : (event.step?.status === 'failed' ? 'failed' : 'started'),
        input: { userRequest: task.userRequest, action: event.currentAction },
        output: event,
        startTime: event.step?.timestamp ? new Date(event.step.timestamp) : new Date(),
        metadata: {
          eventType: event.type,
          action: event.currentAction,
          stepId: event.step?.id,
        },
      }).catch((err) => logger.warn('[Task Queue] Failed to log AgentExecution:', err.message));

      // Broadcast to user via WebSocket
      realtimeServer.sendToUser(task.userId, 'task_step', {
        taskId,
        currentAgent: event.currentAgent,
        currentAction: event.currentAction,
        step: event.step,
      });

      // Update in-memory and DB task status
      task.currentAgent = event.currentAgent || task.currentAgent;
      task.currentAction = event.currentAction || task.currentAction;
      await task.save().catch(() => {});
    };

    // Prepare initial graph state
    const initialState = {
      taskId,
      userId: task.userId,
      userRequest: task.userRequest,
      category: task.category,
      status: task.status,
      currentAgent: task.currentAgent,
      currentAction: task.currentAction,
      steps: task.steps || [],
      externalContacts: task.externalContacts || [],
      pendingApproval: task.pendingApproval,
      isApproved: isResume || task.status === 'EXECUTING',
      userIntegration,
      onEvent,
    };

    try {
      const resultState = await agentGraph.invoke(initialState);

      // Check if task paused at human approval gate
      if (resultState.requiresHumanApproval && !resultState.isApproved) {
        task.status = 'AWAITING_APPROVAL';
        task.pendingApproval = resultState.pendingApproval;
        task.steps = resultState.steps || task.steps;
        task.externalContacts = resultState.externalContacts || task.externalContacts;
        task.currentAgent = resultState.currentAgent || task.currentAgent;
        task.currentAction = resultState.currentAction || task.currentAction;
        await task.save();

        realtimeServer.sendToUser(task.userId, 'task_update', { task });
        logger.info(`[Task Queue] Task ${taskId} paused at human approval gate.`);
        return;
      }

      // Task reached conclusion
      task.status = resultState.status || 'COMPLETED';
      task.steps = resultState.steps || task.steps;
      task.outcome = resultState.outcome || task.outcome;
      task.bookingDetails = resultState.bookingDetails || task.bookingDetails;
      task.externalContacts = resultState.externalContacts || task.externalContacts;
      task.currentAgent = resultState.currentAgent || 'Orchestrator';
      task.currentAction = resultState.currentAction || 'Execution completed.';
      await task.save();

      this.runningTasks.delete(taskId);

      // Create an evidence-based final assistant message in the conversation
      const completionContent = buildEvidenceBasedResponse(task);

      // Persist final assistant answer message to MongoDB
      let completionMessage = null;
      try {
        completionMessage = await Message.create({
          conversationId: task.conversationId,
          userId: task.userId,
          sender: 'assistant',
          content: completionContent,
          taskId: task._id,
        });
      } catch (msgErr) {
        logger.error('[Task Queue] Failed to create completion message:', msgErr.message);
      }

      // Send completion update and real-time message via WebSocket
      realtimeServer.sendToUser(task.userId, 'task_update', { task });
      if (completionMessage) {
        realtimeServer.sendToUser(task.userId, 'new_message', {
          message: {
            ...completionMessage.toObject(),
            task: task.toObject ? task.toObject() : task,
          },
          conversationId: task.conversationId,
        });
      }

      nativeWorkflows.executeTaskCompletion(task).catch(() => {});

      logger.info(`[Task Queue] Task ${taskId} finished with status: ${task.status}`);
    } catch (err) {
      if (err.message === 'TASK_CANCELLED_BY_USER') {
        task.status = 'CANCELLED';
        task.currentAction = 'Task cancelled by user.';
        await task.save();
        this.runningTasks.delete(taskId);
        realtimeServer.sendToUser(task.userId, 'task_update', { task });
        return;
      }

      logger.error(`[Task Queue] Execution failed for task ${taskId}:`, err.message);
      task.status = 'FAILED';
      task.error = {
        message: err.message,
        occurredAt: new Date(),
        recoverable: true,
      };
      await task.save();
      this.runningTasks.delete(taskId);
      realtimeServer.sendToUser(task.userId, 'task_update', { task });

      // Execute Workflow 06 natively
      nativeWorkflows.executeFailureRecovery({ task, error: err }).catch(() => {});
    }
  }

  /**
   * Approve a pending task action
   */
  async approveTask(taskId, comments = '') {
    const task = await Task.findOne(buildTaskLookup(taskId));
    if (!task) throw new Error('Task not found');

    if (!['AWAITING_APPROVAL', 'WAITING_FOR_APPROVAL', 'ACTION_REQUIRED'].includes(task.status) && !task.pendingApproval) {
      throw new Error(`Task is in status "${task.status}" and cannot be approved.`);
    }

    task.status = 'EXECUTING';
    if (task.pendingApproval) {
      task.pendingApproval.approvedAt = new Date();
      task.pendingApproval.comments = comments;
    }
    task.currentAction = 'Human authorization granted. Executing communication step...';
    await task.save();

    realtimeServer.sendToUser(task.userId, 'task_update', { task });

    // Resume execution with isResume=true
    this.enqueueTask(task, true);
    return task;
  }

  /**
   * Reject a pending task action
   */
  async rejectTask(taskId, reason = '') {
    const task = await Task.findOne(buildTaskLookup(taskId));
    if (!task) throw new Error('Task not found');

    task.status = 'CANCELLED';
    if (task.pendingApproval) {
      task.pendingApproval.rejectedAt = new Date();
      task.pendingApproval.comments = reason || 'Rejected by user';
    }
    task.currentAction = `Proposed action rejected by user: ${reason || 'No comments'}`;
    await task.save();

    realtimeServer.sendToUser(task.userId, 'task_update', { task });
    return task;
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId) {
    const running = this.runningTasks.get(taskId);
    if (running?.abortController) {
      running.abortController.abort();
    }

    const task = await Task.findOne(buildTaskLookup(taskId));
    if (task) {
      task.status = 'CANCELLED';
      task.currentAction = 'Task cancelled by user.';
      await task.save();
      realtimeServer.sendToUser(task.userId, 'task_update', { task });
    }
    this.runningTasks.delete(taskId);
    return task;
  }

  /**
   * Resume an eligible interrupted or failed task
   */
  async resumeTask(taskId) {
    const task = await Task.findOne(buildTaskLookup(taskId));
    if (!task) throw new Error('Task not found');

    task.status = 'EXECUTING';
    task.error = null;
    task.retryCount = (task.retryCount || 0) + 1;
    await task.save();

    realtimeServer.sendToUser(task.userId, 'task_update', { task });
    return this.enqueueTask(task);
  }
}

export const taskQueue = new TaskQueue();
export default taskQueue;
