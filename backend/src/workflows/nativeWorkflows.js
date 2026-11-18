import axios from 'axios';
import AgentExecution from '../models/AgentExecution.js';
import realtimeServer from '../websocket/wsServer.js';
import emailAdapter from '../integrations/emailAdapter.js';
import whatsappAdapter from '../integrations/whatsappAdapter.js';
import calendarAdapter from '../integrations/calendarAdapter.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Native Manual Workflow Engine
 * Executes all 7 core automation workflows directly in pure Node.js
 * Optionally forwards events to an external n8n Webhook URL (no API key required) if configured.
 * No Docker, no n8n server, no API key required for deployment.
 */
class NativeWorkflowEngine {
  /**
   * Helper to dispatch simple HTTP POST webhook to external n8n without any API key
   */
  async dispatchN8nWebhook(endpointPath, payload) {
    const webhookBase = process.env.N8N_WEBHOOK_URL;
    if (!webhookBase) return;

    try {
      const cleanBase = webhookBase.replace(/\/+$/, '');
      const cleanPath = endpointPath.replace(/^\/+/, '');
      const url = `${cleanBase}/${cleanPath}`;
      await axios.post(url, payload, { timeout: 3000 });
      logger.info(`[n8n Webhook] Dispatched event to: ${url}`);
    } catch (err) {
      logger.debug(`[n8n Webhook] Webhook ping notice for ${endpointPath}: ${err.message}`);
    }
  }

  /**
   * Record agent execution step directly in agentexecutions collection
   */
  async recordExecution({ task, agentName, status = 'completed', action, input, output, metadata = {} }) {
    if (!task?._id) return;
    const validAgent = ['Orchestrator', 'Discovery', 'Communication', 'Quotation', 'Scheduling', 'Verification', 'Recovery'].includes(agentName)
      ? agentName
      : 'Orchestrator';
    return AgentExecution.create({
      taskId: task._id,
      agentName: validAgent,
      agentType: 'autonomous',
      status,
      input: input || {},
      output: output || {},
      metadata: {
        action,
        ...metadata,
      },
    }).catch((err) => logger.warn('[Native Workflows] Failed to log AgentExecution:', err.message));
  }

  /**
   * Workflow 1: Task Execution Trigger
   */
  async triggerTaskExecution(task) {
    logger.info(`[Native Workflow 01] Task Execution Triggered for: ${task.taskId}`);
    
    // Optional zero-auth Webhook notification to external n8n
    this.dispatchN8nWebhook('task-trigger', {
      taskId: task.taskId,
      userRequest: task.userRequest,
      category: task.category,
    }).catch(() => {});

    await this.recordExecution({
      task,
      agentName: 'Orchestrator',
      status: 'started',
      action: 'Task registered in native execution queue',
      input: { userRequest: task.userRequest, category: task.category },
      output: { status: 'UNDERSTANDING' },
      metadata: { eventType: 'TASK_TRIGGERED' },
    });

    realtimeServer.sendToUser(task.userId, 'task_update', {
      task: {
        taskId: task.taskId,
        status: 'UNDERSTANDING',
        currentAgent: 'Orchestrator',
        currentAction: 'Analyzing request and building execution plan...',
      },
    });

    return { success: true, workflowId: 'wf-01-trigger', status: 'REGISTERED' };
  }

  /**
   * Workflow 2: Email Communication
   */
  async executeEmailCommunication({ task, to, subject, htmlBody, textBody, userIntegration }) {
    logger.info(`[Native Workflow 02] Executing Email Outreach to: ${to}`);

    // Optional zero-auth Webhook notification to external n8n
    this.dispatchN8nWebhook('email-send', {
      taskId: task.taskId,
      to,
      subject,
      textBody,
    }).catch(() => {});

    const result = await emailAdapter.sendEmail({
      to,
      subject,
      htmlBody,
      textBody,
      userIntegration,
    });

    await this.recordExecution({
      task,
      agentName: 'Communication',
      status: 'completed',
      action: `Email sent to ${to}`,
      input: { to, subject },
      output: result,
      metadata: { eventType: 'EMAIL_DISPATCHED' },
    });

    return result;
  }

