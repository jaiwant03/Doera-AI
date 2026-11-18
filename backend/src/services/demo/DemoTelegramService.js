/**
 * DOERA AI — Demo Telegram Service
 * Permanent Safe Simulator for Telegram Bot Messages in Hackathon Demo Mode
 * STRICT POLICY: Never makes calls to Telegram Bot API or touches personal bot tokens.
 */

let tgCounter = 1;

export class DemoTelegramService {
  /**
   * Generate sequential demo Telegram identifier: DEMO-TELEGRAM-0001
   */
  static generateDemoId() {
    const formatted = String(tgCounter++).padStart(4, '0');
    return `DEMO-TELEGRAM-${formatted}`;
  }

  /**
   * Simulate Telegram message dispatch
   */
  async dispatch(params) {
    const {
      chatId = '@doera_sandbox_channel',
      text = 'Inquiry from DOERA AI',
      target = {},
    } = params;

    const demoExecutionId = DemoTelegramService.generateDemoId();
    const simulatedLatencyMs = Math.floor(150 + Math.random() * 100);
    const dispatchedAt = new Date();

    const providerResponse = {
      simulated: true,
      simulationBanner: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
      executionId: demoExecutionId,
      transport: 'SIMULATED_TELEGRAM_BOT_API',
      ok: true,
      result: {
        message_id: Math.floor(100000 + Math.random() * 900000),
        chat: {
          id: chatId,
          title: target.name || 'DOERA Demo Group',
          type: 'channel',
        },
        date: Math.floor(dispatchedAt.getTime() / 1000),
        text: text.substring(0, 120),
      },
      dispatchedAt: dispatchedAt.toISOString(),
      simulatedLatencyMs,
      auditNote: 'Simulated Telegram Bot API delivery acknowledged in DOERA sandbox.',
    };

    return {
      success: true,
      isSimulated: true,
      demoExecutionId,
      delivered: true,
      channel: 'Telegram Bot API (Simulated)',
      provider: 'SIMULATED_TELEGRAM_BOT_API',
      recipient: chatId,
      status: 'DELIVERED',
      externalReference: demoExecutionId,
      providerResponse,
      dispatchedAt: dispatchedAt.toISOString(),
      completedAt: new Date(dispatchedAt.getTime() + simulatedLatencyMs).toISOString(),
    };
  }
}

export const demoTelegramService = new DemoTelegramService();
export default demoTelegramService;
