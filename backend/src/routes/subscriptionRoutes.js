import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getSubscriptionStatus,
  getBillingHistory,
  upgradePlan,
  createCheckoutSession,
  createCustomerPortal,
  cancelSubscription,
  handleStripeWebhook,
} from '../controllers/subscriptionController.js';

const router = express.Router();

// Webhook endpoint (unauthenticated, validates signature)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Protected routes
router.use(authenticate);
router.get('/', getSubscriptionStatus);
router.get('/status', getSubscriptionStatus);
router.get('/billing-history', getBillingHistory);
router.post('/upgrade', upgradePlan);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createCustomerPortal);
router.post('/cancel', cancelSubscription);

export default router;
