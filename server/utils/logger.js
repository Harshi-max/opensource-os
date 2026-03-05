/**
 * Simple Logger Utility
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const getColor = (level) => {
  switch (level) {
    case LOG_LEVELS.ERROR:
      return colors.red;
    case LOG_LEVELS.WARN:
      return colors.yellow;
    case LOG_LEVELS.INFO:
      return colors.green;
    case LOG_LEVELS.DEBUG:
      return colors.blue;
    default:
      return colors.reset;
  }
};

const formatTimestamp = () => {
  return new Date().toISOString();
};

const log = (level, message, data = null) => {
  const color = getColor(level);
  const timestamp = formatTimestamp();

  const output = `${color}[${timestamp}] [${level}]${colors.reset} ${message}`;

  if (data) {
    console.log(output);
    console.log(data);
  } else {
    console.log(output);
  }
};

export const logger = {
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      log(LOG_LEVELS.DEBUG, message, data);
    }
  },
};

export default logger;
