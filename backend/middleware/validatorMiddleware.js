const { validationResult } = require('express-validator');

module.exports = function validatorMiddleware(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMap = {};
    errors.array().forEach(err => {
      if (!errorMap[err.path]) {
        errorMap[err.path] = err.msg;
      }
    });

    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg || 'Validation failed. Please verify input fields.',
      errors: errorMap
    });
  }
  next();
};
