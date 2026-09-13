const rateLimit = require('express-rate-limit');

/**
 * Rate limiter middleware for AI explanation requests to prevent abuse.
 */
const explainRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 50, // Limit each IP/client to 50 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many explanation requests. Please wait a few minutes before trying again.',
  },
});

module.exports = {
  explainRateLimiter,
};
