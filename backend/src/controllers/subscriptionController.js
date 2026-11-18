import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import paymentService from '../services/paymentService.js';
import usageService from '../services/usageService.js';
import { getPlanEntitlements, PLAN_LIMITS } from '../config/entitlements.js';

// 1. GET FULL STATUS & ENTITLEMENTS
export const getSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const testDate = req.headers['x-test-date'] || req.query.testDate || null;
    const usage = await usageService.getUsageSummary(userId, testDate);
    const entitlements = getPlanEntitlements(usage.plan);

    const sub = await Subscription.findOne({ userId }).sort({ updatedAt: -1 });
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(10);

    res.json({
      plan: usage.plan,
      status: usage.status || 'active',
      dailyLimit: usage.dailyLimit,
      limitRequests: usage.dailyLimit,
      usedRequests: usage.usedRequests,
      remainingRequests: usage.remainingRequests,
      resetAt: usage.resetAt,
      resetsIn: usage.resetsIn,
      currentPeriodEnd: sub?.currentPeriodEnd || null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
      entitlements,
      billingHistory: payments,
      subscription: sub,
    });
  } catch (err) {
    next(err);
  }
};

// 2. INSTANT PLAN UPGRADE / SWITCH (DEVELOPMENT & DIRECT ACTIVATION / DEMO CHECKOUT)
export const upgradePlan = async (req, res, next) => {
  try {
    const { 
      plan, 
      billingCycle = 'monthly', 
      isDemo = false, 
      demoTransactionId, 
      customerDetails = {},
      paymentDetails = {}
    } = req.body;

    if (!['free', 'pro', 'max'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected. Must be free, pro, or max.' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.subscription) {
      user.subscription = {};
    }
    user.subscription.plan = plan;
    user.subscription.status = 'active';
    user.subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.subscription.cancelAtPeriodEnd = false;
    user.subscription.isDemo = isDemo || (plan !== 'free');

    if (!user.usage) {
      user.usage = {};
    }
    user.usage.dailyRequestsLimit = PLAN_LIMITS[plan] || 20;
    await user.save();

    const entitlements = getPlanEntitlements(plan);

    // Also sync the Subscription document
    const sub = await Subscription.findOneAndUpdate(
      { userId },
      {
        provider: isDemo ? 'demo' : 'system',
        plan,
        status: 'active',
        billingInterval: billingCycle,
        amount: entitlements.monthlyPriceUsd,
        currency: 'usd',
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: false,
        metadata: {
          isDemo: Boolean(isDemo),
          demoTransactionId: demoTransactionId || null,
          customerDetails: customerDetails || {},
          paymentDetails: paymentDetails || {},
          activatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // If this is a demo paid upgrade, record ALL customer & payment details in the Payment collection
    if (isDemo && ['pro', 'max'].includes(plan)) {
      const txnId = demoTransactionId || `DEMO-TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await Payment.create({
        userId,
        subscriptionId: sub._id,
        plan,
        billingCycle,
        provider: 'demo',
        providerPaymentId: txnId,
        amount: entitlements.monthlyPriceUsd,
        currency: 'usd',
        status: 'demo_completed',
        isSimulated: true,
        receiptUrl: null,
        customer: {
          name: customerDetails.name || user.name || '',
          email: customerDetails.email || user.email || '',
          phone: customerDetails.phone || '',
          country: customerDetails.country || '',
          city: customerDetails.city || '',
          address: customerDetails.address || '',
          postalCode: customerDetails.postalCode || '',
        },
        paymentDetails: {
          method: paymentDetails.method || 'credit_card',
          cardholderName: paymentDetails.cardholderName || user.name || '',
          cardNumber: paymentDetails.cardNumber || '',
          cardNumberMasked: paymentDetails.cardNumberMasked || (paymentDetails.cardNumber ? `•••• •••• •••• ${paymentDetails.cardNumber.replace(/\s+/g, '').slice(-4)}` : '•••• 4242'),
          cardLast4: paymentDetails.cardLast4 || (paymentDetails.cardNumber ? paymentDetails.cardNumber.replace(/\s+/g, '').slice(-4) : '4242'),
          cardBrand: paymentDetails.cardBrand || 'DOERA PAY',
          expiry: paymentDetails.expiry || '',
        },
        dailyLimit: PLAN_LIMITS[plan] || 300,
        rawEvent: {
          isDemo: true,
          demoTransactionId: txnId,
          customerDetails,
          paymentDetails,
          activatedAt: new Date(),
        },
      }).catch((err) => {
        console.warn('[Subscription] Failed to record demo payment log:', err.message);
      });
    }

    // Refresh and update today's daily usage record immediately
    const testDate = req.headers['x-test-date'] || req.query.testDate || null;
    await usageService.getOrCreateDailyRecord(userId, testDate);
    const usage = await usageService.getUsageSummary(userId, testDate);

    res.json({
      success: true,
      message: `Welcome to DOERA ${plan.toUpperCase()}! You now have ${usage.dailyLimit} requests per day.`,
      plan,
      subscription: sub,
      entitlements,
      demoTransactionId: demoTransactionId || null,
      isDemo: Boolean(isDemo),
      usage: {
        dailyLimit: usage.dailyLimit,
        limitRequests: usage.dailyLimit,
        usedRequests: usage.usedRequests,
        remainingRequests: usage.remainingRequests,
        resetAt: usage.resetAt,
        resetsIn: usage.resetsIn,
      },
    });
  } catch (err) {
    console.error('[Subscription] Plan update failed:', err);
    res.status(500).json({ error: 'Failed to update plan. Please try again.' });
  }
};

// 3. CREATE CHECKOUT SESSION (STRIPE HOSTED CHECKOUT)
export const createCheckoutSession = async (req, res, next) => {
  try {
    const { plan, billingCycle = 'monthly' } = req.body;
    if (!['pro', 'max'].includes(plan)) {
      return res.status(400).json({ error: 'Only Pro and Max plans require checkout.' });
    }

    const session = await paymentService.createStripeCheckout({
      user: req.user,
      planKey: plan,
      billingCycle,
    });

    res.json(session);
  } catch (err) {
    console.error('[DOERA Checkout] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to initiate checkout session.' });
  }
};

// 4. CREATE CUSTOMER BILLING PORTAL
export const createCustomerPortal = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const portal = await paymentService.createStripePortal(user);
    res.json(portal);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to open billing portal.' });
  }
};

// 5. CANCEL SUBSCRIPTION (GRACE PERIOD END)
export const cancelSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.subscription) {
      user.subscription = { plan: 'free', status: 'active' };
    }
    user.subscription.cancelAtPeriodEnd = true;
    await user.save();

    await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      { cancelAtPeriodEnd: true }
    );

    res.json({
      success: true,
      message: 'Subscription renewal cancelled. Access continues until end of billing cycle.',
      subscription: user.subscription,
    });
  } catch (err) {
    next(err);
  }
};

// 7. GET BILLING HISTORY
export const getBillingHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

// 8. STRIPE WEBHOOK
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);
    const result = await paymentService.handleStripeWebhook(rawBody, sig);
    res.json(result);
  } catch (err) {
    console.error('[Stripe Webhook] Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};
