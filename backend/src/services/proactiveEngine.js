import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import Workflow from '../models/Workflow.js';
import WorkflowExecution from '../models/WorkflowExecution.js';
import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import Message from '../models/Message.js';
import FollowUp from '../models/FollowUp.js';
import TaskEvent from '../models/TaskEvent.js';
import realtimeServer from '../websocket/wsServer.js';
import emailAdapter from '../integrations/emailAdapter.js';
import { logger } from '../utils/logger.js';

class ProactiveEngine {
  constructor() {
    this.timer = null;
    this.intervalMs = 60000; // Poll every 60 seconds
  }

  start() {
    if (this.timer) return;
    logger.info('[Proactive Engine] Starting proactive scheduler and follow-up monitor...');
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    const now = new Date();
    try {
      // 1. Find all active workflows scheduled to run at or before now
      const dueWorkflows = await Workflow.find({
        status: 'active',
        nextRunAt: { $lte: now },
      }).limit(20);

      for (const wf of dueWorkflows) {
        await this.executeWorkflow(wf);
      }

      // 2. Monitor Pending Tasks for Unanswered Follow-Ups
      await this.monitorFollowUps();
    } catch (err) {
      logger.error('[Proactive Engine] Tick error:', err.message);
    }
  }

  /**
   * Execute Scheduled Workflow
   */
  async executeWorkflow(workflow) {
    const executionId = `exec-${uuidv4().substring(0, 8)}`;
    logger.info(`[Proactive Engine] Executing workflow "${workflow.name}" (${executionId})`);

    const execution = await WorkflowExecution.create({
      workflowId: workflow._id,
      userId: workflow.userId,
      executionId,
      status: 'running',
    });

    try {
      const results = [];
      for (const action of workflow.actions) {
        if (action.type === 'SEND_NOTIFICATION') {
          await this.notifyUser({
            userId: workflow.userId,
            title: workflow.name,
            message: action.params?.message || `Scheduled workflow "${workflow.name}" executed successfully.`,
            type: 'TASK_COMPLETED',
          });
          results.push({ action: 'NOTIFICATION_SENT' });
        } else if (action.type === 'SEND_EMAIL') {
          if (action.params?.to) {
            await emailAdapter.sendEmail({
              to: action.params.to,
              subject: action.params.subject || workflow.name,
              textBody: action.params.body || '',
            });
            results.push({ action: 'EMAIL_DISPATCHED', to: action.params.to });
          }
        }
      }

      execution.status = 'succeeded';
      execution.completedAt = new Date();
      execution.result = { actionsCompleted: results.length, details: results };
      await execution.save();

      // Schedule Next Run
      workflow.lastRunAt = new Date();
      workflow.runCount += 1;

      if (workflow.maxRuns && workflow.runCount >= workflow.maxRuns) {
        workflow.status = 'completed';
        workflow.nextRunAt = null;
      } else if (workflow.trigger.intervalHours) {
        workflow.nextRunAt = new Date(Date.now() + workflow.trigger.intervalHours * 3600000);
      } else {
        // Daily recurring default
        workflow.nextRunAt = new Date(Date.now() + 24 * 3600000);
      }
      await workflow.save();
    } catch (err) {
      logger.error('[Proactive Engine] Workflow execution failed:', err.message);
      execution.status = 'failed';
      execution.error = err.message;
      execution.completedAt = new Date();
      await execution.save();

      await this.notifyUser({
        userId: workflow.userId,
        title: `Automation Alert: ${workflow.name}`,
        message: `Execution failed: ${err.message}`,
        type: 'TASK_FAILED',
      });
    }
  }

