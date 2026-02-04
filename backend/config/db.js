/**
 * Database Configuration
 * Handles MongoDB connection with proper error handling and retry logic
 */

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  // Validate MONGO_URI exists
  if (!process.env.MONGO_URI) {
    logger.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options are now default in Mongoose 6+, but explicit for clarity
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (err) {
    logger.error('MongoDB Connection Failed:', err.message);
    process.exit(1);
  }
};

/**
 * Gracefully close MongoDB connection
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed gracefully');
  } catch (err) {
    logger.error('Error closing MongoDB connection:', err.message);
  }
};

module.exports = { connectDB, closeDB };