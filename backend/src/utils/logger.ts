// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - LOGGER UTILITY
// ============================================================================
// This file provides a centralized logging utility using Winston.
// It handles formatted logs with timestamps, colors, and log levels.
// ============================================================================

import winston from 'winston';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about our custom colors
winston.addColors(colors);

// ============================================================================
// LOG FORMAT
// ============================================================================

// Format for console output (development)
const consoleFormat = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  // Add colors
  winston.format.colorize({ all: true }),
  // Format the message
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      let log = `${timestamp} [${level}]: ${message}`;

      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        // Exclude the 'label' field that winston adds
        const { label, ...rest } = meta as any;
        if (Object.keys(rest).length > 0) {
          log += ` ${JSON.stringify(rest)}`;
        }
      }

      return log;
    }
  )
);

// Format for file output (production)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ============================================================================
// TRANSPORTS
// ============================================================================

const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

// File transport for errors (production only)
if (!isDevelopment && !isTest) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // File transport for all logs (production only)
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// ============================================================================
// LOGGER INSTANCE
// ============================================================================

export const logger = winston.createLogger({
  level: isTest ? 'error' : logLevel,
  levels,
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: fileFormat,
    }),
  ],
});

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * Log an error message
 * @param message - The error message
 * @param meta - Additional metadata
 * @param error - Optional error object (will be logged with stack trace)
 */
export const logError = (message: string, meta?: any, error?: Error): void => {
  logger.error(message, {
    ...meta,
    ...(error && {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    }),
  });
};

/**
 * Log a warning message
 * @param message - The warning message
 * @param meta - Additional metadata
 */
export const logWarn = (message: string, meta?: any): void => {
  logger.warn(message, meta);
};

/**
 * Log an info message
 * @param message - The info message
 * @param meta - Additional metadata
 */
export const logInfo = (message: string, meta?: any): void => {
  logger.info(message, meta);
};

/**
 * Log a debug message (only in development)
 * @param message - The debug message
 * @param meta - Additional metadata
 */
export const logDebug = (message: string, meta?: any): void => {
  if (isDevelopment) {
    logger.debug(message, meta);
  }
};

/**
 * Log an HTTP request
 * @param method - HTTP method
 * @param url - Request URL
 * @param status - Response status code
 * @param responseTime - Response time in milliseconds
 */
export const logHttp = (
  method: string,
  url: string,
  status: number,
  responseTime: number
): void => {
  logger.http(`${method} ${url} ${status} ${responseTime}ms`);
};

// ============================================================================
// REQUEST CONTEXT LOGGER
// ============================================================================

/**
 * Create a child logger with bound context
 * Useful for adding request-specific metadata to all logs
 * @param context - Context object to bind to logger
 * @returns A child logger instance
 */
export function createChildLogger(context: any) {
  return logger.child(context);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default logger;
