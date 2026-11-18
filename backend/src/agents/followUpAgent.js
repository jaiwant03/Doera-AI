import FollowUp from '../models/FollowUp.js';
import { logger } from '../utils/logger.js';

class FollowUpAgent {
  constructor() {
    this.name = 'FollowUp';
  }

  /**
   * Schedule and manage follow-up tracking for an external outreach or inquiry
   */
  async scheduleFollowUp(taskContext, outreachDetails) {
    const startedAt = new Date();
    logger.info(`[Follow-up Agent] Setting up response tracker for task: ${taskContext.taskId}`);

    const recipient = outreachDetails?.recipient || outreachDetails?.target?.destination || 'Service Provider';
    const recipientName = outreachDetails?.recipientName || outreachDetails?.target?.name || 'Verified Provider';
    const channel = outreachDetails?.channel || 'Email';

    // Next check 24 hours from now
    const nextCheckAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let followUpDoc = null;
    if (taskContext.taskId && taskContext.userId) {
      followUpDoc = await FollowUp.create({
        taskId: taskContext.taskId,
        userId: taskContext.userId,
        channel: ['Email', 'WhatsApp', 'Telegram'].includes(channel) ? channel : 'Email',
        recipient,
        recipientName,
        purpose: `Monitor incoming provider quotation or appointment confirmation from ${recipientName}.`,
        scheduledAt: startedAt,
        nextCheckAt,
        attemptCount: 0,
        maximumAttempts: 3,
        status: 'SCHEDULED',
        stopCondition: 'PROVIDER_REPLY_RECEIVED',
        requiresApproval: true,
      }).catch((err) => {
        logger.warn('[Follow-up Agent] FollowUp persistence notice:', err.message);
      });
    }

    const completedAt = new Date();

    return {
      agentName: this.name,
      status: 'completed',
      followUpId: followUpDoc?._id || null,
      trackingStatus: 'SCHEDULED',
      nextCheckAt,
      recipient,
      recipientName,
      startedAt,
      completedAt,
    };
  }
}

export const followUpAgent = new FollowUpAgent();
export default followUpAgent;
