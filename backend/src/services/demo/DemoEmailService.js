/**
 * DOERA AI — Demo Email Service
 * Permanent Safe Simulator for Email & Gmail Outreach in Hackathon Demo Mode
 * STRICT POLICY: Never sends real emails or touches personal/SMTP credentials.
 */

let emailCounter = 1;

export class DemoEmailService {
  /**
   * Generate sequential demo email identifier: DEMO-EMAIL-0001
   */
  static generateDemoId() {
    const formatted = String(emailCounter++).padStart(4, '0');
    return `DEMO-EMAIL-${formatted}`;
  }

  /**
   * Validate email payload
   */
  static validate(payload) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipient = payload.to || payload.recipient || payload.email;

    if (!recipient) {
      throw new Error('DemoEmailService: Missing recipient address.');
    }

    // Check if recipient is a RFC compliant address or friendly name "<email>"
    const extractedEmail = recipient.includes('<') && recipient.includes('>')
      ? recipient.match(/<([^>]+)>/)?.[1]
      : recipient;

    if (!extractedEmail || !emailRegex.test(extractedEmail.trim())) {
      throw new Error(`DemoEmailService: Invalid recipient email syntax "${recipient}".`);
    }

    if (!payload.subject && !payload.message && !payload.textBody && !payload.emailText) {
      throw new Error('DemoEmailService: Subject or message body required for outreach.');
    }

    return {
      valid: true,
      cleanRecipient: recipient.trim(),
    };
  }

  /**
   * Simulate email outreach dispatch
   */
  async dispatch(params) {
    const {
      to,
      subject = 'DOERA AI Service Inquiry',
      htmlBody = '',
      textBody = '',
      target = {},
      metadata = {},
    } = params;

    DemoEmailService.validate({ to, subject, textBody: textBody || htmlBody });

    const demoExecutionId = DemoEmailService.generateDemoId();
    const simulatedLatencyMs = Math.floor(180 + Math.random() * 120);
    const dispatchedAt = new Date();

    const providerResponse = {
      simulated: true,
      simulationBanner: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
      executionId: demoExecutionId,
      transport: 'SIMULATED_GMAIL_DISPATCHER',
      protocol: 'ESMTPS (Demo Sandbox)',
      envelope: {
        from: 'doera-agent-swarm@sandbox.doera.local',
        to: to,
      },
      smtpCode: 250,
      smtpMessage: `250 2.0.0 OK: [DEMO] Message accepted for queueing in sandbox (${demoExecutionId})`,
      messageId: `<${demoExecutionId.toLowerCase()}@sandbox.doera.local>`,
      dispatchedAt: dispatchedAt.toISOString(),
      simulatedLatencyMs,
      subject,
      previewSnippet: (textBody || htmlBody || '').substring(0, 120) + '...',
      recipientName: target.name || 'Service Provider',
      auditNote: 'Simulated email delivery completed inside DOERA safe sandbox. Zero external network connections made.',
    };

    return {
      success: true,
      isSimulated: true,
      demoExecutionId,
      delivered: true,
      channel: 'Gmail / Email Dispatch (Simulated)',
      provider: 'SIMULATED_GMAIL_DISPATCHER',
      recipient: to,
      subject,
      status: 'DELIVERED',
      externalReference: demoExecutionId,
      providerResponse,
      dispatchedAt: dispatchedAt.toISOString(),
      completedAt: new Date(dispatchedAt.getTime() + simulatedLatencyMs).toISOString(),
    };
  }
}

export const demoEmailService = new DemoEmailService();
export default demoEmailService;
