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

  /**
   * Generates mission-specific communication drafts (e.g. hackathon proposals, sponsor outreach, participant announcements)
   * incorporating upstream Planning and Budget findings.
   */
  async prepareMissionCommunications(taskContext, upstreamData = {}) {
    const startedAt = new Date();
    const userRequest = taskContext.userRequest || '';
    logger.info(`[Communication Agent] Generating mission communication suite for: "${userRequest}"`);

    const planning = upstreamData.planning || taskContext.discoveredData?.planning || null;
    const budget = upstreamData.budget || taskContext.discoveredData?.budget || null;

    const scale = planning?.scale || { participants: 100, duration: '2 Days' };
    const totalBudget = budget?.totalBudget ? `₹${budget.totalBudget.toLocaleString()}` : '₹50,000';

    const systemPrompt = `You are DOERA AI's Specialized Communication Agent.
Create 3 complete, polished, ready-to-use communication documents for the user's mission:
1. Institutional Permission Letter (To Dean / Principal / HOD requesting venue, Wi-Fi, and lab access).
2. Corporate Sponsorship & Mentor Invitation Pitch (Inviting tech companies for mentorship, API credits, or prizes).
3. Participant Announcement & Onboarding Email (Sent to registered hackers with schedule, rules, and prep instructions).

Incorporate authentic event context:
- Scale: ${scale.participants || 100} participants, ${scale.duration || '2 Days'}
- Budget Target: ${totalBudget}

Output JSON ONLY:
{
  "drafts": [
    {
      "type": "INSTITUTIONAL_APPROVAL",
      "recipient": "College Principal / Dean of Academic Affairs",
      "subject": "Formal Request: Permission to Host Two-Day Campus Hackathon (${scale.participants} Participants)",
      "content": "Formal letter body..."
    },
    {
      "type": "SPONSOR_OUTREACH",
      "recipient": "Prospective Technology Sponsors & Mentors",
      "subject": "Partnership Opportunity: College Hackathon Innovation Challenge",
      "content": "Compelling partnership proposal..."
    },
    {
      "type": "PARTICIPANT_ANNOUNCEMENT",
      "recipient": "Accepted Hackathon Participants",
      "subject": "You're In! Welcome to the 2-Day College Hackathon — Essential Guide & Schedule",
      "content": "Welcoming guide with time blocks..."
    }
  ]
}`;

    let commData = null;
    try {
      commData = await llmService.generate({
        systemPrompt,
        userPrompt: `Mission: "${userRequest}"\nPlanning Data: ${JSON.stringify(planning?.schedule ? { schedule: planning.schedule.slice(0, 2) } : {})}\nBudget: ${totalBudget}`,
        jsonMode: true,
        temperature: 0.2,
      });
    } catch (err) {
      logger.warn('[Communication Agent] LLM generation notice, using deterministic templates:', err.message);
    }

    const defaultDrafts = [
      {
        type: 'INSTITUTIONAL_APPROVAL',
        recipient: 'The Principal / Dean of Student Affairs',
        subject: `Request for Permission to Host 2-Day College Hackathon (${scale.participants} Participants)`,
        content: `Respected Principal / Dean,\n\nWe respectfully request permission to organize a two-day technical hackathon on campus for ${scale.participants} students with a structured operational budget of ${totalBudget}.\n\nWe require auditorium access, high-speed Wi-Fi connectivity, and overnight lab supervision. A dedicated student volunteer team has been assigned to oversee safety, logistics, and cleaning.\n\nThank you for your continued encouragement of student technical innovation.\n\nSincerely,\nStudent Organizing Committee`,
      },
      {
        type: 'SPONSOR_OUTREACH',
        recipient: 'Prospective Technology Partners & Mentors',
        subject: 'Sponsorship & Mentorship Invitation: Campus Hackathon',
        content: `Dear Technology Partner,\n\nWe invite your organization to partner with us for our upcoming 2-Day College Hackathon, bringing together ${scale.participants} talented student developers.\n\nWe welcome in-kind software licenses, API access credits, or mentorship participation to help guide the next generation of engineers. In return, we offer prominent brand placement and direct recruitment access to top performers.\n\nWarm regards,\nCorporate Relations Team`,
      },
      {
        type: 'PARTICIPANT_ANNOUNCEMENT',
        recipient: 'Accepted Hackathon Participants',
        subject: 'Welcome to the 2-Day College Hackathon — Essential Guide & Next Steps',
        content: `Hello Hackers!\n\nCongratulations on your selection for our 2-day hackathon. Please arrive at the Campus Auditorium at 08:30 AM on Day 1 for registration and kit collection. Problem statements and judging rubrics will be released during the opening keynote.\n\nEnsure you bring your student ID card, laptops, chargers, and enthusiasm. Meals and refreshments will be provided.\n\nHappy Hacking!\nOrganizing Team`,
      },
    ];

    if (!commData || !Array.isArray(commData.drafts) || commData.drafts.length === 0) {
      commData = { drafts: defaultDrafts };
    } else {
      // Ensure all 3 essential document types exist
      const existingTypes = new Set(commData.drafts.map((d) => d.type));
      for (const def of defaultDrafts) {
        if (!existingTypes.has(def.type)) {
          commData.drafts.push(def);
        }
      }
    }

    const completedAt = new Date();

    return {
      agentName: this.name,
      status: 'completed',
      output: commData,
      drafts: commData.drafts,
      startedAt,
      completedAt,
    };
  }
}

export const communicationAgent = new CommunicationAgent();
export default communicationAgent;
