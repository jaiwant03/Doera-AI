import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/env.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import { getPlanEntitlements } from '../config/entitlements.js';

class PaymentService {
  /**
   * Create Checkout Session (Stripe Hosted Checkout)
   */
  async createStripeCheckout({ user, planKey, billingCycle = 'monthly' }) {
    if (!config.stripeSecretKey) {
      // In development mode or when keys are absent, fallback to simulated activation
      return {
        provider: 'simulation',
        message: 'Stripe keys not configured. Use development activator directly.',
        requiresRedirect: false,
      };
    }

    const entitlements = getPlanEntitlements(planKey);
    const isAnnual = billingCycle === 'annual';
    const unitAmount = isAnnual ? entitlements.annualPriceUsd * 100 : entitlements.monthlyPriceUsd * 100;

    // Check if user has an existing Stripe customer ID
    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      // Create Stripe customer via API
      const customerRes = await axios.post(
        'https://api.stripe.com/v1/customers',
        new URLSearchParams({
          email: user.email,
          name: user.name,
          'metadata[userId]': user._id.toString(),
        }).toString(),
        {
          headers: {
            Authorization: `Bearer ${config.stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      customerId = customerRes.data.id;
      await User.findByIdAndUpdate(user._id, { 'subscription.stripeCustomerId': customerId });
    }

    const params = new URLSearchParams({
      customer: customerId,
      mode: 'subscription',
      'success_url': `${config.clientUrl}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${config.clientUrl}/settings?payment=cancelled`,
      'client_reference_id': user._id.toString(),
      'metadata[userId]': user._id.toString(),
      'metadata[plan]': planKey,
      'metadata[billingCycle]': billingCycle,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': `DOERA AI ${entitlements.name}`,
      'line_items[0][price_data][product_data][description]': `${entitlements.requestLimit} AI Requests/mo • Autonomous Multi-Agent Swarm`,
      'line_items[0][price_data][unit_amount]': unitAmount.toString(),
      'line_items[0][price_data][recurring][interval]': isAnnual ? 'year' : 'month',
      'line_items[0][quantity]': '1',
    });

    const sessionRes = await axios.post('https://api.stripe.com/v1/checkout/sessions', params.toString(), {
      headers: {
        Authorization: `Bearer ${config.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      provider: 'stripe',
      url: sessionRes.data.url,
      sessionId: sessionRes.data.id,
      requiresRedirect: true,
    };
  }

  /**
   * Stripe Webhook Verification and Event Dispatcher
   */
  async handleStripeWebhook(rawBody, signature) {
    if (!config.stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }

    const headerParts = signature.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {});

    const timestamp = headerParts['t'];
    const expectedSig = headerParts['v1'];

    const signedPayload = `${timestamp}.${rawBody}`;
    const computedSig = crypto
      .createHmac('sha256', config.stripeWebhookSecret)
      .update(signedPayload)
      .digest('hex');

    if (computedSig !== expectedSig) {
      throw new Error('Invalid Stripe webhook signature.');
    }

    const event = JSON.parse(rawBody);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan || 'pro';
        const billingCycle = session.metadata?.billingCycle || 'monthly';

        await this.activateSubscription({
          userId,
          provider: 'stripe',
          providerCustomerId: session.customer,
          providerSubscriptionId: session.subscription,
          plan,
          billingInterval: billingCycle,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || 'usd',
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await Payment.create({
          userId: invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId,
          provider: 'stripe',
          providerPaymentId: invoice.payment_intent || invoice.id,
          providerInvoiceId: invoice.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: 'succeeded',
          receiptUrl: invoice.hosted_invoice_url,
          rawEvent: event,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await Subscription.findOneAndUpdate(
          { providerSubscriptionId: sub.id },
          { status: 'canceled', canceledAt: new Date(), cancelAtPeriodEnd: false }
        );
        // Revert user to free plan
        await User.findOneAndUpdate(
          { 'subscription.stripeSubscriptionId': sub.id },
          { 'subscription.plan': 'free', 'subscription.status': 'canceled' }
        );
        break;
      }
    }

    return { received: true };
  }

  /**
   * Internal Subscription Activator
   */
  async activateSubscription({
    userId,
    provider = 'system',
    providerCustomerId = null,
    providerSubscriptionId = null,
    plan = 'free',
    billingInterval = 'monthly',
    amount = 0,
    currency = 'usd',
  }) {
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const entitlements = getPlanEntitlements(plan);

    // Update Subscription Record
    const sub = await Subscription.findOneAndUpdate(
      { userId },
      {
        provider,
        providerCustomerId,
        providerSubscriptionId,
        plan,
        status: 'active',
        billingInterval,
        amount,
        currency,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      { upsert: true, new: true }
    );

    // Update User Record
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'subscription.plan': plan,
          'subscription.status': 'active',
          'subscription.stripeCustomerId': providerCustomerId,
          'subscription.stripeSubscriptionId': providerSubscriptionId,
          'subscription.currentPeriodEnd': periodEnd,
          'subscription.cancelAtPeriodEnd': false,
        },
      },
      { new: true }
    );

    return { sub, user: updatedUser, entitlements };
  }

  /**
   * Create Stripe Self-Service Customer Portal Session
   */
  async createStripePortal(user) {
    const customerId = user.subscription?.stripeCustomerId;
    if (!customerId || !config.stripeSecretKey) {
      throw new Error('No active Stripe customer or secret key configured.');
    }

    const params = new URLSearchParams({
      customer: customerId,
      return_url: `${config.clientUrl}/settings`,
    });

    const res = await axios.post('https://api.stripe.com/v1/billing_portal/sessions', params.toString(), {
      headers: {
        Authorization: `Bearer ${config.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return { url: res.data.url };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
