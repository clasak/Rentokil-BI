import { NextResponse } from 'next/server'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { TOP_10_KPIS, KPI_DICTIONARY, getKPIBySlug } from '@/lib/kpis'
import { getOpportunities, getServiceEvents, getInvoices, getAccounts } from '@/lib/data'

// Helper to format values based on KPI type
function formatKPIValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    case 'percent':
      return `${(value * 100).toFixed(1)}%`
    case 'days':
      return `${Math.round(value)} days`
    case 'index':
      return Math.round(value).toString()
    default:
      return value.toLocaleString()
  }
}

// Root cause analysis functions
function analyzeRevenueMTD(): { cause: string; action: string } {
  const opps = getOpportunities()
  const lostOpps = opps.filter(o => o.stage === 'closed_lost')
  const stalledOpps = opps.filter(o => o.isStalled)
  const invoices = getInvoices()
  const unpaidInvoices = invoices.filter(i => i.status === 'open' || i.status === 'overdue')

  if (lostOpps.length > 10) {
    return {
      cause: `${lostOpps.length} opportunities lost this period`,
      action: `Review lost opportunity reasons in Salesforce. Top vertical: ${getMostCommonVertical(lostOpps)}`
    }
  }
  if (stalledOpps.length > 5) {
    return {
      cause: `${stalledOpps.length} opportunities stalled with no activity >7 days`,
      action: `Follow up on stalled opportunities: ${stalledOpps.slice(0, 3).map(o => o.name).join(', ')}`
    }
  }
  if (unpaidInvoices.length > 20) {
    return {
      cause: `${unpaidInvoices.length} unpaid invoices affecting recognized revenue`,
      action: `Collections team to prioritize AR aging over 60 days`
    }
  }
  return { cause: 'Pipeline velocity below historical average', action: 'Review sales cadence and lead conversion rates' }
}

function analyzeWinRate(): { cause: string; action: string } {
  const opps = getOpportunities()
  const closedOpps = opps.filter(o => o.stage === 'closed_won' || o.stage === 'closed_lost')
  const lostOpps = closedOpps.filter(o => o.stage === 'closed_lost')
  const topLostVertical = getMostCommonVertical(lostOpps)

  return {
    cause: `${lostOpps.length} lost vs ${closedOpps.length - lostOpps.length} won. Highest loss rate in ${topLostVertical}`,
    action: `Review pricing and proposal quality for ${topLostVertical} segment`
  }
}

function analyzeCallbackRate(): { cause: string; action: string } {
  const events = getServiceEvents()
  const callbacks = events.filter(e => e.status === 'callback' || e.notes?.toLowerCase().includes('callback'))

  return {
    cause: `${callbacks.length} callback requests. Common issues: incomplete initial service, pest recurrence`,
    action: `Quality review for technicians with >3 callbacks. Check equipment and treatment protocols`
  }
}

function analyzeServiceRiskIndex(): { cause: string; action: string } {
  const accounts = getAccounts()
  const highRiskAccounts = accounts.filter(a => a.retentionRisk === 'high')
  const complaintsTotal = accounts.reduce((sum, a) => sum + a.complaints, 0)

  return {
    cause: `${highRiskAccounts.length} accounts at high churn risk. ${complaintsTotal} total complaints`,
    action: `Schedule retention calls for: ${highRiskAccounts.slice(0, 3).map(a => a.name).join(', ')}`
  }
}

function analyzeDSO(): { cause: string; action: string } {
  const invoices = getInvoices()
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.amount, 0)

  return {
    cause: `${overdueInvoices.length} overdue invoices totaling ${formatKPIValue(totalOverdue, 'currency')}`,
    action: `Collections priority: ${overdueInvoices.slice(0, 3).map(i => `${i.accountId} ($${i.amount})`).join(', ')}`
  }
}

