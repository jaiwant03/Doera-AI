import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import UsageRecord from '../models/UsageRecord.js';
import { PLAN_LIMITS, getPlanEntitlements } from '../config/entitlements.js';

export class QuotaExceededError extends Error {
  constructor(details) {
    super(details.message || 'Daily limit reached');
    this.name = 'QuotaExceededError';
    this.code = 'SUBSCRIPTION_LIMIT_EXCEEDED';
    this.status = 403;
    this.details = details;
  }
}

class UsageService {
  /**
   * Canonical UTC usage date formatted as 'YYYY-MM-DD'
   */
  getUsageDate(date = new Date()) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  /**
   * Next UTC midnight timestamp (00:00:00.000 UTC of next day)
   */
  getResetAt(date = new Date()) {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    const nextMidnight = new Date(Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    return nextMidnight;
  }

  /**
   * Formats remaining time until reset in human-readable '08h 24m' format
   */
  formatResetsIn(resetAt) {
    if (!resetAt) return '24h 00m';
    const now = Date.now();
    const target = new Date(resetAt).getTime();
    const diffMs = Math.max(0, target - now);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }

  /**
   * Retrieves verified active plan from database, guarding against client manipulation
   */
  async getVerifiedUserPlan(userId) {
    try {
      // 1. Check verified Subscription collection
      const sub = await Subscription.findOne({
        userId,
        status: 'active',
      }).sort({ updatedAt: -1 });

      if (sub && ['pro', 'max'].includes(sub.plan)) {
        // If expired, revert to free
        if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
          sub.status = 'past_due';
          await sub.save().catch(() => {});
          await User.findByIdAndUpdate(userId, { 'subscription.plan': 'free', 'subscription.status': 'past_due' }).catch(() => {});
          return 'free';
        }
        return sub.plan;
      }

      // 2. Fallback to User document subscription
      const user = await User.findById(userId).select('subscription');
      if (user && user.subscription?.status === 'active' && ['pro', 'max'].includes(user.subscription?.plan)) {
        if (user.subscription.currentPeriodEnd && new Date(user.subscription.currentPeriodEnd) < new Date()) {
          user.subscription.status = 'past_due';
          user.subscription.plan = 'free';
          await user.save().catch(() => {});
          return 'free';
        }
        return user.subscription.plan;
      }

      return 'free';
    } catch (err) {
      console.warn('[UsageService] Error verifying user plan:', err.message);
      return 'free';
    }
  }

  /**
   * Get plan daily limit allowance
   */
  getPlanLimit(plan = 'free') {
    return PLAN_LIMITS[plan.toLowerCase()] || PLAN_LIMITS.free;
  }

