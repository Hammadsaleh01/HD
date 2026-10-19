import rateLimit from 'express-rate-limit';

// Strict limiter for authentication and password reset routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Prevent proxy header validation errors in cloud/container environments
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    }
  }
});

// Moderate global limiter for general API routes
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Prevent proxy header validation errors in cloud/container environments
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please slow down your requests.'
    }
  }
});
