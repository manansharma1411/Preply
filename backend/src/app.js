const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const { requestLogger } = require('./middleware/logger');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes/index');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
app.use('/api', limiter);

// Request Parsing, Caching & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Performance & Caching Headers
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'private, no-cache, must-revalidate');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

// API Routes Base
app.use('/api/v1', apiRoutes);

// Root Health Fallback Endpoint
app.get('/health', (req, res) => {
  res.redirect('/api/v1/health');
});

// Serve compiled static frontend assets in production / container environments
const path = require('path');
const fs = require('fs');
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized 404 and Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
