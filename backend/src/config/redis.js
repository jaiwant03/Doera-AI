import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient = null;
let isConnected = false;
let connectionAttempted = false;

/**
 * Initialize Redis Client with Resilient Fallback
 * Works seamlessly with Upstash Redis, Render Redis, Redis Cloud, or local Redis.
 * If REDIS_URL is not configured or connection fails, the application continues
 * operating using in-memory fallbacks without interruption.
 */
export const getRedisClient = () => {
  if (redisClient) return redisClient;
  if (connectionAttempted && !isConnected) return null;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    if (!connectionAttempted) {
      logger.info('[DOERA Redis] REDIS_URL not configured. Operating in high-performance in-memory mode.');
      connectionAttempted = true;
    }
    return null;
  }

  connectionAttempted = true;

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.warn('[DOERA Redis] Max reconnection attempts reached. Continuing with in-memory fallback.');
          return null; // Stop retrying
        }
        return Math.min(times * 500, 3000);
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('[DOERA Redis] Successfully connected to Redis instance.');
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      logger.warn(`[DOERA Redis] Connection warning (fallback active): ${err.message}`);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    return redisClient;
  } catch (err) {
    logger.warn(`[DOERA Redis] Failed to initialize Redis client: ${err.message}. Using in-memory fallback.`);
    redisClient = null;
    isConnected = false;
    return null;
  }
};

/**
 * Helper to check if Redis is actively connected
 */
export const isRedisAvailable = () => {
  return isConnected && redisClient !== null && redisClient.status === 'ready';
};

/**
 * Safe Get from Redis
 */
export const redisGet = async (key) => {
  const client = getRedisClient();
  if (!isRedisAvailable() || !client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.debug(`[DOERA Redis] Get failed for "${key}": ${err.message}`);
    return null;
  }
};

/**
 * Safe Set in Redis with TTL
 */
export const redisSet = async (key, value, ttlSeconds = 3600) => {
  const client = getRedisClient();
  if (!isRedisAvailable() || !client) return false;
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await client.set(key, payload);
    }
    return true;
  } catch (err) {
    logger.debug(`[DOERA Redis] Set failed for "${key}": ${err.message}`);
    return false;
  }
};

/**
 * Safe Del from Redis
 */
export const redisDel = async (key) => {
  const client = getRedisClient();
  if (!isRedisAvailable() || !client) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    logger.debug(`[DOERA Redis] Del failed for "${key}": ${err.message}`);
    return false;
  }
};

/**
 * Cleanly disconnect Redis on server shutdown
 */
export const disconnectRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('[DOERA Redis] Cleanly disconnected from Redis.');
    } catch (_) {
      try {
        redisClient.disconnect();
      } catch (_) {}
    }
    redisClient = null;
    isConnected = false;
  }
};

export default {
  getRedisClient,
  isRedisAvailable,
  redisGet,
  redisSet,
  redisDel,
  disconnectRedis,
};
