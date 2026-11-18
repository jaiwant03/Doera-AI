/**
 * DOERA AI — Demo Payment Service
 * Permanent Safe Simulator for Financial Transactions & Payment Gateways in Hackathon Demo Mode
 * STRICT POLICY: Never makes real financial transactions or touches live payment gateways.
 */

let paymentCounter = 1;

export class DemoPaymentService {
  /**
   * Generate sequential demo payment identifier: DEMO-PAYMENT-0001
   */
  static generateDemoId() {
    const formatted = String(paymentCounter++).padStart(4, '0');
    return `DEMO-PAYMENT-${formatted}`;
  }

  /**
   * Simulate payment authorization and capture
   */
  async dispatch(params) {
    const {
      amount = 500,
      currency = 'INR',
      description = 'DOERA AI Service Booking Deposit',
      recipient = 'Service Provider',
      target = {},
    } = params;

    const demoExecutionId = DemoPaymentService.generateDemoId();
    const simulatedLatencyMs = Math.floor(320 + Math.random() * 180);
    const authorizedAt = new Date();

    const providerResponse = {
      simulated: true,
      simulationBanner: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
      executionId: demoExecutionId,
      gateway: 'SIMULATED_PAYMENT_GATEWAY',
      transactionStatus: 'CAPTURED',
      amountPaid: amount,
      currency,
      authCode: `AUTH_${Math.floor(100000 + Math.random() * 900000)}`,
      receiptNumber: `RCP-${demoExecutionId.replace('DEMO-PAYMENT-', '')}`,
      payee: target.name || recipient,
      description,
      authorizedAt: authorizedAt.toISOString(),
      simulatedLatencyMs,
      auditNote: 'Simulated financial transaction recorded in DOERA demo sandbox. Zero monetary funds transferred.',
    };

    return {
      success: true,
      isSimulated: true,
      demoExecutionId,
      delivered: true,
      channel: 'Payment Gateway (Simulated)',
      provider: 'SIMULATED_PAYMENT_GATEWAY',
      amount,
      currency,
      status: 'PAID',
      externalReference: demoExecutionId,
      providerResponse,
      dispatchedAt: authorizedAt.toISOString(),
      completedAt: new Date(authorizedAt.getTime() + simulatedLatencyMs).toISOString(),
    };
  }
}

export const demoPaymentService = new DemoPaymentService();
export default demoPaymentService;
