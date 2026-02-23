/**
 * Config Index
 * Central export for all configuration modules
 */

const { connectDB, closeDB } = require('./db');
const logger = require('./logger');
const constants = require('./constants');

module.exports = {
  connectDB,
  closeDB,
  logger,
  ...constants
};
