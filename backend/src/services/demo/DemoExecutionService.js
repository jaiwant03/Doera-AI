/**
 * DOERA AI — Demo Execution Service
 * Centralized, fail-closed controller routing ALL external actions to safe simulators.
 * STRICT POLICY:
 * - DEMO_MODE=true permanently enforced.
 * - Zero real external dispatches to personal Gmail, WhatsApp, Telegram, calendars, or payment gateways.
 * - All actions labeled: "SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED"
 */

import { config } from '../../config/env.js';
import demoEmailService from './DemoEmailService.js';
import demoWhatsAppService from './DemoWhatsAppService.js';
import demoTelegramService from './DemoTelegramService.js';
import demoBookingService from './DemoBookingService.js';
import demoPaymentService from './DemoPaymentService.js';
import demoResponseService from './DemoResponseService.js';
import demoEvidenceService from './DemoEvidenceService.js';

import Task from '../../models/Task.js';
import TaskEvent from '../../models/TaskEvent.js';
import FollowUp from '../../models/FollowUp.js';
import realtimeServer from '../../websocket/wsServer.js';
import { logger } from '../../utils/logger.js';
import { buildTaskLookup } from '../../utils/queryHelper.js';

export class DemoExecutionService {
  constructor() {
    this.executedApprovals = new Set();
  }

  /**
   * Verify fail-closed demo enforcement
   */
  assertDemoMode() {
    if (!config.demoMode) {
      throw new Error(
        'SECURITY EXCEPTION: Demo Mode is disabled or unverified. Live external actions are strictly prohibited in this deployment.'
      );
    }
  }

