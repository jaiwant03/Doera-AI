import emailAdapter from '../integrations/emailAdapter.js';
import whatsappAdapter from '../integrations/whatsappAdapter.js';
import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

class CommunicationAgent {
  constructor() {
    this.name = 'Communication';
  }

  /**
   * Draft communication requiring human authorization before dispatch
   */
  async prepareOutreach(taskContext, primaryContact) {
    const startedAt = new Date();
    logger.info(`[Communication Agent] Drafting communication for: ${primaryContact?.businessName}`);

    if (!primaryContact) {
      return {
        recipient: 'Service Provider',
        subject: `Inquiry regarding: ${taskContext.userRequest}`,
        message: `Hello, inquiring regarding: ${taskContext.userRequest}. Kindly provide your earliest availability and pricing estimate.`,
        actionType: 'SEND_OUTREACH',
        channel: 'Email / Direct Message',
        requiresApproval: true,
      };
    }

    const systemPrompt = `You are DOERA AI's Communication Agent.
Draft a concise, professional inquiry to the service provider or medical clinic on behalf of the client.
Request availability, appointment slots, and consultation/service fees for the requested service.
Output JSON only:
{
  "subject": "Inquiry regarding service appointment - DOERA AI Client",
  "emailHtml": "<p>Professional HTML message body...</p>",
  "emailText": "Professional plain text message...",
  "whatsappText": "Concise WhatsApp message text..."
}`;

    const userPrompt = `Client Request: "${taskContext.userRequest}"
Provider: "${primaryContact.businessName}"
Address: "${primaryContact.address || 'Local'}"`;

    let draft = {};
    try {
      draft = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.2,
      });
    } catch (err) {
      logger.warn('[Communication Agent] LLM draft generation notice, using safe template:', err.message);
    }

    const recipientLabel = primaryContact.email || primaryContact.phone || primaryContact.businessName;
    const subject = draft.subject || `Inquiry regarding service appointment - ${primaryContact.businessName}`;
    const emailText =
      draft.emailText ||
      `Dear ${primaryContact.businessName},\n\nWe are reaching out on behalf of our client regarding: ${taskContext.userRequest}. Kindly provide your earliest available appointment slot and fee details.\n\nThank you,\nDOERA AI Client Services`;
    const whatsappText =
      draft.whatsappText ||
      `Hello ${primaryContact.businessName}, inquiring regarding: ${taskContext.userRequest}. Could you please let us know your availability and estimated rate? Thank you!`;

    return {
      agentName: this.name,
      taskId: taskContext.taskId,
      status: 'drafted',
      actionType: 'SEND_OUTREACH',
      recipient: recipientLabel,
      recipientName: primaryContact.businessName,
      subject,
      emailHtml: draft.emailHtml || `<p>${emailText.replace(/\n/g, '<br/>')}</p>`,
      emailText,
      whatsappText,
      message: emailText, // Summary for approval UI preview
      channel: primaryContact.email ? 'Email' : (primaryContact.phone ? 'WhatsApp / SMS' : 'Direct Provider Inquiry'),
      requiresApproval: true,
      startedAt,
      completedAt: new Date(),
    };
  }

  /**
   * Dispatch authorized message only after user approval
   */
  async executeDispatch(outreach, primaryContact, userIntegration) {
    const startedAt = new Date();
    logger.info(`[Communication Agent] Executing authorized dispatch to: ${outreach.recipient || primaryContact?.businessName}`);

    const results = [];
    let delivered = false;

    // Check if email can be dispatched
    const targetEmail = primaryContact?.email || (userIntegration?.email ? 'quotes@doera.ai' : null);
    if (targetEmail) {
      try {
        const emailResult = await emailAdapter.sendEmail({
          to: targetEmail,
          subject: outreach.subject,
          htmlBody: outreach.emailHtml,
          textBody: outreach.emailText,
          userIntegration,
        });
        results.push(emailResult);
        if (emailResult.success) delivered = true;
      } catch (err) {
        logger.error('[Communication Agent] Email delivery error:', err.message);
        results.push({ success: false, channel: 'Email', error: err.message });
      }
    }

    // Check if WhatsApp can be dispatched
    if (primaryContact?.phone && process.env.WHATSAPP_ACCESS_TOKEN) {
      try {
        const waResult = await whatsappAdapter.sendMessage({
          to: primaryContact.phone,
          textMessage: outreach.whatsappText,
        });
        results.push(waResult);
        if (waResult.success) delivered = true;
      } catch (err) {
        logger.warn('[Communication Agent] WhatsApp message skipped or failed:', err.message);
        results.push({ success: false, channel: 'WhatsApp', error: err.message });
      }
    } else if (primaryContact?.phone && !process.env.WHATSAPP_ACCESS_TOKEN) {
      results.push({
        success: false,
        channel: 'WhatsApp',
        status: 'PENDING_CONFIGURATION',
        message: 'WhatsApp Business credentials not configured in environment. Outreach logged for manual dispatch.',
      });
    }

    const completedAt = new Date();

    return {
      agentName: this.name,
      status: delivered ? 'completed' : 'pending_manual_dispatch',
      dispatches: results,
      recipient: primaryContact?.businessName || outreach.recipient,
      contactChannel: outreach.channel || 'Direct Provider Inquiry',
      delivered,
      verifiedTimestamp: completedAt.toISOString(),
      startedAt,
      completedAt,
    };
  }
}

export const communicationAgent = new CommunicationAgent();
export default communicationAgent;