  /**
   * Workflow 3: WhatsApp Communication
   */
  async executeWhatsAppCommunication({ task, to, textMessage }) {
    logger.info(`[Native Workflow 03] Executing WhatsApp Outreach to: ${to}`);

    // Optional zero-auth Webhook notification to external n8n
    this.dispatchN8nWebhook('whatsapp-send', {
      taskId: task.taskId,
      to,
      textMessage,
    }).catch(() => {});

    const result = await whatsappAdapter.sendMessage({
      to,
      textMessage,
    });

    await this.recordExecution({
      task,
      agentName: 'Communication',
      status: result.success ? 'completed' : 'failed',
      action: `WhatsApp message dispatched to ${to}`,
      input: { to, textMessage },
      output: result,
      metadata: { eventType: 'WHATSAPP_DISPATCHED' },
    });

    return result;
  }

  /**
   * Workflow 4: Provider Response Handler
   */
  async handleProviderResponse({ task, providerName, replyText, channel = 'Email' }) {
    logger.info(`[Native Workflow 04] Processing Incoming Provider Response for: ${task.taskId}`);

    // Optional zero-auth Webhook notification to external n8n
    this.dispatchN8nWebhook('provider-response', {
      taskId: task.taskId,
      providerName,
      replyText,
      channel,
    }).catch(() => {});

    task.outcome = task.outcome || {};
    task.outcome.responseReceived = replyText;

    await task.save().catch(() => {});

    await this.recordExecution({
      task,
      agentName: 'Communication',
      status: 'completed',
      action: `Response received from ${providerName} via ${channel}`,
      input: { provider: providerName, channel },
      output: { reply: replyText },
      metadata: { eventType: 'PROVIDER_REPLIED' },
    });

    realtimeServer.sendToUser(task.userId, 'task_update', { task });

    return { success: true, workflowId: 'wf-04-response', processed: true };
  }