  /**
   * Main Dispatch Router for Approved Actions
   */
  async executeAction(approval, userId) {
    this.assertDemoMode();

    if (!approval) {
      throw new Error('DemoExecutionService: Approval object is required.');
    }

    const {
      _id: approvalId,
      actionTitle,
      actionType,
      actionPayload = {},
      target = {},
      taskId,
      idempotencyKey,
    } = approval;

    // Idempotency check
    const dedupKey = idempotencyKey || String(approvalId);
    if (this.executedApprovals.has(dedupKey) && approval.status === 'EXECUTED') {
      logger.warn(`[DemoExecutionService] Duplicate execution prevented for: ${dedupKey}`);
      return approval.executionResult;
    }

    logger.info(`[DemoExecutionService] 🛡️ Executing SIMULATED action: "${actionTitle}" (${actionType})`);

    let executionResult;

    switch (actionType) {
      case 'SEND_EMAIL':
      case 'SEND_OUTREACH': {
        // Derive recipient address RFC 5322
        let recipient = target?.email || actionPayload?.email || actionPayload?.recipientEmail || actionPayload?.recipient;
        if (!recipient || !String(recipient).includes('@')) {
          const rawName = target?.name || actionPayload?.recipientName || 'Service Provider';
          const safeSlug = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'provider';
          recipient = `"${rawName}" <${safeSlug}@sandbox.doera.local>`;
        }

        executionResult = await demoEmailService.dispatch({
          to: recipient,
          subject: actionPayload?.subject || `Inquiry regarding: ${actionTitle}`,
          htmlBody: actionPayload?.emailHtml || actionPayload?.message,
          textBody: actionPayload?.emailText || actionPayload?.message || 'Inquiry message',
          target,
          actionPayload,
        });
        break;
      }

      case 'SEND_WHATSAPP': {
        const phone = target?.phone || actionPayload?.phone || '+919842100000';
        executionResult = await demoWhatsAppService.dispatch({
          to: phone,
          textMessage: actionPayload?.whatsappText || actionPayload?.message || `Inquiry: ${actionTitle}`,
          target,
        });
        break;
      }

      case 'SEND_TELEGRAM': {
        const chatId = target?.destination || actionPayload?.chatId || '@doera_demo_channel';
        executionResult = await demoTelegramService.dispatch({
          chatId,
          text: actionPayload?.message || `[DOERA AI Demo]: ${actionTitle}`,
          target,
        });
        break;
      }

      case 'BOOK_APPOINTMENT':
      case 'CONFIRM_BOOKING': {
        executionResult = await demoBookingService.dispatch({
          providerName: target?.name || actionPayload?.providerName,
          serviceType: actionTitle,
          startDateTime: actionPayload?.startDateTime,
          endDateTime: actionPayload?.endDateTime,
          target,
          actionPayload,
        });
        break;
      }

      case 'PROCESS_PAYMENT':
      case 'EXECUTE_PAYMENT': {
        executionResult = await demoPaymentService.dispatch({
          amount: approval.estimatedCost || actionPayload?.amount || 500,
          currency: approval.currency || 'INR',
          description: actionTitle,
          recipient: target?.name || 'Authorized Provider',
          target,
        });
        break;
      }

      case 'SUBMIT_FORM':
      case 'API_DISPATCH':
      default: {
        const demoId = `DEMO-ACTION-${Math.floor(1000 + Math.random() * 9000)}`;
        executionResult = {
          success: true,
          isSimulated: true,
          demoExecutionId: demoId,
          delivered: true,
          channel: 'Direct Sandbox Dispatch (Simulated)',
          provider: 'SIMULATED_INTEGRATION_ENGINE',
          status: 'DELIVERED',
          externalReference: demoId,
          providerResponse: {
            simulated: true,
            simulationBanner: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
            executionId: demoId,
            actionTitle,
            status: 'ACCEPTED',
            completedAt: new Date().toISOString(),
          },
          completedAt: new Date().toISOString(),
        };
        break;
      }
    }

    // Mark deduplication key
    this.executedApprovals.add(dedupKey);

    // Save ExecutionEvidence record
    const evidence = await demoEvidenceService.recordEvidence({
      taskId,
      userId: userId || approval.userId,
      agentName: approval.requestingAgent || 'Communication',
      actionType,
      externalProvider: executionResult.provider,
      verificationStatus: executionResult.status || 'DELIVERED',
      requestSummary: `[SIMULATED] ${actionTitle}`,
      providerResponse: executionResult.providerResponse,
      demoExecutionId: executionResult.demoExecutionId,
      sourceUrls: approval.evidence || [],
      metadata: {
        channel: executionResult.channel,
        recipient: executionResult.recipient || target?.name,
      },
    });

    // Attach evidence details to execution result
    executionResult.evidenceId = evidence?._id || null;
    executionResult.simulationNotice = 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED';

    // Log TaskEvent
    if (taskId) {
      await TaskEvent.create({
        taskId,
        eventType: 'INTEGRATION_CALL',
        agentName: approval.requestingAgent || 'Execution',
        action: `[SIMULATED] Executed ${actionType} with ID ${executionResult.demoExecutionId}`,
        details: {
          isSimulated: true,
          demoExecutionId: executionResult.demoExecutionId,
          channel: executionResult.channel,
          status: executionResult.status,
        },
        timestamp: new Date(),
      }).catch(() => {});
    }

    // Schedule Simulated Follow-Up for Outreach Actions
    if (['SEND_EMAIL', 'SEND_OUTREACH', 'SEND_WHATSAPP'].includes(actionType)) {
      await this.scheduleSimulatedFollowUp({
        approval,
        userId: userId || approval.userId,
        taskId,
        executionResult,
      });
    }

    return executionResult;
  }

  /**
   * Schedule simulated follow-up record in MongoDB
   */
  async scheduleSimulatedFollowUp({ approval, userId, taskId, executionResult }) {
    try {
      const recipientName = approval.target?.name || 'Verified Provider';
      const recipient = executionResult.recipient || approval.target?.destination || 'provider@sandbox.doera.local';
      const channel = executionResult.channel?.includes('WhatsApp') ? 'WhatsApp' : 'Email';

      // Set check 30 seconds into the future for fast hackathon demo verification
      const nextCheckAt = new Date(Date.now() + 30 * 1000);

      const followUp = await FollowUp.create({
        taskId: taskId || null,
        userId,
        actionId: executionResult.demoExecutionId,
        channel,
        recipient,
        recipientName,
        purpose: `Monitor simulated response for inquiry: "${approval.actionTitle}"`,
        scheduledAt: new Date(),
        nextCheckAt,
        checkIntervalHours: 1,
        maximumAttempts: 3,
        status: 'WAITING',
        notes: `Simulated follow-up initialized for ${recipientName} (${executionResult.demoExecutionId}).`,
      });

      logger.info(`[DemoExecutionService] Scheduled simulated follow-up: ${followUp._id} (${recipientName})`);
      realtimeServer.sendToUser(userId, 'followup_created', { followUp });
    } catch (err) {
      logger.warn('[DemoExecutionService] Follow-up scheduling notice:', err.message);
    }
  }
}

export const demoExecutionService = new DemoExecutionService();
export default demoExecutionService;
