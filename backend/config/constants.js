/**
 * Application Constants
 * Centralized location for all magic strings and configuration values
 */

// User Roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  INTERVIEWER: 'interviewer'
};

// Interview Session Status
const SESSION_STATUS = {
  PENDING: 'pending',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Question Difficulty Levels
const DIFFICULTY_LEVELS = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard'
};

// Schedule Status
const SCHEDULE_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};

// Token Expiry Times
const TOKEN_EXPIRY = {
  ACCESS: '24h',
  REFRESH: '7d'
};

// Validation Limits
const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50
};

module.exports = {
  USER_ROLES,
  SESSION_STATUS,
  DIFFICULTY_LEVELS,
  SCHEDULE_STATUS,
  PAYMENT_STATUS,
  HTTP_STATUS,
  TOKEN_EXPIRY,
  VALIDATION
};
