import { redisGet, redisSet, redisDel, isRedisAvailable } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// In-memory fallback cache: key -> { val, expiresAt }
const memoryCache = new Map();

// Periodic cleanup of expired memory cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiresAt && item.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

class CacheService {
  /**
   * Safe Cache Retrieval
   */
  async get(key) {
    if (!key) return null;

    if (isRedisAvailable()) {
      try {
        const val = await redisGet(`cache:${key}`);
        if (val !== null) return val;
      } catch (err) {
        logger.debug(`[CacheService] Redis get failed for "${key}": ${err.message}`);
      }
    }

    // In-memory fallback
    const item = memoryCache.get(key);
    if (!item) return null;

    if (item.expiresAt && item.expiresAt < Date.now()) {
      memoryCache.delete(key);
      return null;
    }

    return item.val;
  }

  /**
   * Safe Cache Storage with TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    if (!key || value === undefined) return false;

    if (isRedisAvailable()) {
      try {
        const ok = await redisSet(`cache:${key}`, value, ttlSeconds);
        if (ok) return true;
      } catch (err) {
        logger.debug(`[CacheService] Redis set failed for "${key}": ${err.message}`);
      }
    }

    // In-memory fallback
    memoryCache.set(key, {
      val: value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
    return true;
  }

  /**
   * Safe Cache Invalidation
   */
  async del(key) {
    if (!key) return false;

    if (isRedisAvailable()) {
      try {
        await redisDel(`cache:${key}`);
      } catch (_) {}
    }

    memoryCache.delete(key);
    return true;
  }

  /**
   * Build safe user-scoped cache key
   */
  buildUserKey(userId, resource, subKey = '') {
    const cleanUser = String(userId || 'anon').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `user:${cleanUser}:${resource}${subKey ? ':' + subKey : ''}`;
  }

  /**
   * Build safe public/deterministic lookup key
   */
  buildLookupKey(namespace, query) {
    const cleanQuery = String(query || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `lookup:${namespace}:${cleanQuery}`;
  }
}

export const cacheService = new CacheService();
export default cacheService;
