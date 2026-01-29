/**
 * Error sanitization for production environments
 * Prevents information disclosure while maintaining debugging capabilities
 */

// Sensitive patterns to redact
const SENSITIVE_PATTERNS = [
  // Project IDs
  /bidata-sharedus-(production|staging|dev)/gi,
  // Table references with backticks
  /`[^`]+\.[^`]+\.[^`]+`/g,
  // Dataset references
  /dataset:[^:]+:[^:]+:/g,
  // File paths
  /\/Users\/[^\s]+/g,
  /\/home\/[^\s]+/g,
  /C:\\Users\\[^\s]+/g,
  // Specific table/dataset names
  /S0_TMX/g,
  /S4/g,
  /BCG_RTD_DB/g,
  /W3_Contract_Checker/g,
  /Reports/g,
  // Permission details
  /Permission [^\s]+ denied/g,
]

// Generic replacement text
const REDACTED_TEXT = '[REDACTED]'

/**
 * Sanitize error message for production display
 */
export function sanitizeErrorMessage(
  error: unknown,
  environment: 'development' | 'production' = process.env.NODE_ENV === 'production' ? 'production' : 'development'
): string {
  // In development, show full error details
  if (environment === 'development') {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  // In production, sanitize sensitive information
  let message = error instanceof Error ? error.message : String(error)

  // Apply redaction patterns
  SENSITIVE_PATTERNS.forEach(pattern => {
    message = message.replace(pattern, REDACTED_TEXT)
  })

  // Map to user-friendly generic messages
  if (message.includes('Not found') || message.includes('Table')) {
    return 'The requested data could not be found. Please contact support if this issue persists.'
  }

  if (message.includes('Access Denied') || message.includes('Permission')) {
    return 'Access denied. You may not have permission to view this data.'
  }

  if (message.includes('Syntax error') || message.includes('Invalid query')) {
    return 'A query error occurred. Please contact support.'
  }

  if (message.includes('exceeded') || message.includes('timeout')) {
    return 'The request timed out. Please try reducing the date range or limit.'
  }

  if (message.includes('quota') || message.includes('limit')) {
    return 'Resource limit exceeded. Please try again later.'
  }

  // Generic fallback
  return 'An error occurred while processing your request. Please contact support.'
}

/**
 * Sanitize stack trace for production
 */
export function sanitizeStackTrace(
  stack: string | undefined,
  environment: 'development' | 'production' = process.env.NODE_ENV === 'production' ? 'production' : 'development'
): string | undefined {
  if (environment === 'development') {
    return stack
  }

  // In production, don't include stack traces in responses
  return undefined
}

/**
 * Sanitize query options/filters for logging
 * Removes potentially sensitive data (PII, credentials)
 */
export function sanitizeLogData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  const sanitized: Record<string, unknown> = {}
  const sensitiveKeys = [
    'email',
    'password',
    'token',
    'ssn',
    'social_security',
    'customerName',
    'customer_name',
    'employeeName',
    'employee_name',
    'salesPerson',
    'salesperson_name',
  ]

  for (const [key, value] of Object.entries(data)) {
    // Check if key contains sensitive information
    const isSensitive = sensitiveKeys.some(sk =>
      key.toLowerCase().includes(sk.toLowerCase())
    )

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeLogData(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Get appropriate error code based on error type
 */
export function getErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'UNKNOWN_ERROR'

  const message = error.message.toLowerCase()

  // Check in order of specificity to avoid false matches
  // Most specific checks first
  if (message.includes('quota')) {
    return 'QUOTA_EXCEEDED'
  }
  if (message.includes('access denied') || message.includes('permission')) {
    return 'ACCESS_DENIED'
  }
  if (message.includes('syntax')) {
    return 'INVALID_QUERY'
  }
  if (message.includes('timeout')) {
    return 'TIMEOUT'
  }
  if (message.includes('exceeded')) {
    return 'TIMEOUT'
  }
  if (message.includes('not found') || message.includes('table')) {
    return 'DATA_NOT_FOUND'
  }
  if (message.includes('invalid')) {
    return 'INVALID_QUERY'
  }
  if (message.includes('limit')) {
    return 'QUOTA_EXCEEDED'
  }

  return 'QUERY_FAILED'
}
