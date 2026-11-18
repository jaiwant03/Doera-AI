import { v4 as uuidv4 } from 'uuid';
import usageService, { QuotaExceededError } from '../services/usageService.js';

export const requireSubscriptionQuota = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requestId = req.headers['x-request-id'] || `req-${uuidv4().substring(0, 12)}`;
    const idempotencyKey = req.headers['idempotency-key'] || null;
    const { model } = req.body || {};

    const reservation = await usageService.reserveQuota({
      userId,
      requestId,
      requestType: req.path.includes('stream') ? 'stream' : 'message',
      model,
      idempotencyKey,
      testDate: req.headers['x-test-date'] || null,
    });

    req.quota = reservation;
    req.requestId = requestId;
    next();
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return res.status(403).json(error.details);
    }
    next(error);
  }
};

export default requireSubscriptionQuota;
