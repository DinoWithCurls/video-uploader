import LogRocket from 'logrocket';

const isDevelopment = import.meta.env.MODE === 'development';
const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID;

// Initialize LogRocket only in production
if (!isDevelopment && LOGROCKET_APP_ID) {
  LogRocket.init(LOGROCKET_APP_ID);
}

/**
 * Centralized logger that uses console in development and LogRocket in production
 */
class Logger {
  log(message: string, data?: any) {
    if (isDevelopment) {
      console.log(message, data || '');
    } else if (LOGROCKET_APP_ID) {
      LogRocket.log(message, data);
    }
  }

  info(message: string, data?: any) {
    if (isDevelopment) {
      console.info(message, data || '');
    } else if (LOGROCKET_APP_ID) {
      LogRocket.info(message, data);
    }
  }

  warn(message: string, data?: any) {
    if (isDevelopment) {
      console.warn(message, data || '');
    } else if (LOGROCKET_APP_ID) {
      LogRocket.warn(message, data);
    }
  }

  error(message: string, data?: any) {
    if (isDevelopment) {
      console.error(message, data || '');
    } else if (LOGROCKET_APP_ID) {
      LogRocket.error(message, data);
    }
  }

  /**
   * Identify user in LogRocket (call after login)
   */
  identifyUser(userId: string, userInfo?: { name?: string; email?: string; role?: string }) {
    if (!isDevelopment && LOGROCKET_APP_ID) {
      LogRocket.identify(userId, userInfo);
    }
  }

  /**
   * Get LogRocket session URL (for support/debugging)
   */
  getSessionURL(): string | null {
    if (!isDevelopment && LOGROCKET_APP_ID) {
      return LogRocket.sessionURL;
    }
    return null;
  }
}

export const logger = new Logger();
export default logger;
