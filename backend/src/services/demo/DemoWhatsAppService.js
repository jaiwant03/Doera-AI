/**
 * DOERA AI — Demo WhatsApp Service
 * Permanent Safe Simulator for WhatsApp Business Cloud API in Hackathon Demo Mode
 * STRICT POLICY: Never makes calls to Meta Cloud API or contacts real phone numbers.
 */

let waCounter = 1;

export class DemoWhatsAppService {
  /**
   * Generate sequential demo WhatsApp identifier: DEMO-WHATSAPP-0001
   */
  static generateDemoId() {
    const formatted = String(waCounter++).padStart(4, '0');
    return `DEMO-WHATSAPP-${formatted}`;
  }

  /**
   * Validate WhatsApp phone number
   */
  static validate(payload) {
    const phone = payload.to || payload.phone || payload.recipientPhone;
    if (!phone) {
      throw new Error('DemoWhatsAppService: Missing recipient phone number.');
    }

    const cleanPhone = String(phone).replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      throw new Error(`DemoWhatsAppService: Invalid phone format "${phone}". Expected 10-15 digits.`);
    }

    const message = payload.textMessage || payload.message || payload.whatsappText;
    if (!message || !message.trim()) {
      throw new Error('DemoWhatsAppService: Message content cannot be empty.');
    }

    return {
      valid: true,
      cleanPhone,
    };
  }

  /**
   * Simulate WhatsApp messaging dispatch
   */
  async dispatch(params) {
    const {
      to,
      textMessage,
      target = {},
    } = params;

    DemoWhatsAppService.validate({ to, textMessage });

    const demoExecutionId = DemoWhatsAppService.generateDemoId();
    const simulatedLatencyMs = Math.floor(190 + Math.random() * 110);
    const dispatchedAt = new Date();

    const providerResponse = {
      simulated: true,
      simulationBanner: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
      executionId: demoExecutionId,
      transport: 'SIMULATED_WHATSAPP_CLOUD_API',
      messaging_product: 'whatsapp',
      contacts: [
        {
          input: to,
          wa_id: String(to).replace(/\+/g, ''),
        },
      ],
      messages: [
        {
          id: `wamid.${demoExecutionId.replace(/[^a-zA-Z0-9]/g, '')}`,
          message_status: 'delivered',
        },
      ],
      dispatchedAt: dispatchedAt.toISOString(),
      simulatedLatencyMs,
      recipientName: target.name || 'Service Contact',
      messagePreview: (textMessage || '').substring(0, 100) + '...',
      auditNote: 'Simulated Meta Graph API v21.0 dispatch completed safely in DOERA demo sandbox.',
    };

    return {
      success: true,
      isSimulated: true,
      demoExecutionId,
      delivered: true,
      channel: 'WhatsApp Cloud API (Simulated)',
      provider: 'SIMULATED_WHATSAPP_CLOUD_API',
      recipient: to,
      status: 'DELIVERED',
      externalReference: demoExecutionId,
      providerResponse,
      dispatchedAt: dispatchedAt.toISOString(),
      completedAt: new Date(dispatchedAt.getTime() + simulatedLatencyMs).toISOString(),
    };
  }
}

export const demoWhatsAppService = new DemoWhatsAppService();
export default demoWhatsAppService;
