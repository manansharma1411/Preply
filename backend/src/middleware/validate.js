const ApiError = require('../utils/ApiError');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => detail.message.replace(/"/g, "'"));
      return next(ApiError.badRequest('Validation error', details));
    }

    req[property] = value;
    next();
  };
};

module.exports = validate;
