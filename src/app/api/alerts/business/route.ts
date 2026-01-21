import { NextResponse } from 'next/server'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { KPI_DICTIONARY } from '@/lib/kpis'

interface AlertRule {
  id: string
  rule_name: string
  kpi_slug: string
  condition: string
  threshold_value: number | null
  threshold_percent: number | null
  severity: 'critical' | 'high' | 'medium' | 'low'
  notify_roles: string[]
  cooldown_minutes: number
  last_triggered_at: string | null
}

interface BusinessAlert {
  rule_id: string
  rule_name: string
  kpi_slug: string
  kpi_name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  current_value: number
  target_value: number | null
  threshold: number
  variance_pct: number | null
  message: string
  recommended_action: string
  notify_roles: string[]
  triggered_at: string
}

interface BusinessAlertsResponse {
  status: 'ok' | 'alerts_detected'
  timestamp: string
  alerts: BusinessAlert[]
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
  kpis_checked: number
  rules_evaluated: number
}

// Default business alert rules (used when Supabase is not available)
const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: '1',
    rule_name: 'Revenue MTD Critical',
    kpi_slug: 'revenue_mtd',
    condition: 'below_target',
    threshold_value: null,
    threshold_percent: -10,
    severity: 'critical',
    notify_roles: ['exec', 'sales_manager'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '2',
    rule_name: 'Revenue MTD Warning',
    kpi_slug: 'revenue_mtd',
    condition: 'below_target',
    threshold_value: null,
    threshold_percent: -5,
    severity: 'high',
    notify_roles: ['exec', 'sales_manager'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '3',
    rule_name: 'Variance Critical',
    kpi_slug: 'variance_to_target_mtd',
    condition: 'below_threshold',
    threshold_value: null,
    threshold_percent: -10,
    severity: 'critical',
    notify_roles: ['exec'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '4',
    rule_name: 'Win Rate Declining',
    kpi_slug: 'win_rate',
    condition: 'below_threshold',
    threshold_value: 0.28,
    threshold_percent: null,
    severity: 'high',
    notify_roles: ['exec', 'sales_manager'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '5',
    rule_name: 'Service Risk Critical',
    kpi_slug: 'service_risk_index',
    condition: 'below_threshold',
    threshold_value: 70,
    threshold_percent: null,
    severity: 'critical',
    notify_roles: ['exec', 'ops_manager'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '6',
    rule_name: 'Callback Rate High',
    kpi_slug: 'callback_rate',
    condition: 'above_threshold',
    threshold_value: 0.10,
    threshold_percent: null,
    severity: 'high',
    notify_roles: ['ops_manager'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '7',
    rule_name: 'DSO High',
    kpi_slug: 'dso',
    condition: 'above_threshold',
    threshold_value: 50,
    threshold_percent: null,
    severity: 'high',
    notify_roles: ['exec'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '8',
    rule_name: 'Capacity Low',
    kpi_slug: 'capacity_utilization',
    condition: 'below_threshold',
    threshold_value: 0.65,
    threshold_percent: null,
    severity: 'high',
    notify_roles: ['ops_manager'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '9',
    rule_name: 'CRM Hygiene Low',
    kpi_slug: 'crm_hygiene_score',
    condition: 'below_threshold',
    threshold_value: 70,
    threshold_percent: null,
    severity: 'medium',
    notify_roles: ['sales_manager'],
    cooldown_minutes: 60,
    last_triggered_at: null
  },
  {
    id: '10',
    rule_name: 'NRR Warning',
    kpi_slug: 'nrr',
    condition: 'below_threshold',
    threshold_value: 0.98,
    threshold_percent: null,
    severity: 'high',
    notify_roles: ['exec'],
    cooldown_minutes: 60,
    last_triggered_at: null
  }
]

// Get recommended action based on KPI and severity
function getRecommendedAction(kpiSlug: string, severity: string): string {
  const actions: Record<string, string> = {
    revenue_mtd: 'Review pipeline and accelerate deals in late stages. Consider promotional offers for quick closes.',
    variance_to_target_mtd: 'Analyze revenue drivers and identify gaps. Schedule pipeline review with sales leaders.',
    win_rate: 'Review lost deals for patterns. Consider sales training or competitive positioning updates.',
    service_risk_index: 'Identify at-risk accounts and prioritize retention outreach. Review service quality metrics.',
    callback_rate: 'Analyze callback root causes by technician and service type. Schedule quality review.',
    dso: 'Review aging AR by customer. Accelerate collections on 60+ day accounts.',
    capacity_utilization: 'Review route optimization. Consider temporary staffing or overtime approval.',
    crm_hygiene_score: 'Run CRM cleanup campaign. Require activity updates before pipeline meetings.',
    nrr: 'Focus on retention and expansion. Review churned accounts for win-back opportunities.'
  }

  const defaultAction = 'Review KPI details and identify root cause. Escalate if trend continues.'
  return actions[kpiSlug] || defaultAction
}

// Evaluate a rule against KPI values
function evaluateRule(
  rule: AlertRule,
  kpiValue: number,
  kpiTarget: number | undefined
): { triggered: boolean; message: string; threshold: number } {
  const { condition, threshold_value, threshold_percent } = rule

  switch (condition) {
    case 'below_target': {
      if (kpiTarget === undefined || kpiTarget === 0) {
        return { triggered: false, message: '', threshold: 0 }
      }
      const variancePct = ((kpiValue - kpiTarget) / Math.abs(kpiTarget)) * 100
      const thresholdPct = threshold_percent || 0
      if (variancePct < thresholdPct) {
        return {
          triggered: true,
          message: `Value is ${variancePct.toFixed(1)}% below target (threshold: ${thresholdPct}%)`,
          threshold: thresholdPct
        }
      }
      break
    }

    case 'above_target': {
      if (kpiTarget === undefined || kpiTarget === 0) {
        return { triggered: false, message: '', threshold: 0 }
      }
      const variancePct = ((kpiValue - kpiTarget) / Math.abs(kpiTarget)) * 100
      const thresholdPct = threshold_percent || 0
      if (variancePct > thresholdPct) {
        return {
          triggered: true,
          message: `Value is ${variancePct.toFixed(1)}% above target (threshold: ${thresholdPct}%)`,
          threshold: thresholdPct
        }
      }
      break
    }

    case 'below_threshold': {
      const threshold = threshold_value ?? threshold_percent ?? 0
      if (kpiValue < threshold) {
        return {
          triggered: true,
          message: `Value ${kpiValue.toFixed(2)} is below threshold ${threshold}`,
          threshold
        }
      }
      break
    }

    case 'above_threshold': {
      const threshold = threshold_value ?? threshold_percent ?? 0
      if (kpiValue > threshold) {
        return {
          triggered: true,
          message: `Value ${kpiValue.toFixed(2)} is above threshold ${threshold}`,
          threshold
        }
      }
      break
    }

    case 'variance_exceeds': {
      if (kpiTarget === undefined || kpiTarget === 0) {
        return { triggered: false, message: '', threshold: 0 }
      }
      const variancePct = Math.abs(((kpiValue - kpiTarget) / kpiTarget) * 100)
      const thresholdPct = threshold_percent || 0
      if (variancePct > Math.abs(thresholdPct)) {
        return {
          triggered: true,
          message: `Variance ${variancePct.toFixed(1)}% exceeds threshold ${thresholdPct}%`,
          threshold: thresholdPct
        }
      }
      break
    }
  }

  return { triggered: false, message: '', threshold: 0 }
}

/**
 * GET /api/alerts/business
 * Business alerts endpoint for Bailey agent
 *
 * Checks KPI values against business rules and returns triggered alerts
 */
export async function GET(): Promise<NextResponse<BusinessAlertsResponse>> {
  const now = new Date().toISOString()

  try {
    // Calculate all KPIs as executive (full access)
    const kpiValues = calculateKPIValues('exec', undefined)

    // Use default rules (in production, would fetch from Supabase)
    const rules = DEFAULT_ALERT_RULES

    const alerts: BusinessAlert[] = []
    let criticalCount = 0
    let highCount = 0
    let mediumCount = 0
    let lowCount = 0

    // Evaluate each rule
    for (const rule of rules) {
      const kpiValue = kpiValues.get(rule.kpi_slug)
      const kpiDef = KPI_DICTIONARY.find(k => k.slug === rule.kpi_slug)

      if (!kpiValue || !kpiDef) {
        continue // Skip if KPI not found
      }

      const { triggered, message, threshold } = evaluateRule(
        rule,
        kpiValue.value,
        kpiValue.target
      )

      if (triggered) {
        // Check cooldown (skip if triggered recently)
        if (rule.last_triggered_at) {
          const lastTriggered = new Date(rule.last_triggered_at)
          const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldown_minutes * 60 * 1000)
          if (new Date() < cooldownEnd) {
            continue // Still in cooldown
          }
        }

        // Calculate variance if target exists
        let variancePct: number | null = null
        if (kpiValue.target && kpiValue.target !== 0) {
          variancePct = ((kpiValue.value - kpiValue.target) / Math.abs(kpiValue.target)) * 100
        }

        const alert: BusinessAlert = {
          rule_id: rule.id,
          rule_name: rule.rule_name,
          kpi_slug: rule.kpi_slug,
          kpi_name: kpiDef.name,
          severity: rule.severity,
          current_value: kpiValue.value,
          target_value: kpiValue.target ?? null,
          threshold,
          variance_pct: variancePct,
          message,
          recommended_action: getRecommendedAction(rule.kpi_slug, rule.severity),
          notify_roles: rule.notify_roles,
          triggered_at: now
        }

        alerts.push(alert)

        // Update counts
        switch (rule.severity) {
          case 'critical':
            criticalCount++
            break
          case 'high':
            highCount++
            break
          case 'medium':
            mediumCount++
            break
          case 'low':
            lowCount++
            break
        }
      }
    }

    // Sort alerts by severity (critical first)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    const response: BusinessAlertsResponse = {
      status: alerts.length > 0 ? 'alerts_detected' : 'ok',
      timestamp: now,
      alerts,
      summary: {
        total: alerts.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount
      },
      kpis_checked: kpiValues.size,
      rules_evaluated: rules.length
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('[Business Alerts] Error:', error)

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: now,
        alerts: [],
        summary: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        kpis_checked: 0,
        rules_evaluated: 0
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )
  }
}
