/**
 * Security Event Logger
 *
 * Utility for logging security events to the security_events table.
 * Used by Sam agent for threat detection.
 */

type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_reset'
  | 'role_change'
  | 'session_anomaly'
  | 'brute_force'
  | 'privilege_escalation'

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

interface SecurityEventData {
  event_type: SecurityEventType
  user_email?: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  severity: Severity
  metadata?: Record<string, unknown>
}

/**
 * Log a security event to the API
 * Works in both client and server contexts
 */
export async function logSecurityEvent(data: SecurityEventData): Promise<void> {
  try {
    // Determine base URL - use relative URL on client, absolute on server
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app'
      : ''

    const response = await fetch(`${baseUrl}/api/security/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      console.error('[Security Logger] Failed to log event:', response.status)
    }
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('[Security Logger] Error logging event:', error)
  }
}

/**
 * Log a successful login
 */
export async function logLoginSuccess(
  email: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent({
    event_type: 'login_success',
    user_email: email,
    user_id: userId,
    severity: 'info',
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Log a failed login attempt
 */
export async function logLoginFailure(
  email: string,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent({
    event_type: 'login_failure',
    user_email: email,
    severity: 'medium',
    metadata: {
      reason,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Log a logout event
 */
export async function logLogout(
  email: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent({
    event_type: 'logout',
    user_email: email,
    user_id: userId,
    severity: 'info',
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Log a password reset request
 */
export async function logPasswordReset(
  email: string,
  action: 'requested' | 'completed',
  metadata?: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent({
    event_type: 'password_reset',
    user_email: email,
    severity: 'low',
    metadata: {
      action,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Log a role change
 */
export async function logRoleChange(
  email: string,
  oldRole: string,
  newRole: string,
  changedBy: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Determine severity based on role escalation
  const sensitiveRoles = ['exec', 'market_vp', 'market_sales_director', 'admin']
  const isEscalation = sensitiveRoles.includes(newRole) && !sensitiveRoles.includes(oldRole)

  await logSecurityEvent({
    event_type: 'role_change',
    user_email: email,
    severity: isEscalation ? 'high' : 'low',
    metadata: {
      old_role: oldRole,
      new_role: newRole,
      changed_by: changedBy,
      is_escalation: isEscalation,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Log a session anomaly
 */
export async function logSessionAnomaly(
  email: string,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent({
    event_type: 'session_anomaly',
    user_email: email,
    severity: 'medium',
    metadata: {
      reason,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  })
}
