/**
 * Middleware Index
 * Central export for all middleware modules
 */

const { authenticate, authorize, optionalAuth } = require('./auth');
const {
  validate,
  isValidObjectId,
  registerValidation,
  loginValidation,
  startInterviewValidation,
  userIdParamValidation,
  addQuestionValidation,
  submitAnswerValidation
} = require('./validation');
const {
  ApiError,
  asyncHandler,
  notFoundHandler,
  errorHandler
} = require('./errorHandler');
const upload = require('./uploadMiddleware');

module.exports = {
  // Authentication
  authenticate,
  authorize,
  optionalAuth,

  // Validation
  validate,
  isValidObjectId,
  registerValidation,
  loginValidation,
  startInterviewValidation,
  userIdParamValidation,
  addQuestionValidation,
  submitAnswerValidation,

  // Error Handling
  ApiError,
  asyncHandler,
  notFoundHandler,
  errorHandler,

  // File Upload
  upload,
};
