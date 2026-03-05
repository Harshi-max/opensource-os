import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints (login/register)
 * Protects against brute force while allowing a few retries for typos.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 15, // 15 attempts per 15 min (configurable via env)
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for general API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for poll creation
 */
export const pollLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 polls per user per hour
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },
  message: {
    error: 'You have created too many polls, please try again later',
  },
});
