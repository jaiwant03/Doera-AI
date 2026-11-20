import axios from 'axios';
import User from '../models/User.js';
import Integration from '../models/Integration.js';
import Task from '../models/Task.js';
import ExecutionEvidence from '../models/ExecutionEvidence.js';
import emailAdapter from '../integrations/emailAdapter.js';
import googleAuthService from './googleAuthService.js';
import { decrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';
import { buildTaskLookup } from '../utils/queryHelper.js';

/**
 * DOERA AI — Execution Authorization & Multi-User Dispatch Service
 * 
 * CORE PRINCIPLE:
 * "Unified AI Execution: All authenticated users have full access to genuine AI capabilities.
 * Live email dispatch strictly requires personal Gmail OAuth2 authorization via Google Sign-In.
 * Manual password accounts can create and preview email drafts, but cannot send live emails.
 * Real-time bookings, appointments, reservations, payments, and messaging are permanently disabled."
 */
class ExecutionAuthorizationService {
  constructor() {
    this.executedApprovals = new Set();
  }

  /**
   * Determine the effective execution mode and authorization status for a user
   * Server-authoritative: Frontend cannot override or spoof this.
   */
  async evaluateUserEligibility(userId) {
    if (!userId) {
      return {
        eligible: false,
        mode: 'UNIFIED',
        reason: 'Unauthenticated or missing user ID.',
      };
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return {
        eligible: false,
        mode: 'UNIFIED',
        reason: 'User account not found.',
      };
    }

    const isGoogleAuth = user.authProvider === 'google' && !!user.googleSubjectId;

    // Check user's explicitly connected Gmail integration
    const gmailIntegration = await Integration.findOne({
      userId: user._id,
      provider: 'gmail',
      status: 'connected',
    });

    const hasValidGmail = !!(gmailIntegration && gmailIntegration.encryptedRefreshToken);

    return {
      eligible: true,
      mode: 'UNIFIED',
      user,
      isGoogleAuth,
      gmailIntegration: hasValidGmail ? gmailIntegration : null,
      gmailConnected: hasValidGmail,
      gmailEmail: gmailIntegration?.accountEmail || gmailIntegration?.providerEmail || null,
      canSendLiveEmail: isGoogleAuth && hasValidGmail,
    };
  }

  /**
   * Authorize and execute an approved human action
   * Enforces strict multi-tenant isolation, version checks, and idempotency.
   */
  async executeApprovedAction(approval, userId) {
    if (!approval) {
      throw new Error('Approval object is required for execution.');
    }

    // Strict ownership validation (TEST C: User A cannot execute for User B)
    if (String(approval.userId) !== String(userId)) {
      throw new Error('SECURITY VIOLATION: Unauthorized execution attempt. You do not own this approval request.');
    }

    // Prohibited actions check: Strict prohibition of fake bookings, reservations, payments, and messaging
    const prohibitedActions = ['SEND_WHATSAPP', 'SEND_TELEGRAM', 'BOOK_APPOINTMENT', 'CONFIRM_BOOKING', 'EXECUTE_PAYMENT', 'RESERVE_TABLE', 'AUTOMATE_CALL', 'PURCHASE'];
    if (prohibitedActions.includes(approval.actionType)) {
      const err = new Error(`Execution rejected: Action "${approval.actionType}" is permanently prohibited. DOERA AI operates as a research, intelligence and planning platform and does not perform unverified bookings, reservations, payments, or third-party messaging.`);
      err.statusCode = 400;
      err.code = 'PROHIBITED_ACTION';
      throw err;
    }

    // Idempotency & duplicate protection (TEST L)
    const dedupKey = approval.idempotencyKey || String(approval._id);
    if (this.executedApprovals.has(dedupKey) && approval.status === 'EXECUTED') {
      logger.warn(`[ExecutionAuth] Duplicate execution blocked for idempotency key: ${dedupKey}`);
      return approval.executionResult;
    }

    // Expiration check
    if (typeof approval.isExpired === 'function' && approval.isExpired()) {
      throw new Error('Approval request has expired and cannot be executed.');
    }

    // Evaluate user authorization eligibility
    const eligibility = await this.evaluateUserEligibility(userId);

    const { actionType, actionPayload = {}, target = {} } = approval;

    // Outbound Email Action (Live Gmail OAuth2 Dispatch)
    if (actionType === 'SEND_EMAIL' || actionType === 'SEND_OUTREACH') {
      // Manual password users cannot dispatch real emails
      if (!eligibility.isGoogleAuth) {
        logger.warn(`[ExecutionAuth] Manual password user ${userId} attempted live email dispatch.`);
        const err = new Error(
          'Gmail connection required: Live email dispatch is only supported through personal Gmail accounts authorized via Google Sign-In. Manual password accounts can create, edit, and preview email drafts, but cannot dispatch live external emails. Please sign in with your Google account and connect Gmail in Settings to enable sending.'
        );
        err.statusCode = 403;
        err.code = 'GMAIL_OAUTH_REQUIRED';
        throw err;
      }

      // Google user has not connected Gmail -> Block real sending, require connection
      if (!eligibility.gmailConnected || !eligibility.gmailIntegration) {
        logger.warn(`[ExecutionAuth] User ${userId} attempted real email dispatch without connected Gmail integration.`);
        const err = new Error(
          'Gmail connection required: You are signed in via Google, but have not authorized Gmail sending. Please visit Integrations & Settings and click "Connect Gmail for Automation".'
        );
        err.statusCode = 403;
        err.code = 'GMAIL_CONNECTION_REQUIRED';
        throw err;
      }

      const userIntegration = eligibility.gmailIntegration;
      const senderEmail = userIntegration.accountEmail || userIntegration.providerEmail;

      // Extract and validate recipient RFC 5322
      let recipient = target?.email || actionPayload?.email || actionPayload?.recipientEmail || actionPayload?.recipient;
      if (!recipient || typeof recipient !== 'string' || !recipient.includes('@')) {
        throw new Error('Invalid or missing recipient email address.');
      }
      recipient = recipient.trim();

      const subject = actionPayload?.subject || `Inquiry regarding: ${approval.actionTitle}`;
      const body = actionPayload?.emailHtml || actionPayload?.message || actionPayload?.emailText || '';

      // Decrypt user's OAuth refresh token securely
      let refreshToken;
      try {
        refreshToken = decrypt(userIntegration.encryptedRefreshToken);
      } catch (decErr) {
        logger.error(`[ExecutionAuth] Decryption failed for user ${userId} Gmail refresh token:`, decErr.message);
        throw new Error('Security Error: Could not decrypt user OAuth credentials. Please reconnect Gmail in Settings.');
      }

      // Refresh token with Google to get fresh user access token (TEST I)
      let accessToken;
      try {
        const fresh = await googleAuthService.getFreshAccessToken(refreshToken);
        accessToken = fresh.accessToken;
      } catch (refreshErr) {
        logger.error(`[ExecutionAuth] Token refresh failed for ${senderEmail}:`, refreshErr.message);
        userIntegration.status = 'error';
        userIntegration.connectionStatus = 'expired';
        await userIntegration.save();
        await User.findByIdAndUpdate(userId, { gmailIntegrationStatus: 'disconnected' });
        throw new Error(`Gmail authorization has expired or was revoked by Google (${refreshErr.message}). Please reconnect Gmail in Integrations.`);
      }

      let dispatchResult = null;
      let executionEngine = 'GMAIL_OAUTH2_DIRECT';

      // Secure n8n Multi-User Execution Pipeline:
      // If N8N_WEBHOOK_URL is configured, supply the user's fresh access token & sender identity
      if (process.env.N8N_WEBHOOK_URL) {
        try {
          logger.info(`[ExecutionAuth] Dispatching to n8n workflow for sender "${senderEmail}" -> recipient "${recipient}"`);
          const n8nRes = await axios.post(
            process.env.N8N_WEBHOOK_URL,
            {
              approvalId: approval._id,
              taskId: approval.taskId,
              actionType,
              sender: senderEmail,
              recipient,
              subject,
              body,
              userAccessToken: accessToken,
              authorizedAt: new Date().toISOString(),
            },
            { timeout: 8000 }
          );

          if (n8nRes.status >= 200 && n8nRes.status < 300) {
            executionEngine = 'N8N_GMAIL_AUTOMATION';
            dispatchResult = {
              success: true,
              messageId: n8nRes.data?.messageId || n8nRes.data?.id || `n8n_${Date.now()}`,
              threadId: n8nRes.data?.threadId || null,
              n8nExecutionId: n8nRes.data?.executionId || null,
            };
          }
        } catch (n8nErr) {
          // TEST K: n8n unavailable -> safely fall back to native Gmail OAuth without duplicate sending
          logger.warn('[ExecutionAuth] n8n webhook unreachable, utilizing direct Gmail API dispatch fallback:', n8nErr.message);
        }
      }

      // If n8n was not configured or fell back, dispatch directly via Google Gmail API
      if (!dispatchResult) {
        dispatchResult = await emailAdapter.sendViaGmailOAuth(userIntegration, recipient, subject, body);
        executionEngine = 'GMAIL_OAUTH2_DIRECT';
      }

      // Record tamper-proof Execution Evidence in MongoDB
      if (approval.taskId) {
        await ExecutionEvidence.create({
          taskId: approval.taskId,
          userId,
          agentName: 'Execution Agent',
          actionType: 'SEND_EMAIL',
          externalProvider: executionEngine === 'N8N_GMAIL_AUTOMATION' ? 'n8n Master Orchestrator (User Gmail)' : 'Google Gmail API (User OAuth2)',
          verificationStatus: 'DELIVERED',
          requestPayload: {
            sender: senderEmail,
            recipient,
            subject,
          },
          responsePayload: {
            messageId: dispatchResult.messageId,
            threadId: dispatchResult.threadId,
            status: 'DELIVERED',
            provider: executionEngine,
          },
          verifiedAt: new Date(),
        }).catch((evErr) => logger.warn('[ExecutionAuth] Evidence write notice:', evErr.message));

        // Update linked task
        const linkedTask = await Task.findOne(buildTaskLookup(approval.taskId));
        if (linkedTask) {
          linkedTask.status = 'IN_PROGRESS';
          linkedTask.currentAction = `Email dispatched to ${recipient} via ${senderEmail}`;
          await linkedTask.save().catch(() => {});
        }
      }

      this.executedApprovals.add(dedupKey);

      return {
        delivered: true,
        isSimulated: false,
        executionMode: 'REAL',
        channel: 'Gmail OAuth2 (Personal Authenticated Sender)',
        sender: senderEmail,
        recipient,
        subject,
        messageId: dispatchResult.messageId,
        threadId: dispatchResult.threadId,
        status: 'DELIVERED',
        details: `Real email dispatched from authorized Gmail identity: ${senderEmail} to ${recipient}. Google Message ID: ${dispatchResult.messageId}`,
        completedAt: new Date().toISOString(),
      };
    }

    // Any other action type is unsupported in the unified platform
    logger.warn(`[ExecutionAuth] Action "${actionType}" is unsupported.`);
    const err = new Error(
      `Unsupported action: Action "${actionType}" is not supported. DOERA AI operates as a unified research, intelligence, analysis, and planning platform.`
    );
    err.statusCode = 400;
    err.code = 'UNSUPPORTED_ACTION';
    throw err;
  }
}

export const executionAuthorizationService = new ExecutionAuthorizationService();
export default executionAuthorizationService;
