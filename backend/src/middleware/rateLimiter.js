// In-memory sliding window rate limiter
const requestCounts = new Map();

export const rateLimiter = (options = { windowMs: 60000, maxRequests: 60 }) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }

    const timestamps = requestCounts.get(ip).filter((ts) => ts > windowStart);
    timestamps.push(now);
    requestCounts.set(ip, timestamps);

    if (timestamps.length > options.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please slow down.',
        retryAfterMs: Math.ceil((timestamps[0] + options.windowMs - now)),
      });
    }

    next();
  };
};
