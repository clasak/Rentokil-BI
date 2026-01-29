/**
 * Environment detection utilities
 * Provides consistent environment detection across the application
 */

export function getEnvironment(): 'development' | 'production' | 'test' {
  // Check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return 'production'
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test'
  }
  return 'development'
}

export function isDevelopment(): boolean {
  return getEnvironment() === 'development'
}

export function isProduction(): boolean {
  return getEnvironment() === 'production'
}

export function isTest(): boolean {
  return getEnvironment() === 'test'
}

/**
 * Helper for conditional error details
 * Returns different values based on environment
 */
export function getErrorDetails<T>(
  productionValue: T,
  developmentValue: T
): T {
  return isProduction() ? productionValue : developmentValue
}

/**
 * Get environment-specific log level
 */
export function shouldLogVerbose(): boolean {
  return !isProduction()
}
