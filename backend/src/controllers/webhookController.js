import mongoose from 'mongoose';
import Task from '../models/Task.js';
import AgentExecution from '../models/AgentExecution.js';
import whatsappAdapter from '../integrations/whatsappAdapter.js';
import realtimeServer from '../websocket/wsServer.js';
import { buildTaskLookup } from '../utils/queryHelper.js';
import { logger } from '../utils/logger.js';

/**
 * Handle external or workflow updates
 */
export const handleWorkflowWebhook = async (req, res) => {
  logger.info('[Webhook] Received external workflow update.');

  const { taskId, status, outcome, error, event } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'Missing taskId in webhook payload.' });
  }

  const task = await Task.findOne(buildTaskLookup(taskId));
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  if (status) task.status = status;
  if (outcome) task.outcome = { ...task.outcome, ...outcome };
  if (error) task.error = { message: error, occurredAt: new Date() };

  await task.save();

  // Notify frontend via WebSocket
  realtimeServer.sendToUser(task.userId, 'task_update', { task });

  res.json({ success: true, taskId, updatedStatus: task.status });
};

/**
 * Handle bidirectional n8n workflow callbacks
 */
export const handleN8nCallback = async (req, res) => {
  const { taskId, executionId, status, outputData, agent, action } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  const task = await Task.findOne(buildTaskLookup(taskId));
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  // Log idempotent AgentExecution
  await AgentExecution.create({
    taskId: task._id,
    executionId: executionId || new mongoose.Types.ObjectId().toString(),
    agentName: 'Orchestrator',
    agentType: 'n8n_integration',
    status: status === 'SUCCESS' || status === 'COMPLETED' ? 'completed' : 'failed',
    input: { taskId: task.taskId, agent, action },
    output: outputData || {},
    metadata: {
      source: 'n8n_webhook',
      executionId,
      action: action || `Automation callback: ${status || 'SUCCESS'}`,
    },
  }).catch(() => {});

  if (status === 'SUCCESS' || status === 'COMPLETED') {
    task.status = 'COMPLETED';
    if (outputData) task.outcome = { ...task.outcome, ...outputData };
  } else if (status === 'FAILED') {
    task.status = 'FAILED';
    task.error = { message: outputData?.error || 'n8n execution failed', occurredAt: new Date() };
  }
  await task.save();

  // Notify frontend in real-time
  realtimeServer.sendToUser(task.userId, 'task_update', {
    task: {
      taskId: task.taskId,
      status: task.status,
      currentAgent: agent || task.currentAgent,
      currentAction: action || `n8n execution ${status || 'processed'}`,
    },
  });

  res.json({ success: true, message: 'n8n callback processed successfully' });
};

export const handleGmailWebhook = async (req, res) => {
  logger.info('[Webhook] Received Gmail incoming update.');
  res.status(200).send('OK');
};

export const handleWhatsappWebhook = async (req, res) => {
  // Handle Meta Webhook Verification challenge
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verified = whatsappAdapter.verifyWebhook(mode, token, challenge);
    if (verified) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification token mismatch');
  }

  // Handle incoming message event
  logger.info('[Webhook] Received WhatsApp incoming message event.');
  res.status(200).send('EVENT_RECEIVED');
};
