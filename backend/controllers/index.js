/**
 * =============================================================================
 * CONTROLLERS INDEX
 * =============================================================================
 * 
 * Central export file for all controllers.
 * Allows for cleaner imports in route files.
 * 
 * Usage:
 * const { authController, interviewController } = require('./controllers');
 * 
 * @author FYP Team
 * @version 1.0.0
 * =============================================================================
 */

const authController = require('./authController');

module.exports = {
  authController
};
