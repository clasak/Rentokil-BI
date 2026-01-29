/**
 * Centralized error handling for BigQuery queries
 * Provides consistent logging, monitoring, and error transformation
 */

import {
  sanitizeErrorMessage,
  sanitizeStackTrace,
  sanitizeLogData,
  getErrorCode
} from './error-sanitizer'

export class BigQueryError extends Error {
  constructor(
    message: string,
    public queryName: string,
    public originalError: unknown,
    public options?: unknown
  ) {
    super(message)
    this.name = 'BigQueryError'
  }
}

/**
 * Handle BigQuery query errors with consistent logging and transformation
 *
 * @param error - The caught error
 * @param queryName - Name of the query function that failed
 * @param options - Query options/filters (for debugging)
 * @returns Wrapped error with context
 */
export function handleBigQueryError(
  error: unknown,
  queryName: string,
  options?: unknown
): BigQueryError {
  const isDevelopment = process.env.NODE_ENV !== 'production'

  // Sanitize options for logging (remove PII)
  const sanitizedOptions = sanitizeLogData(options)

  // Log full details (only to server logs, not sent to client)
  console.error(`[BigQuery] Query "${queryName}" failed:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: isDevelopment ? (error instanceof Error ? error.stack : undefined) : '[REDACTED]',
    options: sanitizedOptions,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })

  // TODO: Send to monitoring service (Sentry, DataDog) with full details
  // Only monitoring services should see full error details

  // Create user-facing error message (sanitized for production)
  const userMessage = sanitizeErrorMessage(error, isDevelopment ? 'development' : 'production')
  const errorCode = getErrorCode(error)

  // Build options object with type safety
  const errorOptions: Record<string, unknown> = {
    errorCode,
  }

  // Add sanitized options if it's an object
  if (typeof sanitizedOptions === 'object' && sanitizedOptions !== null) {
    Object.assign(errorOptions, sanitizedOptions)
  }

  // Only include stack in development
  if (isDevelopment && error instanceof Error && error.stack) {
    errorOptions.stack = error.stack
  }

  return new BigQueryError(
    userMessage,
    queryName,
    error,
    errorOptions
  )
}

/**
 * Wrapper for query execution with automatic error handling
 * Use this to wrap BigQuery client calls
 */
export async function executeQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  options?: unknown
): Promise<T> {
  try {
    return await queryFn()
  } catch (error) {
    throw handleBigQueryError(error, queryName, options)
  }
}
