/**
 * Audit Logging for Security Events
 *
 * Logs all query access attempts for security monitoring and compliance.
 * This helps track unauthorized access attempts and unusual usage patterns.
 */

export interface AuditLogEntry {
  timestamp: Date
  userId: string
  userName: string
  userEmail: string
  userRole: string
  action: 'query_access' | 'query_denied' | 'unauthorized' | 'forbidden'
  queryName: string
  filters: Record<string, unknown>
  result: 'success' | 'denied' | 'error'
  responseTime?: number
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Log a security-relevant event
 *
 * @param entry - The audit log entry
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Format log message
    const logLevel = entry.result === 'success' ? 'info' : 'warn'
    const emoji = entry.result === 'success' ? '✅' : entry.result === 'denied' ? '🚫' : '❌'

    const message = [
      `${emoji} [Audit]`,
      `User: ${entry.userName} (${entry.userRole})`,
      `Action: ${entry.action}`,
      `Query: ${entry.queryName}`,
      `Result: ${entry.result}`,
      entry.responseTime ? `Time: ${entry.responseTime}ms` : '',
      entry.errorMessage ? `Error: ${entry.errorMessage}` : '',
    ]
      .filter(Boolean)
      .join(' | ')

    // Log to console
    if (logLevel === 'info') {
      console.info(message)
    } else {
      console.warn(message)
    }

    // Log detailed JSON for parsing/monitoring
    console.log(
      JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        _type: 'audit_log',
      })
    )

    // TODO: Send to external monitoring service
    // Examples:
    // - Sentry: Sentry.captureMessage(message, { level: logLevel, extra: entry })
    // - DataDog: datadogLogs.logger.log(message, entry)
    // - CloudWatch: cloudwatch.putLogEvents({ logEvents: [entry] })

    // TODO: Store in database for compliance/audit trail
    // Examples:
    // - Supabase: await supabase.from('audit_logs').insert(entry)
    // - BigQuery: await bigquery.dataset('audit').table('logs').insert(entry)

    // For production, you might want to batch logs and send asynchronously
    // to avoid blocking API responses
  } catch (error) {
    // Never let audit logging break the application
    // But do log that audit logging failed
    console.error('[Audit] CRITICAL: Failed to log audit event:', error)
    console.error('[Audit] Failed entry:', entry)
  }
}

/**
 * Log successful query access
 */
export async function logQueryAccess(
  userId: string,
  userName: string,
  userEmail: string,
  userRole: string,
  queryName: string,
  filters: Record<string, unknown>,
  responseTime: number
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    userId,
    userName,
    userEmail,
    userRole,
    action: 'query_access',
    queryName,
    filters,
    result: 'success',
    responseTime,
  })
}

/**
 * Log denied query access (permission check failed)
 */
export async function logQueryDenied(
  userId: string,
  userName: string,
  userEmail: string,
  userRole: string,
  queryName: string,
  filters: Record<string, unknown>,
  reason: string
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    userId,
    userName,
    userEmail,
    userRole,
    action: 'query_denied',
    queryName,
    filters,
    result: 'denied',
    errorMessage: reason,
  })
}

/**
 * Log unauthorized access attempt (no valid session)
 */
export async function logUnauthorized(
  queryName: string,
  filters: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    userId: 'anonymous',
    userName: 'Anonymous',
    userEmail: 'unknown',
    userRole: 'none',
    action: 'unauthorized',
    queryName,
    filters,
    result: 'denied',
    errorMessage: 'No valid session',
    ipAddress,
    userAgent,
  })
}

/**
 * Log query error (query executed but failed)
 */
export async function logQueryError(
  userId: string,
  userName: string,
  userEmail: string,
  userRole: string,
  queryName: string,
  filters: Record<string, unknown>,
  error: string
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    userId,
    userName,
    userEmail,
    userRole,
    action: 'query_access',
    queryName,
    filters,
    result: 'error',
    errorMessage: error,
  })
}
