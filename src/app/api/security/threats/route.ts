import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface Threat {
  type: 'brute_force' | 'privilege_escalation' | 'session_anomaly' | 'suspicious_activity'
  severity: 'critical' | 'high' | 'medium' | 'low'
  user_email?: string
  ip_address?: string
  evidence: string[]
  recommended_action: string
  detected_at: string
}

interface ThreatsResponse {
  status: 'ok' | 'threats_detected'
  timestamp: string
  threats: Threat[]
  summary: {
    total: number
    critical: number
    high: number
    medium: number
  }
}

/**
 * GET /api/security/threats
 * Detect threat patterns from security events
 */
export async function GET(): Promise<NextResponse<ThreatsResponse>> {
  const now = new Date().toISOString()
  const threats: Threat[] = []

  try {
    // Try to detect threats from Supabase
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      // Detect brute force: >5 login failures from same email in 15 minutes
      const { data: loginFailures } = await supabase
        .from('security_events')
        .select('user_email, ip_address, created_at')
        .eq('event_type', 'login_failure')
        .gte('created_at', fifteenMinutesAgo)

      if (loginFailures && loginFailures.length > 0) {
        // Group by email
        const failuresByEmail = loginFailures.reduce((acc, event) => {
          const email = event.user_email || 'unknown'
          if (!acc[email]) acc[email] = []
          acc[email].push(event)
          return acc
        }, {} as Record<string, typeof loginFailures>)

        for (const [email, failures] of Object.entries(failuresByEmail)) {
          if (failures.length >= 5) {
            const ips = [...new Set(failures.map(f => f.ip_address).filter(Boolean))]
            threats.push({
              type: 'brute_force',
              severity: failures.length >= 10 ? 'critical' : 'high',
              user_email: email,
              ip_address: ips[0] || undefined,
              evidence: [
                `${failures.length} failed login attempts in last 15 minutes`,
                `IP addresses: ${ips.join(', ') || 'unknown'}`,
                `First attempt: ${failures[failures.length - 1].created_at}`,
                `Last attempt: ${failures[0].created_at}`
              ],
              recommended_action: failures.length >= 10
                ? 'Immediately block IP and force password reset for user'
                : 'Monitor closely, consider temporary account lock',
              detected_at: now
            })
          }
        }

        // Group by IP for distributed attacks
        const failuresByIP = loginFailures.reduce((acc, event) => {
          const ip = event.ip_address || 'unknown'
          if (!acc[ip]) acc[ip] = []
          acc[ip].push(event)
          return acc
        }, {} as Record<string, typeof loginFailures>)

        for (const [ip, failures] of Object.entries(failuresByIP)) {
          if (ip !== 'unknown' && failures.length >= 10) {
            const emails = [...new Set(failures.map(f => f.user_email).filter(Boolean))]
            if (emails.length >= 3) {
              threats.push({
                type: 'brute_force',
                severity: 'critical',
                ip_address: ip,
                evidence: [
                  `${failures.length} failed logins from single IP targeting ${emails.length} accounts`,
                  `Targeted accounts: ${emails.slice(0, 5).join(', ')}${emails.length > 5 ? '...' : ''}`,
                  'Pattern suggests credential stuffing attack'
                ],
                recommended_action: 'Block IP address immediately, notify security team',
                detected_at: now
              })
            }
          }
        }
      }

      // Detect privilege escalation: role changes in last hour
      const { data: roleChanges } = await supabase
        .from('security_events')
        .select('*')
        .eq('event_type', 'role_change')
        .gte('created_at', oneHourAgo)

      if (roleChanges && roleChanges.length > 0) {
        for (const change of roleChanges) {
          const metadata = change.metadata as Record<string, unknown> || {}
          const oldRole = metadata.old_role as string
          const newRole = metadata.new_role as string

          // Check for escalation to admin/exec roles
          const sensitiveRoles = ['exec', 'market_director', 'admin']
          if (sensitiveRoles.includes(newRole) && !sensitiveRoles.includes(oldRole)) {
            threats.push({
              type: 'privilege_escalation',
              severity: 'high',
              user_email: change.user_email,
              evidence: [
                `Role changed from "${oldRole}" to "${newRole}"`,
                `Changed at: ${change.created_at}`,
                `Changed by: ${metadata.changed_by || 'unknown'}`
              ],
              recommended_action: 'Verify role change was authorized by appropriate manager',
              detected_at: now
            })
          }
        }
      }

      // Detect session anomalies
      const { data: sessionAnomalies } = await supabase
        .from('security_events')
        .select('*')
        .eq('event_type', 'session_anomaly')
        .gte('created_at', oneHourAgo)

      if (sessionAnomalies && sessionAnomalies.length > 0) {
        for (const anomaly of sessionAnomalies) {
          const metadata = anomaly.metadata as Record<string, unknown> || {}
          threats.push({
            type: 'session_anomaly',
            severity: 'medium',
            user_email: anomaly.user_email,
            ip_address: anomaly.ip_address,
            evidence: [
              metadata.reason as string || 'Unusual session behavior detected',
              `IP: ${anomaly.ip_address || 'unknown'}`,
              `Time: ${anomaly.created_at}`
            ],
            recommended_action: 'Review user session activity, consider requiring re-authentication',
            detected_at: now
          })
        }
      }
    }

    // Calculate summary
    const criticalCount = threats.filter(t => t.severity === 'critical').length
    const highCount = threats.filter(t => t.severity === 'high').length
    const mediumCount = threats.filter(t => t.severity === 'medium').length

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    threats.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      status: threats.length > 0 ? 'threats_detected' : 'ok',
      timestamp: now,
      threats,
      summary: {
        total: threats.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('[Security Threats] Error:', error)
    return NextResponse.json({
      status: 'ok',
      timestamp: now,
      threats: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0 }
    }, { status: 500 })
  }
}
