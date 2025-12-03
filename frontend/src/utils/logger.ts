/**
 * Logger utility for frontend
 * In production, logs are disabled in browser console.
 * All logs are sent to backend/Render instead.
 */

const isDevelopment = import.meta.env.MODE === 'development';

const logger = {
  log: (...args: any[]) => {
    // Only log to browser console in development
    if (isDevelopment) {
      console.log(...args);
    }
    // In production, logs are handled by backend
  },

  error: (...args: any[]) => {
    // Only log to browser console in development
    if (isDevelopment) {
      console.error(...args);
    }
    // In production, errors are logged on backend
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  identifyUser: (userId: string, userInfo?: any) => {
    if (isDevelopment) {
      console.log('[Logger] Identify user:', userId, userInfo);
    }
  },

  getSessionURL: () => {
    return null;
  },
};

export default logger;
