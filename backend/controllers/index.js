/**
 * =============================================================================
 * CONTROLLERS INDEX
 * =============================================================================
 * 
 * Central export file for all controllers.
 * Allows for cleaner imports in route files.
 * 
 * Usage:
 * const { authController, answerController } = require('./controllers');
 * 
 * @version 2.0.0
 * =============================================================================
 */

const authController = require('./authController');
const answerController = require('./answerController');

module.exports = {
  authController,
  answerController,
};