function getMostCommonVertical(opps: ReturnType<typeof getOpportunities>): string {
  const accounts = getAccounts()
  const verticalCounts: Record<string, number> = {}

  for (const opp of opps) {
    const account = accounts.find(a => a.id === opp.accountId)
    if (account) {
      verticalCounts[account.vertical] = (verticalCounts[account.vertical] || 0) + 1
    }
  }

  return Object.entries(verticalCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
}

function getRootCauseAnalysis(slug: string): { cause: string; action: string } {
  switch (slug) {
    case 'revenue_mtd':
    case 'variance_to_target_mtd':
      return analyzeRevenueMTD()
    case 'win_rate':
      return analyzeWinRate()
    case 'callback_rate':
      return analyzeCallbackRate()
    case 'service_risk_index':
      return analyzeServiceRiskIndex()
    case 'dso':
      return analyzeDSO()
    case 'stalled_opps':
      const stalledOpps = getOpportunities().filter(o => o.isStalled)
      return {
        cause: `${stalledOpps.length} opportunities with no activity >7 days`,
        action: `Review and update: ${stalledOpps.slice(0, 5).map(o => o.name).join(', ')}`
      }
    case 'pipeline_30_60_90':
      return {
        cause: 'Pipeline coverage below 3x target',
        action: 'Increase prospecting activity and marketing lead flow'
      }
    case 'retention_risk':
      const highRiskAccounts = getAccounts().filter(a => a.retentionRisk === 'high')
      return {
        cause: `${highRiskAccounts.length} accounts flagged high risk`,
        action: `Proactive outreach to: ${highRiskAccounts.slice(0, 3).map(a => a.name).join(', ')}`
      }
    default:
      return { cause: 'Threshold breach detected', action: 'Review KPI definition and data sources' }
  }
}

interface KPIHealthItem {
  slug: string
  name: string
  status: 'ok' | 'warning' | 'critical'
  value: number
  formatted_value: string
  target?: number
  formatted_target?: string
  variance_pct?: number
  threshold_warning?: number
  threshold_critical?: number
  reason?: string
  root_cause?: string
  recommended_action?: string
  computed_at: string
}

interface DiagnosticDetail {
  slug: string
  name: string
  status: 'warning' | 'critical'
  current_value: string
  target_value: string
  variance: string
  threshold_breached: string
  root_cause: string
  recommended_action: string
  urgency: 'immediate' | 'today' | 'this_week'
}

interface KPIHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  kpis: KPIHealthItem[]
  summary: {
    total: number
    ok: number
    warning: number
    critical: number
  }
  anomalies: {
    slug: string
    issue: string
    severity: 'warning' | 'critical'
  }[]
  // NEW: Detailed diagnostics for agents
  diagnostics: DiagnosticDetail[]
  // NEW: Human-readable summary for Slack/notifications
  alert_summary: string
}

/**
 * GET /api/health/kpis
 * KPI-specific health check endpoint for Tommy agent
 *
 * Returns status of all KPI calculations including:
 * - Individual KPI status (ok/warning/critical)
 * - Variance from targets
 * - Detected anomalies
 * - Root cause analysis and recommended actions
 * - Human-readable alert summary for Slack
 */
