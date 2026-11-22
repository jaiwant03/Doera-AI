import { getRedisClient, isRedisAvailable } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// In-memory fallback map: key -> [timestamps]
const memoryStore = new Map();

// Periodic cleanup timer every 5 minutes to prevent memory leaks from stale IPs
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of memoryStore.entries()) {
    const valid = timestamps.filter(ts => ts > now - 120000);
    if (valid.length === 0) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, valid);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Production-Grade Distributed & In-Memory Rate Limiter Middleware
 * Uses Redis if available; automatically falls back to self-cleaning in-memory store.
 */
export const rateLimiter = (options = { windowMs: 60000, maxRequests: 60, prefix: 'rl_gen' }) => {
  const { windowMs = 60000, maxRequests = 60, prefix = 'rl_gen' } = options;

  return async (req, res, next) => {
    // Determine rate limit identifier: authenticated User ID takes priority over IP
    const identifier = req.user?._id
      ? `user_${req.user._id}`
      : `ip_${req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown'}`;

    const key = `${prefix}:${identifier}`;
    const now = Date.now();

    // 1. Redis Distributed Limiter (Sliding Window via Sorted Set / Counter)
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        const windowSeconds = Math.ceil(windowMs / 1000);
        const redisKey = `ratelimit:${key}`;

        // Atomic multi: add current timestamp, trim old timestamps, count in window, set expire
        const multi = redis.multi();
        multi.zremrangebyscore(redisKey, 0, now - windowMs);
        multi.zadd(redisKey, now, `${now}-${Math.random()}`);
        multi.zcard(redisKey);
        multi.expire(redisKey, windowSeconds);

        const results = await multi.exec();
        const currentCount = results && results[2] ? results[2][1] : 1;

        if (currentCount > maxRequests) {
          const retryAfterSeconds = windowSeconds;
          res.setHeader('Retry-After', retryAfterSeconds);
          res.setHeader('X-RateLimit-Limit', maxRequests);
          res.setHeader('X-RateLimit-Remaining', 0);

          return res.status(429).json({
            error: 'Rate limit exceeded. Please slow down and try again.',
            code: 'RATE_LIMIT_EXCEEDED',
            limit: maxRequests,
            remaining: 0,
            retryAfterSeconds,
          });
        }

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
        return next();
      } catch (redisErr) {
        logger.debug(`[RateLimiter] Redis check failed, falling back to memory: ${redisErr.message}`);
        // Fall through to memory store
      }
    }

    // 2. In-Memory Resilient Fallback (Sliding Window with Stale Key Pruning)
    const windowStart = now - windowMs;
    const timestamps = (memoryStore.get(key) || []).filter(ts => ts > windowStart);
    timestamps.push(now);
    memoryStore.set(key, timestamps);

    if (timestamps.length > maxRequests) {
      const oldestInWindow = timestamps[0] || windowStart;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);

      return res.status(429).json({
        error: 'Rate limit exceeded. Please slow down and try again.',
        code: 'RATE_LIMIT_EXCEEDED',
        limit: maxRequests,
        remaining: 0,
        retryAfterSeconds,
      });
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - timestamps.length));
    next();
  };
};

/**
 * Standard Tiered Limiters for Different Endpoint Profiles
 */
export const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 25,
  prefix: 'rl_auth',
});

export const chatLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30, // 30 AI requests per minute per user/IP
  prefix: 'rl_chat',
});

export const fileUploadLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15, // 15 file operations per minute
  prefix: 'rl_upload',
});

export const generalApiLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 150, // 150 requests per minute general
  prefix: 'rl_api',
});

export default {
  rateLimiter,
  authLimiter,
  chatLimiter,
  fileUploadLimiter,
  generalApiLimiter,
};
