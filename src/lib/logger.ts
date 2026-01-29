/**
 * Logger Utility
 *
 * Provides development-only logging that's automatically stripped in production builds.
 * Use this instead of direct console.log statements.
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Log error messages (always logged, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args)
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  /**
   * Log debug messages with a [DEBUG] prefix (only in development)
   */
  debug: (label: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${label}:`, ...args)
    }
  },

  /**
   * Log API request/response (only in development)
   */
  api: (method: string, endpoint: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[API] ${method} ${endpoint}`, data || '')
    }
  },
}

/**
 * Legacy support: Export individual functions for easier migration
 */
export const devLog = logger.log
export const devWarn = logger.warn
export const devError = logger.error
export const devDebug = logger.debug
