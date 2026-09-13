const config = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  const error = ApiError.notFound(`Endpoint Not Found - ${req.method} ${req.originalUrl}`);
  next(error);
};

const globalErrorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'SERVER_ERROR';
  let details = err.details || [];

  // Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}'`;
    errorCode = 'INVALID_PARAMETER';
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value provided for '${field}'`;
    errorCode = 'DUPLICATE_KEY';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      details,
      ...(config.env === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