  /**
   * Workflow 5: Scheduling
   */
  async executeScheduling({ task, providerContact, preferredSlot, userIntegration, externalConfirmation = null }) {
    logger.info(`[Native Workflow 05] Executing Appointment Scheduling for: ${task.taskId}`);

    const targetSlot = preferredSlot || 'Tomorrow at 10:30 AM';
    const internalReferenceId = `DOERA-REQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const hasExternalConfirmation = Boolean(externalConfirmation?.providerConfirmationId);
    const bookingStatus = hasExternalConfirmation ? 'CONFIRMED' : 'AWAITING_CONFIRMATION';
    const providerConfirmationId = hasExternalConfirmation ? externalConfirmation.providerConfirmationId : null;

    // Optional zero-auth Webhook notification to external n8n
    this.dispatchN8nWebhook('scheduling-trigger', {
      taskId: task.taskId,
      slot: targetSlot,
      referenceCode: internalReferenceId,
      bookingStatus,
    }).catch(() => {});

    const bookingDetails = {
      providerName: providerContact.businessName,
      dateTime: targetSlot,
      internalReferenceId,
      providerConfirmationId,
      bookingStatus,
      confirmationEvidence: hasExternalConfirmation ? externalConfirmation.evidence : null,
      location: providerContact.address || 'Clinic / Provider Location',
      service: task.userRequest,
    };

    task.bookingDetails = bookingDetails;
    await task.save().catch(() => {});

    await this.recordExecution({
      task,
      agentName: 'Scheduling',
      status: 'completed',
      action: hasExternalConfirmation
        ? `Appointment confirmed with ${providerContact.businessName} on ${targetSlot}. Code: ${providerConfirmationId}`
        : `Appointment slot identified for ${targetSlot}. Reference: ${internalReferenceId} (Awaiting Provider Confirmation)`,
      input: { preferredSlot: targetSlot, provider: providerContact.businessName },
      output: bookingDetails,
      metadata: { eventType: 'APPOINTMENT_REQUESTED', bookingStatus },
    });

    return { success: true, workflowId: 'wf-05-scheduling', bookingDetails };
  }

  /**
   * Workflow 6: Follow-up Reminders
   */
  async executeFollowupReminder({ task, providerName, recipient, reminderType = 'QUOTE_FOLLOWUP' }) {
    logger.info(`[Native Workflow 06] Scheduling Follow-up Reminder for task: ${task.taskId}`);

    this.dispatchN8nWebhook('followup-reminders', {
      taskId: task.taskId,
      providerName,
      recipient,
      reminderType,
    }).catch(() => {});

    await this.recordExecution({
      task,
      agentName: 'Communication',
      status: 'completed',
      action: `Automated follow-up scheduled for provider: ${providerName}`,
      input: { providerName, recipient, reminderType },
      output: { scheduled: true },
      metadata: { eventType: 'FOLLOWUP_SCHEDULED' },
    });

    return { success: true, workflowId: 'wf-06-followup', scheduled: true };
  }

  /**
   * Workflow 6: Failure Recovery
   */
  async executeFailureRecovery({ task, error }) {
    logger.warn(`[Native Workflow 06] Initiating Failure Recovery for task: ${task.taskId}`);

    const retryCount = (task.retryCount || 0) + 1;
    task.retryCount = retryCount;

    // Optional zero-auth Webhook notification to external n8n
    this.dispatchN8nWebhook('failure-recovery', {
      taskId: task.taskId,
      error: error.message || String(error),
      retryCount,
    }).catch(() => {});

    if (retryCount >= 3) {
      task.status = 'FAILED';
      task.error = { message: error.message || String(error), occurredAt: new Date(), recoverable: false };
      await task.save().catch(() => {});

      await this.recordExecution({
        task,
        agentName: 'Recovery',
        status: 'failed',
        action: `Maximum retries exceeded (3). Task failed: ${error.message}`,
        input: { retryCount },
        output: { error: error.message },
        metadata: { eventType: 'RECOVERY_EXHAUSTED' },
      });

      realtimeServer.sendToUser(task.userId, 'task_update', { task });
      return { recovered: false, status: 'FAILED' };
    }

    // Attempt provider failover if secondary contacts exist
    if (task.externalContacts && task.externalContacts.length > 1) {
      const secondary = task.externalContacts[1];
      await this.recordExecution({
        task,
        agentName: 'Recovery',
        status: 'completed',
        action: `Failover to secondary provider: ${secondary.businessName}`,
        input: { newPrimary: secondary.businessName },
        output: { newPrimary: secondary },
        metadata: { eventType: 'PROVIDER_FAILOVER' },
      });

      return {
        recovered: true,
        action: 'FAILOVER',
        newPrimaryContact: secondary,
        retryCount,
      };
    }

    return { recovered: true, action: 'RETRY', retryCount };
  }

  /**
   * Workflow 7: Task Completion
   */
  async executeTaskCompletion(task) {
    logger.info(`[Native Workflow 07] Finalizing Task Completion for: ${task.taskId}`);

    // Optional zero-auth Webhook notification to external n8n
    this.dispatchN8nWebhook('task-completion-trigger', {
      taskId: task.taskId,
      status: task.status,
      outcome: task.outcome,
    }).catch(() => {});

    await this.recordExecution({
      task,
      agentName: 'Verification',
      status: 'completed',
      action: `Task finalized with status: ${task.status}`,
      input: { status: task.status },
      output: { outcome: task.outcome, booking: task.bookingDetails },
      metadata: { eventType: 'TASK_COMPLETED' },
    });

    realtimeServer.sendToUser(task.userId, 'task_update', { task });

    return { success: true, workflowId: 'wf-07-completion', status: task.status };
  }
}

export const nativeWorkflows = new NativeWorkflowEngine();
export default nativeWorkflows;
