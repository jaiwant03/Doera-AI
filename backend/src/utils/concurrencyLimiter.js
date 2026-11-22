import { logger } from './logger.js';

class ConcurrencyLimiter {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
    this.activeCount = 0;
    this.queue = [];
    this.inFlightKeys = new Map(); // key -> Promise
  }

  /**
   * Acquire a slot for heavy resource-intensive execution
   * (e.g., multi-agent LangGraph workflow, massive spreadsheet parsing, document OCR)
   */
  async acquire(tag = 'heavy-task', timeoutMs = 60000) {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      logger.debug(`[ConcurrencyLimiter] Slot acquired for ${tag}. Active: ${this.activeCount}/${this.maxConcurrent}`);
      return;
    }

    logger.info(`[ConcurrencyLimiter] Concurrency limit (${this.maxConcurrent}) reached. Queuing request: ${tag} (Queue length: ${this.queue.length + 1})`);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.queue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
          logger.warn(`[ConcurrencyLimiter] Queued request timed out after ${timeoutMs}ms: ${tag}`);
          reject(new Error(`Server concurrency limit reached. Your request timed out waiting for server capacity. Please retry in a few moments.`));
        }
      }, timeoutMs);

      this.queue.push({
        tag,
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
      });
    });
  }

  /**
   * Release slot after task completion or failure
   */
  release(tag = 'heavy-task') {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      logger.debug(`[ConcurrencyLimiter] Releasing slot to queued task: ${next.tag}`);
      next.resolve();
    } else {
      this.activeCount = Math.max(0, this.activeCount - 1);
      logger.debug(`[ConcurrencyLimiter] Slot released for ${tag}. Active: ${this.activeCount}/${this.maxConcurrent}`);
    }
  }

  /**
   * Run a task within the concurrency limit and release automatically
   */
  async runWithLimit(fn, tag = 'task', timeoutMs = 60000) {
    await this.acquire(tag, timeoutMs);
    try {
      return await fn();
    } finally {
      this.release(tag);
    }
  }

  /**
   * Idempotency wrapper: Prevents duplicate execution of identical in-flight requests
   */
  async runIdempotent(idempotencyKey, fn) {
    if (!idempotencyKey) {
      return fn();
    }

    if (this.inFlightKeys.has(idempotencyKey)) {
      logger.info(`[ConcurrencyLimiter] Duplicate in-flight request detected for key "${idempotencyKey}". Attaching to existing operation.`);
      return this.inFlightKeys.get(idempotencyKey);
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inFlightKeys.delete(idempotencyKey);
      }
    })();

    this.inFlightKeys.set(idempotencyKey, promise);
    return promise;
  }

  getStatus() {
    return {
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
      queuedCount: this.queue.length,
      inFlightKeysCount: this.inFlightKeys.size,
    };
  }
}

// Default concurrency limit: 2 concurrent heavy tasks on free/starter tiers (configurable via env)
const defaultMax = process.env.MAX_CONCURRENT_HEAVY_TASKS
  ? parseInt(process.env.MAX_CONCURRENT_HEAVY_TASKS, 10)
  : 2;

export const heavyTaskLimiter = new ConcurrencyLimiter(defaultMax);
export default heavyTaskLimiter;
