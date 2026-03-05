import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for onboarding requests
 * Max 3 onboarding requests per user per hour
 */
export const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per user
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.userId || req.ip;
  },
  message: 'Too many onboarding requests. Please wait before requesting another contribution roadmap.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting if not an onboarding request
    return req.body?.intent !== 'onboarding';
  },
});

export default onboardingLimiter;
