const winston = require('winston');

const logger = winston.createLogger({
  level: 'info', // Logs everything 'info' level and above (info, warn, error)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // Saves logs in machine-readable JSON format
  ),
  transports: [
    // 1. Save critical errors to 'error.log'
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // 2. Save all logs (info + error) to 'combined.log'
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If we are NOT in production (i.e., we are coding on laptop), also log to the Terminal
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;