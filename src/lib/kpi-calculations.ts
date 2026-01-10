import {
  KPIValue, ReconciliationItem, ActionItem, VarianceDriver,
  ForecastPoint, ForecastAssumption, BacktestResult, Scenario
} from '@/types'
import { getKPIBySlug } from './kpis'
import {
  getInvoices, getOpportunities, getServiceEvents, getComplaints,
  getAccounts, getTechnicianCapacity, getActivities
} from './data'
import { safeDivide, safeDeltaPercent, clampValue, isValidNumber } from './utils'

// Helper to generate trend data
function generateTrend(baseValue: number, volatility: number = 0.1, points: number = 12): number[] {
  const trend: number[] = []
  // Ensure baseValue is valid
  const safeBase = isValidNumber(baseValue) ? baseValue : 0
  let value = safeBase * (0.9 + Math.random() * 0.2)
  for (let i = 0; i < points; i++) {
    value = value * (1 + (Math.random() - 0.5) * volatility)
    trend.push(Math.round(value * 100) / 100)
  }
  return trend
}

// Calculate all KPI values
export function calculateKPIValues(): Map<string, KPIValue> {
  const kpiValues = new Map<string, KPIValue>()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const invoices = getInvoices()
  const opportunities = getOpportunities()
  const serviceEvents = getServiceEvents()
  const complaints = getComplaints()
  const accounts = getAccounts()
  const capacity = getTechnicianCapacity()
  const activities = getActivities()

  // 1. Revenue MTD
  const paidInvoicesMTD = invoices.filter(i =>
    i.status === 'paid' &&
    i.invoiceDate >= monthStart
  )
  const revenueMTD = paidInvoicesMTD.reduce((sum, i) => sum + i.amount, 0)
  const prevMonthRevenue = revenueMTD * (0.9 + Math.random() * 0.2)
  const revenueDef = getKPIBySlug('revenue_mtd')!

  kpiValues.set('revenue_mtd', {
    slug: 'revenue_mtd',
    value: revenueMTD,
    previousValue: prevMonthRevenue,
    delta: revenueMTD - prevMonthRevenue,
    deltaPercent: safeDeltaPercent(revenueMTD, prevMonthRevenue, 0),
    target: revenueMTD * 1.05,
    status: revenueMTD > prevMonthRevenue ? 'good' : 'warning',
    trend: generateTrend(safeDivide(revenueMTD, 20, 10000), 0.15),
    asOfDate: now,
  })

  // 2. Pipeline 30/60/90
  const openOpps = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
  const pipeline30 = openOpps.filter(o => {
    const daysToClose = Math.floor((o.closeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return daysToClose >= 0 && daysToClose <= 30
  }).reduce((sum, o) => sum + o.amount * o.probability, 0)

  const pipeline60 = openOpps.filter(o => {
    const daysToClose = Math.floor((o.closeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return daysToClose > 30 && daysToClose <= 60
  }).reduce((sum, o) => sum + o.amount * o.probability, 0)

  const pipeline90 = openOpps.filter(o => {
    const daysToClose = Math.floor((o.closeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return daysToClose > 60 && daysToClose <= 90
  }).reduce((sum, o) => sum + o.amount * o.probability, 0)

  const totalPipeline = pipeline30 + pipeline60 + pipeline90
  const prevPipeline = totalPipeline * 0.95

  kpiValues.set('pipeline_30_60_90', {
    slug: 'pipeline_30_60_90',
    value: totalPipeline,
    previousValue: prevPipeline,
    delta: totalPipeline - prevPipeline,
    deltaPercent: safeDeltaPercent(totalPipeline, prevPipeline, 0),
    status: totalPipeline > prevPipeline ? 'good' : 'warning',
    trend: generateTrend(totalPipeline, 0.12),
    asOfDate: now,
  })

  // 3. Win Rate
  const closedOpps = opportunities.filter(o => ['closed_won', 'closed_lost'].includes(o.stage))
  const wonOpps = closedOpps.filter(o => o.stage === 'closed_won')
  const winRate = safeDivide(wonOpps.length, closedOpps.length, 0)
  const prevWinRate = winRate * (0.9 + Math.random() * 0.2) || 0.25 // Fallback for zero
  const winRateDef = getKPIBySlug('win_rate')!

  kpiValues.set('win_rate', {
    slug: 'win_rate',
    value: winRate,
    previousValue: prevWinRate,
    delta: winRate - prevWinRate,
    deltaPercent: safeDeltaPercent(winRate, prevWinRate, 0),
    target: winRateDef.target,
    status: winRate >= (winRateDef.target || 0.35) ? 'good' :
            winRate >= (winRateDef.warningThreshold || 0.28) ? 'warning' : 'critical',
    trend: generateTrend(winRate || 0.3, 0.08),
    asOfDate: now,
  })

  // 4. Avg Cycle Time Days
  const wonOppsWithDates = wonOpps.filter(o => o.createdDate && o.closeDate)
  const totalCycleTime = wonOppsWithDates.reduce((sum, o) =>
    sum + Math.floor((o.closeDate.getTime() - o.createdDate.getTime()) / (24 * 60 * 60 * 1000)), 0)
  const avgCycleTime = safeDivide(totalCycleTime, wonOppsWithDates.length, 45)
  const prevCycleTime = avgCycleTime * (0.95 + Math.random() * 0.1)
  const cycleDef = getKPIBySlug('avg_cycle_time_days')!

  kpiValues.set('avg_cycle_time_days', {
    slug: 'avg_cycle_time_days',
    value: avgCycleTime,
    previousValue: prevCycleTime,
    delta: avgCycleTime - prevCycleTime,
    deltaPercent: safeDeltaPercent(avgCycleTime, prevCycleTime, 0),
    target: cycleDef.target,
    status: avgCycleTime <= (cycleDef.target || 45) ? 'good' :
            avgCycleTime <= (cycleDef.warningThreshold || 60) ? 'warning' : 'critical',
    trend: generateTrend(avgCycleTime, 0.1),
    asOfDate: now,
  })

  // 5. Forecast Revenue 8W
  const baselineRecurring = revenueMTD * 2
  const pipelineConversion = totalPipeline * 0.3
  const forecast8w = baselineRecurring + pipelineConversion
  const prevForecast = forecast8w * 0.98

  kpiValues.set('forecast_revenue_8w', {
    slug: 'forecast_revenue_8w',
    value: forecast8w,
    previousValue: prevForecast,
    delta: forecast8w - prevForecast,
    deltaPercent: safeDeltaPercent(forecast8w, prevForecast, 0),
    status: forecast8w > prevForecast ? 'good' : 'warning',
    trend: generateTrend(safeDivide(forecast8w, 8, 50000), 0.1),
    asOfDate: now,
  })

  // 6. Variance to Target MTD
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const monthlyTarget = revenueMTD * 1.05
  const proratedTarget = monthlyTarget * safeDivide(dayOfMonth, daysInMonth, 1)
  const variance = safeDivide(revenueMTD - proratedTarget, proratedTarget, 0)
  const prevVariance = variance * (0.8 + Math.random() * 0.4)
  const varianceDef = getKPIBySlug('variance_to_target_mtd')!

  kpiValues.set('variance_to_target_mtd', {
    slug: 'variance_to_target_mtd',
    value: variance,
    previousValue: prevVariance,
    delta: variance - prevVariance,
    deltaPercent: variance - prevVariance, // For variance, delta is already a percent
    target: 0,
    status: variance >= 0 ? 'good' :
            variance >= (varianceDef.warningThreshold || -0.05) ? 'warning' : 'critical',
    trend: generateTrend(variance || 0, 0.5),
    asOfDate: now,
  })

  // 7. Service Risk Index
  // Formula: 100 - (callback_rate * 25 + missed_rate * 30 + complaint_rate * 25 + response_time_penalty * 20)
  // All rates are already decimals (0-1), so we multiply by 100 to convert to percentage points for the deduction
  const completedServices = serviceEvents.filter(s => s.status === 'completed')
  const callbacks = serviceEvents.filter(s => s.status === 'callback')
  const missedServices = serviceEvents.filter(s => s.status === 'missed')

  // Calculate rates as decimals (0-1 scale)
  const callbackRate = safeDivide(callbacks.length, completedServices.length, 0)
  const missedRate = safeDivide(missedServices.length, serviceEvents.length, 0)
  // Complaint rate per 1000 services, then normalize to 0-1 scale (max 20 per 1000 = 2%)
  const complaintRatePer1000 = safeDivide(complaints.length, serviceEvents.length, 0) * 1000
  const normalizedComplaintRate = Math.min(complaintRatePer1000, 20) / 20 // 0-1 scale

  // Service Risk Index: Higher is better (0-100 scale)
  // Deduct points based on each factor:
  // - Callback rate: 25 points max (if callbackRate = 100%)
  // - Missed rate: 30 points max (if missedRate = 100%)
  // - Complaint rate: 25 points max (normalized)
  // - Base score starts at 100 with a built-in buffer of 20 points for typical operations
  const callbackDeduction = callbackRate * 25  // 0-25 points
  const missedDeduction = missedRate * 30      // 0-30 points
  const complaintDeduction = normalizedComplaintRate * 25  // 0-25 points

  const serviceRiskIndex = clampValue(100 - (callbackDeduction + missedDeduction + complaintDeduction), 0, 100)
  const prevServiceRisk = clampValue(serviceRiskIndex * (0.95 + Math.random() * 0.1), 0, 100)
  const serviceRiskDef = getKPIBySlug('service_risk_index')!

  kpiValues.set('service_risk_index', {
    slug: 'service_risk_index',
    value: serviceRiskIndex,
    previousValue: prevServiceRisk,
    delta: serviceRiskIndex - prevServiceRisk,
    deltaPercent: safeDeltaPercent(serviceRiskIndex, prevServiceRisk, 0),
    target: serviceRiskDef.target,
    status: serviceRiskIndex >= (serviceRiskDef.target || 85) ? 'good' :
            serviceRiskIndex >= (serviceRiskDef.warningThreshold || 75) ? 'warning' : 'critical',
    trend: generateTrend(serviceRiskIndex || 80, 0.05),
    asOfDate: now,
  })

  // 8. Callback Rate
  const callbackRateValue = callbackRate
  const prevCallbackRate = callbackRateValue * (0.9 + Math.random() * 0.2) || 0.03 // Fallback
  const callbackDef = getKPIBySlug('callback_rate')!

  kpiValues.set('callback_rate', {
    slug: 'callback_rate',
    value: callbackRateValue,
    previousValue: prevCallbackRate,
    delta: callbackRateValue - prevCallbackRate,
    deltaPercent: safeDeltaPercent(callbackRateValue, prevCallbackRate, 0),
    target: callbackDef.target,
    status: callbackRateValue <= (callbackDef.target || 0.05) ? 'good' :
            callbackRateValue <= (callbackDef.warningThreshold || 0.08) ? 'warning' : 'critical',
    trend: generateTrend(callbackRateValue || 0.05, 0.15),
    asOfDate: now,
  })

  // 9. Missed Service Rate
  const missedRateDef = getKPIBySlug('missed_service_rate')!
  const prevMissedRate = missedRate * (0.9 + Math.random() * 0.2) || 0.02 // Fallback

  kpiValues.set('missed_service_rate', {
    slug: 'missed_service_rate',
    value: missedRate,
    previousValue: prevMissedRate,
    delta: missedRate - prevMissedRate,
    deltaPercent: safeDeltaPercent(missedRate, prevMissedRate, 0),
    target: missedRateDef.target,
    status: missedRate <= (missedRateDef.target || 0.02) ? 'good' :
            missedRate <= (missedRateDef.warningThreshold || 0.04) ? 'warning' : 'critical',
    trend: generateTrend(missedRate || 0.02, 0.2),
    asOfDate: now,
  })

  // 10. Avg Response Time Hours
  const avgResponseTime = 18 + Math.random() * 20
  const prevResponseTime = avgResponseTime * (0.9 + Math.random() * 0.2)
  const responseDef = getKPIBySlug('avg_response_time_hours')!

  kpiValues.set('avg_response_time_hours', {
    slug: 'avg_response_time_hours',
    value: avgResponseTime,
    previousValue: prevResponseTime,
    delta: avgResponseTime - prevResponseTime,
    deltaPercent: safeDeltaPercent(avgResponseTime, prevResponseTime, 0),
    target: responseDef.target,
    status: avgResponseTime <= (responseDef.target || 24) ? 'good' :
            avgResponseTime <= (responseDef.warningThreshold || 36) ? 'warning' : 'critical',
    trend: generateTrend(avgResponseTime, 0.12),
    asOfDate: now,
  })

  // 11. AR Aging
  const openInvoices = invoices.filter(i => ['open', 'overdue', 'disputed'].includes(i.status))
  const arTotal = openInvoices.reduce((sum, i) => sum + i.amount, 0)
  const prevAR = arTotal * (0.95 + Math.random() * 0.1) || 100000 // Fallback

  kpiValues.set('ar_aging', {
    slug: 'ar_aging',
    value: arTotal,
    previousValue: prevAR,
    delta: arTotal - prevAR,
    deltaPercent: safeDeltaPercent(arTotal, prevAR, 0),
    status: arTotal < prevAR ? 'good' : 'warning',
    trend: generateTrend(arTotal || 100000, 0.1),
    asOfDate: now,
  })

  // 12. DSO
  const last30Revenue = revenueMTD * 1.1
  const dso = safeDivide(arTotal, last30Revenue, 0) * 30 || 40
  const prevDSO = dso * (0.95 + Math.random() * 0.1)
  const dsoDef = getKPIBySlug('dso')!

  kpiValues.set('dso', {
    slug: 'dso',
    value: dso,
    previousValue: prevDSO,
    delta: dso - prevDSO,
    deltaPercent: safeDeltaPercent(dso, prevDSO, 0),
    target: dsoDef.target,
    status: dso <= (dsoDef.target || 35) ? 'good' :
            dso <= (dsoDef.warningThreshold || 45) ? 'warning' : 'critical',
    trend: generateTrend(dso, 0.08),
    asOfDate: now,
  })

  // 13. Capacity Utilization
  const recentCapacity = capacity.filter(c => c.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const totalUtilization = recentCapacity.reduce((sum, c) => sum + c.utilization, 0)
  const avgUtilization = safeDivide(totalUtilization, recentCapacity.length, 0.78)
  const prevUtilization = avgUtilization * (0.95 + Math.random() * 0.1)
  const capacityDef = getKPIBySlug('capacity_utilization')!

  kpiValues.set('capacity_utilization', {
    slug: 'capacity_utilization',
    value: clampValue(avgUtilization, 0, 1),
    previousValue: prevUtilization,
    delta: avgUtilization - prevUtilization,
    deltaPercent: safeDeltaPercent(avgUtilization, prevUtilization, 0),
    target: capacityDef.target,
    status: avgUtilization >= (capacityDef.target || 0.85) ? 'good' :
            avgUtilization >= (capacityDef.warningThreshold || 0.70) ? 'warning' : 'critical',
    trend: generateTrend(avgUtilization || 0.8, 0.08),
    asOfDate: now,
  })

  // 14. Scheduling Pressure Index
  const overUtilized = recentCapacity.filter(c => c.utilization > 1).length
  // Calculate pressure: base 20 + up to 60 based on overutilization ratio
  const overUtilizationRatio = safeDivide(overUtilized, recentCapacity.length, 0)
  const schedulingPressure = clampValue(20 + overUtilizationRatio * 60, 0, 100)
  const prevPressure = schedulingPressure * (0.9 + Math.random() * 0.2)
  const pressureDef = getKPIBySlug('scheduling_pressure_index')!

  kpiValues.set('scheduling_pressure_index', {
    slug: 'scheduling_pressure_index',
    value: schedulingPressure,
    previousValue: prevPressure,
    delta: schedulingPressure - prevPressure,
    deltaPercent: safeDeltaPercent(schedulingPressure, prevPressure, 0),
    target: pressureDef.target,
    status: schedulingPressure <= (pressureDef.target || 30) ? 'good' :
            schedulingPressure <= (pressureDef.warningThreshold || 50) ? 'warning' : 'critical',
    trend: generateTrend(schedulingPressure || 30, 0.15),
    asOfDate: now,
  })

  // 15. CRM Hygiene Score (0-100 scale)
  // Score formula: (complete_fields_pct * 40 + recent_activity_pct * 30 + valid_stage_pct * 30)
  // Each component is weighted to sum to 100 max
  const oppsWithNextStep = openOpps.filter(o => o.nextStepDate !== null).length
  const recentActivityOpps = openOpps.filter(o => {
    const oppActivities = activities.filter(a => a.opportunityId === o.id)
    return oppActivities.some(a => a.timestamp > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
  }).length

  // Calculate percentages as decimals (0-1)
  const completeFieldsPct = safeDivide(oppsWithNextStep, openOpps.length, 0.7)
  const recentActivityPct = safeDivide(recentActivityOpps, openOpps.length, 0.7)
  const validStagePct = 0.8 // Assume 80% have valid stages

  // CRM Hygiene Score: 0-100 scale
  // Each component contributes its weighted percentage to the total
  const crmHygieneScore = clampValue(
    (completeFieldsPct * 40) + (recentActivityPct * 30) + (validStagePct * 30),
    0,
    100
  )
  const prevHygiene = clampValue(crmHygieneScore * (0.95 + Math.random() * 0.1), 0, 100)
  const hygieneDef = getKPIBySlug('crm_hygiene_score')!

  kpiValues.set('crm_hygiene_score', {
    slug: 'crm_hygiene_score',
    value: crmHygieneScore, // Already 0-100
    previousValue: prevHygiene,
    delta: crmHygieneScore - prevHygiene,
    deltaPercent: safeDeltaPercent(crmHygieneScore, prevHygiene, 0),
    target: hygieneDef.target,
    status: crmHygieneScore >= (hygieneDef.target || 90) ? 'good' :
            crmHygieneScore >= (hygieneDef.warningThreshold || 75) ? 'warning' : 'critical',
    trend: generateTrend(crmHygieneScore || 75, 0.05),
    asOfDate: now,
  })

  // 16. Stalled Opportunities
  const stalledOpps = openOpps.filter(o => o.isStalled)
  const stalledValue = stalledOpps.reduce((sum, o) => sum + o.amount, 0)
  const prevStalled = stalledValue * (0.9 + Math.random() * 0.2) || 50000 // Fallback

  kpiValues.set('stalled_opps', {
    slug: 'stalled_opps',
    value: stalledValue,
    previousValue: prevStalled,
    delta: stalledValue - prevStalled,
    deltaPercent: safeDeltaPercent(stalledValue, prevStalled, 0),
    status: 'critical', // Stalled pipeline is always critical - needs immediate attention
    trend: generateTrend(stalledValue || 50000, 0.2),
    asOfDate: now,
  })

  // 17. Retention Risk
  const highRiskAccounts = accounts.filter(a => a.retentionRisk === 'high')
  const retentionRiskValue = highRiskAccounts.reduce((sum, a) => sum + a.contractValue, 0)
  const prevRetentionRisk = retentionRiskValue * (0.95 + Math.random() * 0.1) || 100000 // Fallback

  kpiValues.set('retention_risk', {
    slug: 'retention_risk',
    value: retentionRiskValue,
    previousValue: prevRetentionRisk,
    delta: retentionRiskValue - prevRetentionRisk,
    deltaPercent: safeDeltaPercent(retentionRiskValue, prevRetentionRisk, 0),
    status: retentionRiskValue < prevRetentionRisk ? 'good' : 'critical',
    trend: generateTrend(retentionRiskValue || 100000, 0.12),
    asOfDate: now,
  })

  // 18. Complaint Rate (per 1000 services)
  const complaintRateForDisplay = complaintRatePer1000
  const prevComplaintRateDisplay = complaintRateForDisplay * (0.9 + Math.random() * 0.2) || 5 // Fallback
  const complaintDef = getKPIBySlug('complaint_rate')!

  kpiValues.set('complaint_rate', {
    slug: 'complaint_rate',
    value: complaintRateForDisplay,
    previousValue: prevComplaintRateDisplay,
    delta: complaintRateForDisplay - prevComplaintRateDisplay,
    deltaPercent: safeDeltaPercent(complaintRateForDisplay, prevComplaintRateDisplay, 0),
    target: complaintDef.target,
    status: complaintRateForDisplay <= (complaintDef.target || 5) ? 'good' :
            complaintRateForDisplay <= (complaintDef.warningThreshold || 8) ? 'warning' : 'critical',
    trend: generateTrend(complaintRateForDisplay || 5, 0.15),
    asOfDate: now,
  })

  // 19. NRR (Net Revenue Retention - decimal like 1.05 = 105%)
  const nrr = 1.02 + Math.random() * 0.06
  const prevNRR = nrr * (0.98 + Math.random() * 0.04)
  const nrrDef = getKPIBySlug('nrr')!

  kpiValues.set('nrr', {
    slug: 'nrr',
    value: nrr,
    previousValue: prevNRR,
    delta: nrr - prevNRR,
    deltaPercent: safeDeltaPercent(nrr, prevNRR, 0),
    target: nrrDef.target,
    status: nrr >= (nrrDef.target || 1.05) ? 'good' :
            nrr >= (nrrDef.warningThreshold || 0.98) ? 'warning' : 'critical',
    trend: generateTrend(nrr, 0.03),
    asOfDate: now,
  })

  // 20. Margin Proxy (decimal like 0.45 = 45%)
  const marginProxy = 0.38 + Math.random() * 0.1
  const prevMargin = marginProxy * (0.98 + Math.random() * 0.04)
  const marginDef = getKPIBySlug('margin_proxy')!

  kpiValues.set('margin_proxy', {
    slug: 'margin_proxy',
    value: marginProxy,
    previousValue: prevMargin,
    delta: marginProxy - prevMargin,
    deltaPercent: safeDeltaPercent(marginProxy, prevMargin, 0),
    target: marginDef.target,
    status: marginProxy >= (marginDef.target || 0.45) ? 'good' :
            marginProxy >= (marginDef.warningThreshold || 0.38) ? 'warning' : 'critical',
    trend: generateTrend(marginProxy, 0.05),
    asOfDate: now,
  })

  return kpiValues
}

// Get reconciliation data for a KPI
export function getReconciliation(kpiSlug: string): ReconciliationItem {
  const kpiValues = calculateKPIValues()
  const kpiValue = kpiValues.get(kpiSlug)

  if (!kpiValue) {
    return {
      kpiSlug,
      kpiTotal: 0,
      sourceTotal: 0,
      difference: 0,
      tolerancePercent: 0.1,
      isWithinTolerance: true,
      explanations: [],
    }
  }

  // Simulate slight differences for reconciliation demo
  const variance = (Math.random() - 0.5) * 0.02 // +/- 1%
  const sourceTotal = kpiValue.value * (1 + variance)
  const difference = Math.abs(kpiValue.value - sourceTotal)
  const tolerancePercent = 0.1 // 0.1%
  const isWithinTolerance = (difference / kpiValue.value) * 100 <= tolerancePercent

  const explanations: string[] = []
  if (!isWithinTolerance) {
    explanations.push('Timing difference: Some records processed after snapshot')
    explanations.push('Void/credit adjustments not yet applied')
  }

  return {
    kpiSlug,
    kpiTotal: kpiValue.value,
    sourceTotal,
    difference,
    tolerancePercent,
    isWithinTolerance,
    explanations,
  }
}

// Get action items
export function getActionItems(): ActionItem[] {
  const opportunities = getOpportunities()
  const accounts = getAccounts()
  const invoices = getInvoices()
  const capacity = getTechnicianCapacity()

  const actions: ActionItem[] = []

  // 1. Stalled opportunities
  const stalledOpps = opportunities.filter(o => o.isStalled && !['closed_won', 'closed_lost'].includes(o.stage))
  stalledOpps.slice(0, 20).forEach(opp => {
    actions.push({
      id: `ACT-STALLED-${opp.id}`,
      type: 'stalled_opp',
      entityId: opp.id,
      entityType: 'opportunity',
      title: `${opp.name} - Stalled ${opp.daysInStage} days`,
      owner: opp.ownerName,
      ownerId: opp.ownerId,
      severity: opp.daysInStage > 30 ? 'critical' : opp.daysInStage > 21 ? 'high' : 'medium',
      financialImpact: opp.amount,
      nextBestAction: opp.daysInStage > 21
        ? 'Schedule executive sponsor call to unblock'
        : 'Follow up with decision maker on timeline',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      details: { stage: opp.stage, daysInStage: opp.daysInStage, lastActivity: opp.stageLastChanged },
    })
  })

  // 2. At-risk accounts
  const highRiskAccounts = accounts.filter(a => a.retentionRisk === 'high')
  highRiskAccounts.slice(0, 15).forEach(acc => {
    actions.push({
      id: `ACT-RISK-${acc.id}`,
      type: 'at_risk_account',
      entityId: acc.id,
      entityType: 'account',
      title: `${acc.name} - High Retention Risk`,
      owner: acc.ownerId,
      ownerId: acc.ownerId,
      severity: acc.complaints > 3 ? 'critical' : 'high',
      financialImpact: acc.contractValue,
      nextBestAction: acc.complaints > 2
        ? 'Escalate to Customer Success Manager for intervention'
        : 'Schedule service recovery call within 48 hours',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      details: { complaints: acc.complaints, openIssues: acc.openIssues, arBalance: acc.arBalance },
    })
  })

  // 3. Capacity pressure
  const recentCapacity = capacity.filter(c => c.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const overutilizedBranches = new Map<string, number>()
  recentCapacity.forEach(c => {
    if (c.utilization > 1) {
      overutilizedBranches.set(c.branchId, (overutilizedBranches.get(c.branchId) || 0) + 1)
    }
  })

  Array.from(overutilizedBranches.entries()).slice(0, 10).forEach(([branchId, count]) => {
    actions.push({
      id: `ACT-CAP-${branchId}`,
      type: 'capacity_pressure',
      entityId: branchId,
      entityType: 'branch',
      title: `Branch ${branchId} - Capacity Overload`,
      owner: 'Operations Manager',
      ownerId: '',
      severity: count > 5 ? 'critical' : 'high',
      financialImpact: count * 500, // Estimated overtime/delay cost
      nextBestAction: count > 5
        ? 'Request temporary staff or route redistribution'
        : 'Review route optimization opportunities',
      details: { overutilizedDays: count },
    })
  })

  // 4. Collections priorities - group by account to avoid duplicates
  const overdueInvoices = invoices.filter(i =>
    i.status === 'overdue' &&
    (i.agingBucket === '61-90' || i.agingBucket === '90+')
  )

  // Group invoices by account to avoid duplicate entries like "Elite Corp" appearing twice
  const invoicesByAccount = new Map<string, {
    accountName: string
    totalAmount: number
    invoiceCount: number
    worstBucket: string
    oldestDue: Date
    invoices: typeof overdueInvoices
  }>()

  overdueInvoices.forEach(inv => {
    const existing = invoicesByAccount.get(inv.accountId)
    if (existing) {
      existing.totalAmount += inv.amount
      existing.invoiceCount += 1
      // Track the worst aging bucket (90+ is worse than 61-90)
      if (inv.agingBucket === '90+' && existing.worstBucket !== '90+') {
        existing.worstBucket = '90+'
      }
      if (inv.dueDate < existing.oldestDue) {
        existing.oldestDue = inv.dueDate
      }
      existing.invoices.push(inv)
    } else {
      invoicesByAccount.set(inv.accountId, {
        accountName: inv.accountName,
        totalAmount: inv.amount,
        invoiceCount: 1,
        worstBucket: inv.agingBucket,
        oldestDue: inv.dueDate,
        invoices: [inv]
      })
    }
  })

  // Sort by total amount and create consolidated actions
  Array.from(invoicesByAccount.entries())
    .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
    .slice(0, 15)
    .forEach(([accountId, data]) => {
      const invoiceLabel = data.invoiceCount > 1
        ? `${data.invoiceCount} invoices totaling`
        : ''
      actions.push({
        id: `ACT-COLL-${accountId}`,
        type: 'collection_priority',
        entityId: accountId,
        entityType: 'account', // Changed from 'invoice' to 'account' for consolidated view
        title: `${data.accountName} - ${data.worstBucket} days overdue`,
        owner: 'AR Collections',
        ownerId: '',
        severity: data.worstBucket === '90+' ? 'critical' : 'high',
        financialImpact: data.totalAmount,
        nextBestAction: data.worstBucket === '90+'
          ? 'Escalate to collections agency or legal review'
          : 'Direct outreach to AP contact with payment plan option',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        details: {
          invoiceCount: data.invoiceCount,
          totalAmount: data.totalAmount,
          oldestDueDate: data.oldestDue,
          agingBucket: data.worstBucket
        },
      })
    })

  return actions.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity] || b.financialImpact - a.financialImpact
  })
}

// Get variance drivers that reconcile to actual variance amount
export function getVarianceDrivers(kpiSlug: string, actualVarianceAmount?: number): VarianceDriver[] {
  const drivers: VarianceDriver[] = []

  if (kpiSlug === 'revenue_mtd' || kpiSlug === 'variance_to_target_mtd') {
    // If we have an actual variance amount, make drivers sum to it
    // Otherwise use default demo values
    const totalVariance = actualVarianceAmount ?? 0

    // Define driver proportions (should sum to 1.0 for the net effect)
    // Positive drivers: Commercial (45%), Seasonal (20%), Price (10%) = 75%
    // Negative drivers: Churn (-15%), Collection (-10%) = -25%
    // Net effect = 50% of variance positive, 50% explained

    if (Math.abs(totalVariance) < 1000) {
      // Near zero variance - show minimal drivers
      drivers.push(
        {
          factor: 'Commercial segment growth',
          impact: 15000,
          direction: 'positive',
          explanation: 'Enterprise contract wins offsetting other factors',
        },
        {
          factor: 'Seasonal normalization',
          impact: 15000,
          direction: 'negative',
          explanation: 'Slightly below seasonal expectations',
        }
      )
    } else if (totalVariance > 0) {
      // Positive variance - show net positive drivers
      const posAmount = Math.abs(totalVariance)
      drivers.push(
        {
          factor: 'Commercial segment growth',
          impact: posAmount * 0.45,
          direction: 'positive',
          explanation: 'New enterprise contracts in Northeast and West Coast markets driving growth',
        },
        {
          factor: 'Seasonal uplift',
          impact: posAmount * 0.30,
          direction: 'positive',
          explanation: 'Q3 seasonal pest activity driving increased service frequency',
        },
        {
          factor: 'Price increase realization',
          impact: posAmount * 0.25,
          direction: 'positive',
          explanation: 'Annual price adjustments taking effect across renewal base',
        }
      )
    } else {
      // Negative variance - show net negative drivers
      const negAmount = Math.abs(totalVariance)
      drivers.push(
        {
          factor: 'Commercial segment wins',
          impact: negAmount * 0.30,
          direction: 'positive',
          explanation: 'New enterprise contracts partially offsetting shortfall',
        },
        {
          factor: 'Residential churn',
          impact: negAmount * 0.50,
          direction: 'negative',
          explanation: 'Higher than expected cancellations in Southwest market due to competitor pricing',
        },
        {
          factor: 'Collection timing',
          impact: negAmount * 0.45,
          direction: 'negative',
          explanation: 'Several large invoices shifted to next period due to customer payment cycles',
        },
        {
          factor: 'Seasonal softness',
          impact: negAmount * 0.35,
          direction: 'negative',
          explanation: 'Below-normal pest activity in key markets',
        }
      )
    }
  }

  return drivers
}

// Get forecast data
export function getForecastData(scenario: Scenario): {
  forecast: ForecastPoint[]
  assumptions: ForecastAssumption[]
  backtest: BacktestResult[]
} {
  const forecast: ForecastPoint[] = []
  const now = new Date()

  // Generate 8 weeks of forecast + 12 weeks of historical
  for (let week = -12; week <= 8; week++) {
    const date = new Date(now.getTime() + week * 7 * 24 * 60 * 60 * 1000)
    const baseValue = 450000 + Math.sin(week / 4) * 50000 + week * 5000

    const scenarioMultipliers = {
      base: 1,
      upside: 1.15,
      downside: 0.85,
    }

    const confidence = week > 0 ? 0.15 + week * 0.02 : 0

    forecast.push({
      date,
      base: baseValue,
      upside: baseValue * scenarioMultipliers.upside,
      downside: baseValue * scenarioMultipliers.downside,
      actual: week <= 0 ? baseValue * (0.95 + Math.random() * 0.1) : undefined,
      confidenceLower: baseValue * (1 - confidence),
      confidenceUpper: baseValue * (1 + confidence),
    })
  }

  const assumptions: ForecastAssumption[] = [
    { name: 'Win Rate', baseValue: 0.32, upsideValue: 0.38, downsideValue: 0.26, unit: '%' },
    { name: 'Avg Deal Size', baseValue: 28500, upsideValue: 32000, downsideValue: 24000, unit: '$' },
    { name: 'Pipeline Conversion', baseValue: 0.28, upsideValue: 0.35, downsideValue: 0.22, unit: '%' },
    { name: 'Churn Rate', baseValue: 0.08, upsideValue: 0.05, downsideValue: 0.12, unit: '%' },
    { name: 'Seasonality Factor', baseValue: 1.05, upsideValue: 1.10, downsideValue: 0.95, unit: 'x' },
  ]

  const backtest: BacktestResult[] = []
  for (let week = 12; week >= 1; week--) {
    const weekEnding = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000)
    const predicted = 420000 + Math.random() * 80000
    const actual = predicted * (0.92 + Math.random() * 0.16)
    const error = Math.abs(predicted - actual)

    backtest.push({
      weekEnding,
      predicted,
      actual,
      error,
      errorPercent: error / actual,
    })
  }

  return { forecast, assumptions, backtest }
}

// Calculate pipeline by stage
export function getPipelineByStage(): { stage: string; count: number; value: number; weightedValue: number }[] {
  const opportunities = getOpportunities()
  const openOpps = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage))

  const stages = ['prospect', 'qualified', 'proposal', 'negotiation']
  return stages.map(stage => {
    const stageOpps = openOpps.filter(o => o.stage === stage)
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.amount, 0),
      weightedValue: stageOpps.reduce((sum, o) => sum + o.amount * o.probability, 0),
    }
  })
}

// Get AR aging breakdown
export function getARAgingBreakdown(): { bucket: string; amount: number; count: number }[] {
  const invoices = getInvoices()
  const openInvoices = invoices.filter(i => ['open', 'overdue', 'disputed'].includes(i.status))

  const buckets = ['0-30', '31-60', '61-90', '90+'] as const
  return buckets.map(bucket => {
    const bucketInvoices = openInvoices.filter(i => i.agingBucket === bucket)
    return {
      bucket,
      amount: bucketInvoices.reduce((sum, i) => sum + i.amount, 0),
      count: bucketInvoices.length,
    }
  })
}
