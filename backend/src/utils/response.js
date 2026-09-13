const sendSuccess = (res, statusCode = 200, data = {}, message = 'Operation successful') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, statusCode = 500, message = 'Internal server error', errorCode = 'SERVER_ERROR', details = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
