import usageService, { QuotaExceededError } from '../services/usageService.js';

/**
 * GET /api/usage
 * Returns verified plan, dailyLimit, usedRequests, remainingRequests, resetAt, resetsIn
 */
export const getUsage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const testDate = req.headers['x-test-date'] || req.query.testDate || null;
    const usage = await usageService.getUsageSummary(userId, testDate);
    res.json(usage);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/usage/reserve
 * Securely and atomically reserves one request from today's allowance
 */
export const reserveUsage = async (req, res, next) => {
  try {
    const { requestId, requestType = 'message', model, idempotencyKey } = req.body;
    const testDate = req.headers['x-test-date'] || req.query.testDate || null;

    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required for reservation.' });
    }

    const reservation = await usageService.reserveQuota({
      userId: req.user._id,
      requestId,
      requestType,
      model,
      idempotencyKey,
      testDate,
    });

    res.json(reservation);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return res.status(403).json(err.details);
    }
    next(err);
  }
};

/**
 * POST /api/usage/complete
 * Finalizes reservation after successful AI execution
 */
export const completeUsage = async (req, res, next) => {
  try {
    const { requestId, tokens } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required to complete reservation.' });
    }

    await usageService.completeQuota(requestId, tokens);
    res.json({ success: true, message: 'Reservation finalized successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/usage/release
 * Releases a reserved request back to user on execution failure
 */
export const releaseUsage = async (req, res, next) => {
  try {
    const { requestId, reason } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required to release reservation.' });
    }

    await usageService.releaseQuota(req.user._id, requestId, reason);
    res.json({ success: true, message: 'Reservation released successfully.' });
  } catch (err) {
    next(err);
  }
};