  /**
   * Ensures a daily record exists for the given user on the usage date.
   * If user recently upgraded, automatically upgrades today's dailyLimit.
   */
  async getOrCreateDailyRecord(userId, clientDate = null) {
    const usageDate = this.getUsageDate(clientDate || new Date());
    const resetAt = this.getResetAt(clientDate || new Date());
    const plan = await this.getVerifiedUserPlan(userId);
    const dailyLimit = this.getPlanLimit(plan);

    // Atomic findOneAndUpdate with upsert
    let record = await UsageRecord.findOneAndUpdate(
      { userId, usageDate },
      {
        $setOnInsert: {
          userId,
          plan,
          usageDate,
          dailyLimit,
          usedRequests: 0,
          remainingRequests: dailyLimit,
          reservedRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          resetAt,
          reservations: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If user changed tier today (e.g. upgraded to Pro/Max, or reactivated Free)
    if (record.plan !== plan || record.dailyLimit !== dailyLimit) {
      const remaining = Math.max(0, dailyLimit - (record.usedRequests || 0));
      record = await UsageRecord.findOneAndUpdate(
        { userId, usageDate },
        {
          $set: {
            plan,
            dailyLimit,
            remainingRequests: remaining,
          },
        },
        { new: true }
      );
    }

    return record;
  }

  /**
   * Atomically reserves 1 request quota from the user account.
   * Guaranteed safe against concurrent race conditions via atomic MongoDB condition.
   */
  async reserveQuota({ userId, requestId, requestType = 'message', model, idempotencyKey = null, testDate = null }) {
    const usageDate = this.getUsageDate(testDate || new Date());
    const resetAt = this.getResetAt(testDate || new Date());
    const plan = await this.getVerifiedUserPlan(userId);
    const dailyLimit = this.getPlanLimit(plan);

    // 1. Idempotency Check (prevent duplicate charges for same submission/network retry)
    if (idempotencyKey) {
      const existing = await UsageRecord.findOne({
        userId,
        usageDate,
        'reservations.idempotencyKey': idempotencyKey,
      });

      if (existing) {
        const resObj = existing.reservations.find((r) => r.idempotencyKey === idempotencyKey);
        const remaining = Math.max(0, existing.dailyLimit - existing.usedRequests);
        return {
          isDuplicate: true,
          record: resObj,
          alreadyCharged: true,
          plan: existing.plan,
          dailyLimit: existing.dailyLimit,
          used: existing.usedRequests,
          remaining,
          resetAt: existing.resetAt,
          resetsIn: this.formatResetsIn(existing.resetAt),
        };
      }
    }

    // Ensure daily record exists and reflects current plan
    await this.getOrCreateDailyRecord(userId, testDate);

    // 2. Atomic MongoDB Conditional Increment
    // Only increments reservedRequests if (usedRequests + reservedRequests) < dailyLimit!
    const updatedRecord = await UsageRecord.findOneAndUpdate(
      {
        userId,
        usageDate,
        $expr: {
          $lt: [
            { $add: ['$usedRequests', '$reservedRequests'] },
            '$dailyLimit',
          ],
        },
      },
      {
        $inc: { reservedRequests: 1 },
        $push: {
          reservations: {
            requestId,
            idempotencyKey,
            status: 'reserved',
            model: model || 'openai/gpt-oss-120b',
            requestType,
            reservedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    // If query failed to match, the daily limit has been exhausted!
    if (!updatedRecord) {
      const record = await UsageRecord.findOne({ userId, usageDate }) || {
        plan,
        dailyLimit,
        usedRequests: dailyLimit,
        resetAt,
      };

      const resetsIn = this.formatResetsIn(record.resetAt || resetAt);

      let message = '';
      if (plan === 'free') {
        message = 'Your daily DOERA FREE allowance has been used. You have used all 20 requests for today. Your allowance will automatically refresh at the next reset.';
      } else if (plan === 'pro') {
        message = 'Your daily Pro allowance has been used. You have used all 300 requests for today. Upgrade to DOERA Max for 500 requests/day, or your allowance will refresh at the next reset.';
      } else {
        message = "You have reached today's 500-request allowance. Your allowance will automatically refresh at the next reset.";
      }

      throw new QuotaExceededError({
        error: 'DAILY_LIMIT_REACHED',
        code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
        plan: record.plan || plan,
        dailyLimit: record.dailyLimit || dailyLimit,
        used: record.usedRequests,
        remaining: 0,
        resetAt: record.resetAt || resetAt,
        resetsIn,
        message,
        upgradeAvailable: plan !== 'max',
      });
    }

    const currentUsed = updatedRecord.usedRequests;
    const currentLimit = updatedRecord.dailyLimit;
    const currentRemaining = Math.max(0, currentLimit - (currentUsed + updatedRecord.reservedRequests));

    return {
      isDuplicate: false,
      record: updatedRecord,
      plan: updatedRecord.plan,
      dailyLimit: currentLimit,
      used: currentUsed,
      remaining: currentRemaining,
      resetAt: updatedRecord.resetAt,
      resetsIn: this.formatResetsIn(updatedRecord.resetAt),
    };
  }

  /**
   * Finalizes usage record on successful message generation
   */
  async completeQuota(requestId, tokens = {}) {
    if (!requestId) return;

    try {
      const updated = await UsageRecord.findOneAndUpdate(
        { 'reservations.requestId': requestId },
        {
          $inc: {
            reservedRequests: -1,
            usedRequests: 1,
            successfulRequests: 1,
          },
          $set: {
            'reservations.$.status': 'completed',
            'reservations.$.completedAt': new Date(),
            'reservations.$.tokens': {
              promptTokens: tokens.promptTokens || 0,
              completionTokens: tokens.completionTokens || 0,
              totalTokens: tokens.totalTokens || 0,
            },
          },
        },
        { new: true }
      );

      if (updated) {
        // Sync remainingRequests
        const remaining = Math.max(0, updated.dailyLimit - updated.usedRequests);
        updated.remainingRequests = remaining;
        await updated.save().catch(() => {});
      }
    } catch (err) {
      console.error('[UsageService] completeQuota error:', err.message);
    }
  }

  /**
   * Atomic Release in case of server failure before generation starts
   */
  async releaseQuota(userId, requestId, reason = 'Server error during execution') {
    if (!requestId) return;

    try {
      const updated = await UsageRecord.findOneAndUpdate(
        {
          'reservations.requestId': requestId,
          'reservations.status': 'reserved',
        },
        {
          $inc: {
            reservedRequests: -1,
            failedRequests: 1,
          },
          $set: {
            'reservations.$.status': 'failed',
            'reservations.$.releasedAt': new Date(),
            'reservations.$.failureReason': reason,
          },
        },
        { new: true }
      );

      if (updated) {
        const remaining = Math.max(0, updated.dailyLimit - updated.usedRequests);
        updated.remainingRequests = remaining;
        await updated.save().catch(() => {});
      }
    } catch (err) {
      console.error('[UsageService] releaseQuota error:', err.message);
    }
  }

  // Alias for backward compatibility
  async refundQuota(userId, requestId, reason) {
    return this.releaseQuota(userId, requestId, reason);
  }

  /**
   * Read usage stats for current user for today
   */
  async getUsageSummary(userId, testDate = null) {
    try {
      const usageDate = this.getUsageDate(testDate || new Date());
      const resetAt = this.getResetAt(testDate || new Date());
      const plan = await this.getVerifiedUserPlan(userId);
      const limit = this.getPlanLimit(plan);

      const record = await UsageRecord.findOne({ userId, usageDate });

      if (!record) {
        return {
          plan,
          dailyLimit: limit,
          limitRequests: limit, // for frontend compatibility
          usedRequests: 0,
          remainingRequests: limit,
          resetAt,
          resetsIn: this.formatResetsIn(resetAt),
          status: 'active',
        };
      }

      // If user changed tier today (e.g. reactivated Free or upgraded), synchronize daily record
      if (record.plan !== plan || record.dailyLimit !== limit) {
        const syncRemaining = Math.max(0, limit - (record.usedRequests || 0));
        record = await UsageRecord.findOneAndUpdate(
          { userId, usageDate },
          {
            $set: {
              plan,
              dailyLimit: limit,
              remainingRequests: syncRemaining,
            },
          },
          { new: true }
        );
      }

      const activeLimit = limit;
      const inFlight = record.reservedRequests || 0;
      const remaining = Math.max(0, activeLimit - ((record.usedRequests || 0) + inFlight));

      return {
        plan,
        dailyLimit: activeLimit,
        limitRequests: activeLimit,
        usedRequests: record.usedRequests || 0,
        remainingRequests: remaining,
        resetAt: record.resetAt || resetAt,
        resetsIn: this.formatResetsIn(record.resetAt || resetAt),
        status: 'active',
      };
    } catch (err) {
      console.error('[UsageService] getUsageSummary error:', err.message);
      return {
        plan: 'free',
        dailyLimit: 20,
        limitRequests: 20,
        usedRequests: 0,
        remainingRequests: 20,
        resetAt: this.getResetAt(),
        resetsIn: this.formatResetsIn(this.getResetAt()),
        status: 'active',
      };
    }
  }
}

export const usageService = new UsageService();
export default usageService;
