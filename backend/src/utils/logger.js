import env from '../config/env.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[env.LOG_LEVEL] || LOG_LEVELS.info;

const formatLog = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
  };
  return JSON.stringify(logEntry);
};

const logger = {
  error: (message, data) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatLog('error', message, data));
    }
  },
  warn: (message, data) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, data));
    }
  },
  info: (message, data) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(formatLog('info', message, data));
    }
  },
  debug: (message, data) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.debug(formatLog('debug', message, data));
    }
  },
};

export default logger;
