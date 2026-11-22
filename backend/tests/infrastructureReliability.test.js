import { describe, it, expect } from '@jest/globals';
import { ConcurrencyLimiter } from '../src/utils/concurrencyLimiter.js';
import cacheService from '../src/services/cacheService.js';
import { rateLimiter } from '../src/middleware/rateLimiter.js';
import { getDBStatus } from '../src/config/database.js';
import sharp from 'sharp';

describe('DOERA AI — Infrastructure Reliability, Concurrency & Security Tests', () => {

  // 1. Concurrency Limiter Tests
  describe('ConcurrencyLimiter', () => {
    it('allows tasks within limit to execute immediately', async () => {
      const limiter = new ConcurrencyLimiter(2);
      let executed = 0;

      await limiter.runWithLimit(async () => {
        executed++;
      }, 'task-1');

      expect(executed).toBe(1);
      expect(limiter.getStatus().activeCount).toBe(0);
    });

    it('queues tasks when concurrency limit is reached and executes in sequence', async () => {
      const limiter = new ConcurrencyLimiter(1);
      const executionOrder = [];

      const p1 = limiter.runWithLimit(async () => {
        await new Promise(r => setTimeout(r, 50));
        executionOrder.push('first');
      }, 'task-1');

      const p2 = limiter.runWithLimit(async () => {
        executionOrder.push('second');
      }, 'task-2');

      await Promise.all([p1, p2]);

      expect(executionOrder).toEqual(['first', 'second']);
      expect(limiter.getStatus().activeCount).toBe(0);
    });

    it('idempotency guard prevents duplicate parallel runs for the same key', async () => {
      const limiter = new ConcurrencyLimiter(2);
      let runCount = 0;

      const slowTask = () => limiter.runIdempotent('user-1-msg-abc', async () => {
        await new Promise(r => setTimeout(r, 50));
        runCount++;
        return { result: 'computed' };
      });

      // Submit identical request twice simultaneously (simulating double click)
      const [res1, res2] = await Promise.all([slowTask(), slowTask()]);

      expect(runCount).toBe(1); // Only executed ONCE
      expect(res1).toEqual({ result: 'computed' });
      expect(res2).toEqual({ result: 'computed' });
      expect(limiter.getStatus().inFlightKeysCount).toBe(0);
    });
  });

  // 2. Cache Service Tests
  describe('CacheService', () => {
    it('sets, gets and deletes cache entries correctly', async () => {
      const key = 'test_lookup_key_123';
      const data = { city: 'Chennai', lat: 13.0827, lng: 80.2707 };

      await cacheService.set(key, data, 10);
      const retrieved = await cacheService.get(key);
      expect(retrieved).toEqual(data);

      await cacheService.del(key);
      const afterDel = await cacheService.get(key);
      expect(afterDel).toBeNull();
    });

    it('builds safe lookup and user-specific keys', () => {
      const lookupKey = cacheService.buildLookupKey('geocode', 'New York City');
      expect(lookupKey).toBe('lookup:geocode:new_york_city');

      const userKey = cacheService.buildUserKey('usr123', 'profile', 'settings');
      expect(userKey).toBe('user:usr123:profile:settings');
    });
  });

  // 3. Rate Limiter Tests
  describe('RateLimiter Middleware', () => {
    it('allows requests within window threshold and enforces 429 when exceeded', async () => {
      const limiter = rateLimiter({ windowMs: 1000, maxRequests: 2, prefix: 'test_rl' });
      const req = { headers: {}, ip: '127.0.0.1' };

      let nextCalled = 0;
      const next = () => { nextCalled++; };

      const res = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
      };

      // 1st request -> pass
      await limiter(req, res, next);
      expect(nextCalled).toBe(1);

      // 2nd request -> pass
      await limiter(req, res, next);
      expect(nextCalled).toBe(2);

      // 3rd request -> 429
      await limiter(req, res, next);
      expect(res.statusCode).toBe(429);
      expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.headers['Retry-After']).toBeDefined();
    });
  });

  // 4. Database Status & Security
  describe('Database Telemetry & Masking', () => {
    it('returns clean status without leaking credentials or URIs', () => {
      const status = getDBStatus();
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('readyState');
      expect(status).toHaveProperty('poolSize');
      // Must never contain sensitive password substrings
      const json = JSON.stringify(status);
      expect(json).not.toContain('password');
      expect(json).not.toContain('mongodb+srv');
    });
  });

  // 5. Sharp libvips native memory guard
  describe('Image Processing Native Memory Guard', () => {
    it('executes without crashing on basic image buffer', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      const meta = await sharp(pngBuffer).metadata();
      expect(meta.width).toBe(1);
      expect(meta.height).toBe(1);
    });
  });
});