export async function GET(): Promise<NextResponse<KPIHealthResponse>> {
  const now = new Date().toISOString()

  try {
    // Calculate all KPIs as executive (full access)
    const kpiValues = calculateKPIValues('exec', undefined)

    const kpis: KPIHealthItem[] = []
    const anomalies: KPIHealthResponse['anomalies'] = []
    const diagnostics: DiagnosticDetail[] = []

    let okCount = 0
    let warningCount = 0
    let criticalCount = 0

    // Process TOP_10_KPIS first (priority)
    for (const slug of TOP_10_KPIS) {
      const kpiValue = kpiValues.get(slug)
      const kpiDef = KPI_DICTIONARY.find(k => k.slug === slug)

      if (!kpiValue || !kpiDef) {
        anomalies.push({
          slug,
          issue: 'KPI could not be computed',
          severity: 'critical',
        })
        criticalCount++
        continue
      }

      // Determine status based on thresholds
      let status: 'ok' | 'warning' | 'critical' = 'ok'
      let reason: string | undefined
      let thresholdBreached: string | undefined

      const value = kpiValue.value
      const target = kpiValue.target
      const formattedValue = formatKPIValue(value, kpiDef.format)
      const formattedTarget = target !== undefined ? formatKPIValue(target, kpiDef.format) : undefined

      // Check if value is within acceptable range
      if (kpiDef.warningThreshold !== undefined && kpiDef.criticalThreshold !== undefined) {
        const warningThreshold = kpiDef.warningThreshold
        const criticalThreshold = kpiDef.criticalThreshold

        if (kpiDef.higherIsBetter) {
          // Higher is better (e.g., revenue, win rate)
          if (value < criticalThreshold) {
            status = 'critical'
            reason = `${kpiDef.name}: ${formattedValue} is ${((criticalThreshold - value) / criticalThreshold * 100).toFixed(1)}% below critical threshold (${formatKPIValue(criticalThreshold, kpiDef.format)})`
            thresholdBreached = `Critical: ${formatKPIValue(criticalThreshold, kpiDef.format)}`
          } else if (value < warningThreshold) {
            status = 'warning'
            reason = `${kpiDef.name}: ${formattedValue} is ${((warningThreshold - value) / warningThreshold * 100).toFixed(1)}% below warning threshold (${formatKPIValue(warningThreshold, kpiDef.format)})`
            thresholdBreached = `Warning: ${formatKPIValue(warningThreshold, kpiDef.format)}`
          }
        } else {
          // Lower is better (e.g., callback rate, DSO)
          if (value > criticalThreshold) {
            status = 'critical'
            reason = `${kpiDef.name}: ${formattedValue} is ${((value - criticalThreshold) / criticalThreshold * 100).toFixed(1)}% above critical threshold (${formatKPIValue(criticalThreshold, kpiDef.format)})`
            thresholdBreached = `Critical: ${formatKPIValue(criticalThreshold, kpiDef.format)}`
          } else if (value > warningThreshold) {
            status = 'warning'
            reason = `${kpiDef.name}: ${formattedValue} is ${((value - warningThreshold) / warningThreshold * 100).toFixed(1)}% above warning threshold (${formatKPIValue(warningThreshold, kpiDef.format)})`
            thresholdBreached = `Warning: ${formatKPIValue(warningThreshold, kpiDef.format)}`
          }
        }
      }

      // Track variance if target exists
      let variancePct: number | undefined
      let varianceStr: string | undefined
      if (target && target !== 0) {
        variancePct = ((value - target) / Math.abs(target)) * 100
        varianceStr = `${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}% vs target`
      }

      // Get root cause analysis for non-ok KPIs
      let rootCause: string | undefined
      let recommendedAction: string | undefined

      if (status !== 'ok') {
        const analysis = getRootCauseAnalysis(slug)
        rootCause = analysis.cause
        recommendedAction = analysis.action

        // Add to diagnostics
        diagnostics.push({
          slug,
          name: kpiDef.name,
          status,
          current_value: formattedValue,
          target_value: formattedTarget || 'N/A',
          variance: varianceStr || 'N/A',
          threshold_breached: thresholdBreached || 'N/A',
          root_cause: rootCause,
          recommended_action: recommendedAction,
          urgency: status === 'critical' ? 'immediate' : 'today',
        })
      }

      // Update counters
      if (status === 'critical') {
        criticalCount++
        anomalies.push({
          slug,
          issue: reason || 'Critical threshold breached',
          severity: 'critical',
        })
      } else if (status === 'warning') {
        warningCount++
        anomalies.push({
          slug,
          issue: reason || 'Warning threshold breached',
          severity: 'warning',
        })
      } else {
        okCount++
      }

      kpis.push({
        slug,
        name: kpiDef.name,
        status,
        value,
        formatted_value: formattedValue,
        target,
        formatted_target: formattedTarget,
        variance_pct: variancePct,
        threshold_warning: kpiDef.warningThreshold,
        threshold_critical: kpiDef.criticalThreshold,
        reason,
        root_cause: rootCause,
        recommended_action: recommendedAction,
        computed_at: now,
      })
    }

    // Process remaining KPIs
    for (const [slug, kpiValue] of kpiValues) {
      if (TOP_10_KPIS.includes(slug)) continue // Already processed

      const kpiDef = KPI_DICTIONARY.find(k => k.slug === slug)
      if (!kpiDef) continue

      kpis.push({
        slug,
        name: kpiDef.name,
        status: 'ok', // Non-priority KPIs are marked ok if computed
        value: kpiValue.value,
        formatted_value: formatKPIValue(kpiValue.value, kpiDef.format),
        target: kpiValue.target,
        formatted_target: kpiValue.target !== undefined ? formatKPIValue(kpiValue.target, kpiDef.format) : undefined,
        computed_at: now,
      })
      okCount++
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (criticalCount > 0) {
      overallStatus = 'unhealthy'
    } else if (warningCount > 0) {
      overallStatus = 'degraded'
    }

    // Build human-readable alert summary
    let alertSummary = ''
    if (criticalCount > 0 || warningCount > 0) {
      const criticalItems = diagnostics.filter(d => d.status === 'critical')
      const warningItems = diagnostics.filter(d => d.status === 'warning')

      alertSummary = `KPI HEALTH ALERT - ${criticalCount} Critical, ${warningCount} Warning\n\n`

      if (criticalItems.length > 0) {
        alertSummary += `CRITICAL (Immediate Action Required):\n`
        for (const item of criticalItems) {
          alertSummary += `• ${item.name}: ${item.current_value} (target: ${item.target_value})\n`
          alertSummary += `  └ Cause: ${item.root_cause}\n`
          alertSummary += `  └ Action: ${item.recommended_action}\n`
        }
        alertSummary += '\n'
      }

      if (warningItems.length > 0) {
        alertSummary += `WARNING (Address Today):\n`
        for (const item of warningItems) {
          alertSummary += `• ${item.name}: ${item.current_value} (target: ${item.target_value})\n`
          alertSummary += `  └ Cause: ${item.root_cause}\n`
          alertSummary += `  └ Action: ${item.recommended_action}\n`
        }
      }
    } else {
      alertSummary = `All ${okCount} KPIs healthy. No action required.`
    }

    const response: KPIHealthResponse = {
      status: overallStatus,
      timestamp: now,
      kpis,
      summary: {
        total: kpis.length,
        ok: okCount,
        warning: warningCount,
        critical: criticalCount,
      },
      anomalies,
      diagnostics,
      alert_summary: alertSummary,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[KPI Health] Error:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: now,
        kpis: [],
        summary: {
          total: 0,
          ok: 0,
          warning: 0,
          critical: 0,
        },
        anomalies: [
          {
            slug: 'system',
            issue: error instanceof Error ? error.message : 'KPI calculation system error',
            severity: 'critical',
          },
        ],
        diagnostics: [{
          slug: 'system',
          name: 'System Error',
          status: 'critical',
          current_value: 'N/A',
          target_value: 'N/A',
          variance: 'N/A',
          threshold_breached: 'N/A',
          root_cause: error instanceof Error ? error.message : 'Unknown system error',
          recommended_action: 'Check server logs and restart if necessary',
          urgency: 'immediate',
        }],
        alert_summary: `SYSTEM ERROR: KPI calculation failed - ${error instanceof Error ? error.message : 'Unknown error'}. Check server logs immediately.`,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
  }
}