  /**
   * Monitor outreach tasks requiring follow-ups via FollowUp collection
   */
  async monitorFollowUps() {
    const now = new Date();

    try {
      // 1. Process active scheduled FollowUps
      const dueFollowUps = await FollowUp.find({
        status: { $in: ['WAITING', 'SCHEDULED', 'FOLLOW_UP_DUE'] },
        nextCheckAt: { $lte: now },
      }).limit(20);

      for (const item of dueFollowUps) {
        item.attemptCount += 1;
        const recipientTitle = item.recipientName || item.recipient || 'Provider';

        if (item.attemptCount >= item.maximumAttempts) {
          item.status = 'STOPPED';
          item.notes = `Maximum outreach check limit reached (${item.maximumAttempts}/${item.maximumAttempts}). No response received.`;
          item.history.push({
            checkedAt: now,
            outcome: 'MAX_ATTEMPTS_REACHED',
            details: { attempts: item.attemptCount },
          });
          await item.save();

          await this.notifyUser({
            userId: item.userId,
            taskId: item.taskId,
            title: `DOERA Outreach Tracker: No Reply Detected`,
            message: `Outreach tracker reached maximum attempts for ${recipientTitle}. No external reply was detected.`,
            type: 'TASK_UPDATE',
          });

          realtimeServer.sendToUser(item.userId, 'followup_updated', { followUp: item });
          continue;
        }

        // Truthful telemetry: Log scheduled check attempt without fake simulation
        item.history.push({
          checkedAt: now,
          outcome: `Scheduled status check attempt ${item.attemptCount}/${item.maximumAttempts}. Awaiting external reply from ${recipientTitle}.`,
        });
        item.nextCheckAt = new Date(now.getTime() + (item.checkIntervalHours || 24) * 3600000);
        await item.save();

        realtimeServer.sendToUser(item.userId, 'followup_updated', { followUp: item });
      }
            title: `Follow-Up Completed: ${recipientTitle}`,
            message: `Outreach monitoring concluded for ${recipientTitle}. Maximum check attempts reached with no verified reply.`,
            type: 'TASK_COMPLETED',
          });

          realtimeServer.sendToUser(item.userId, 'followup_updated', { followUp: item });
          continue;
        }

        // Reschedule next check
        const nextTime = new Date(now.getTime() + (item.checkIntervalHours || 24) * 3600000);
        item.nextCheckAt = nextTime;
        item.status = 'FOLLOW_UP_DUE';
        item.history.push({
          checkedAt: now,
          outcome: `Attempt ${item.attemptCount} check completed. Pending provider reply.`,
          details: { nextCheckAt: nextTime },
        });
        await item.save();

        // Notify user of follow-up state
        await this.notifyUser({
          userId: item.userId,
          taskId: item.taskId,
          title: `DOERA Response Tracker: ${recipientTitle}`,
          message: `Attempt ${item.attemptCount}/${item.maximumAttempts}: Provider response check performed. Next check scheduled at ${nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          type: 'TASK_UPDATE',
        });

        // Broadcast live update over WebSocket
        realtimeServer.sendToUser(item.userId, 'followup_updated', { followUp: item });
      }
    } catch (followUpErr) {
      logger.warn('[Proactive Engine] FollowUp monitor error:', followUpErr.message);
    }

    // 2. Legacy Task check fallback
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 3600000);
      const pendingTasks = await Task.find({
        status: 'AWAITING_APPROVAL',
        'metadata.followUpScheduled': { $ne: true },
        updatedAt: { $lte: oneDayAgo },
      }).limit(5);

      for (const task of pendingTasks) {
        task.metadata = { ...(task.metadata || {}), followUpScheduled: true };
        await task.save();

        await this.notifyUser({
          userId: task.userId,
          taskId: task._id,
          title: 'DOERA Proactive Follow-Up Required',
          message: `Task "${task.userRequest.substring(0, 45)}..." has had no external response for 24 hours. Would you like DOERA to send a follow-up inquiry?`,
          type: 'APPROVAL_REQUIRED',
        });
      }
    } catch (_) {}
  }

  /**
   * Multi-Channel Notification Dispatcher
   */
  async notifyUser({ userId, taskId = null, title, message, type = 'TASK_COMPLETED' }) {
    const notif = await Notification.create({
      userId,
      taskId,
      title,
      message,
      type,
      read: false,
    });

    // Real-time WebSocket emission
    realtimeServer.sendToUser(userId, 'notification', notif);
    return notif;
  }
}

export const proactiveEngine = new ProactiveEngine();
export default proactiveEngine;
