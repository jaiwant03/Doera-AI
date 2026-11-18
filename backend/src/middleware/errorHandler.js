import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled error at ${req.method} ${req.originalUrl}:`, err.message);

  const statusCode = err.statusCode || 500;
  const response = {
    error: err.message || 'An internal server error occurred.',
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
