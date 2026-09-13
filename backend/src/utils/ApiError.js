class ApiError extends Error {
  constructor(statusCode, message, errorCode = 'API_ERROR', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details = []) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized access', details = []) {
    return new ApiError(401, message, 'UNAUTHORIZED', details);
  }

  static forbidden(message = 'Access forbidden', details = []) {
    return new ApiError(403, message, 'FORBIDDEN', details);
  }

  static notFound(message = 'Resource not found', details = []) {
    return new ApiError(404, message, 'NOT_FOUND', details);
  }

  static unprocessable(message = 'Validation error', details = []) {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static internal(message = 'Internal server error', details = []) {
    return new ApiError(500, message, 'INTERNAL_SERVER_ERROR', details);
  }
}

module.exports = ApiError;
