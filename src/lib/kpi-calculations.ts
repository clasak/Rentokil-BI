import {
  KPIValue, ReconciliationItem, ActionItem, VarianceDriver,
  ForecastPoint, ForecastAssumption, BacktestResult, Scenario
} from '@/types'
import { getKPIBySlug } from './kpis'
import {
  getInvoices, getOpportunities, getServiceEvents, getComplaints,
  getAccounts, getTechnicianCapacity, getActivities
} from './data'

// Helper to generate trend data
function generateTrend(baseValue: number, volatility: number = 0.1, points: number = 12): number[] {
  const trend: number[] = []
  let value = baseValue * (0.9 + Math.random() * 0.2)
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
    deltaPercent: (revenueMTD - prevMonthRevenue) / prevMonthRevenue,
    target: revenueMTD * 1.05,
    status: revenueMTD > prevMonthRevenue ? 'good' : 'warning',
    trend: generateTrend(revenueMTD / 20, 0.15),
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
    deltaPercent: (totalPipeline - prevPipeline) / prevPipeline,
    status: totalPipeline > prevPipeline ? 'good' : 'warning',
    trend: generateTrend(totalPipeline, 0.12),
    asOfDate: now,
  })

  // 3. Win Rate
  const closedOpps = opportunities.filter(o => ['closed_won', 'closed_lost'].includes(o.stage))
  const wonOpps = closedOpps.filter(o => o.stage === 'closed_won')
  const winRate = closedOpps.length > 0 ? wonOpps.length / closedOpps.length : 0
  const prevWinRate = winRate * (0.9 + Math.random() * 0.2)
  const winRateDef = getKPIBySlug('win_rate')!

  kpiValues.set('win_rate', {
    slug: 'win_rate',
    value: winRate,
    previousValue: prevWinRate,
    delta: winRate - prevWinRate,
    deltaPercent: (winRate - prevWinRate) / prevWinRate,
    target: winRateDef.target,
    status: winRate >= (winRateDef.target || 0.35) ? 'good' :
            winRate >= (winRateDef.warningThreshold || 0.28) ? 'warning' : 'critical',
    trend: generateTrend(winRate, 0.08),
    asOfDate: now,
  })

  // 4. Avg Cycle Time Days
  const wonOppsWithDates = wonOpps.filter(o => o.createdDate && o.closeDate)
  const avgCycleTime = wonOppsWithDates.length > 0
    ? wonOppsWithDates.reduce((sum, o) =>
        sum + Math.floor((o.closeDate.getTime() - o.createdDate.getTime()) / (24 * 60 * 60 * 1000)), 0) / wonOppsWithDates.length
    : 45
  const prevCycleTime = avgCycleTime * (0.95 + Math.random() * 0.1)
  const cycleDef = getKPIBySlug('avg_cycle_time_days')!

  kpiValues.set('avg_cycle_time_days', {
    slug: 'avg_cycle_time_days',
    value: avgCycleTime,
    previousValue: prevCycleTime,
    delta: avgCycleTime - prevCycleTime,
    deltaPercent: (avgCycleTime - prevCycleTime) / prevCycleTime,
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
    deltaPercent: (forecast8w - prevForecast) / prevForecast,
    status: forecast8w > prevForecast ? 'good' : 'warning',
    trend: generateTrend(forecast8w / 8, 0.1),
    asOfDate: now,
  })

  // 6. Variance to Target MTD
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const monthlyTarget = revenueMTD * 1.05
  const proratedTarget = monthlyTarget * (dayOfMonth / daysInMonth)
  const variance = (revenueMTD - proratedTarget) / proratedTarget
  const prevVariance = variance * (0.8 + Math.random() * 0.4)
  const varianceDef = getKPIBySlug('variance_to_target_mtd')!

  kpiValues.set('variance_to_target_mtd', {
    slug: 'variance_to_target_mtd',
    value: variance,
    previousValue: prevVariance,
    delta: variance - prevVariance,
    deltaPercent: variance - prevVariance,
    target: 0,
    status: variance >= 0 ? 'good' :
            variance >= (varianceDef.warningThreshold || -0.05) ? 'warning' : 'critical',
    trend: generateTrend(variance, 0.5),
    asOfDate: now,
  })

  // 7. Service Risk Index
  const completedServices = serviceEvents.filter(s => s.status === 'completed')
  const callbacks = serviceEvents.filter(s => s.status === 'callback')
  const missedServices = serviceEvents.filter(s => s.status === 'missed')

  const callbackRate = completedServices.length > 0 ? callbacks.length / completedServices.length : 0
  const missedRate = serviceEvents.length > 0 ? missedServices.length / serviceEvents.length : 0
  const complaintRate = serviceEvents.length > 0 ? complaints.length / serviceEvents.length * 1000 : 0

  const serviceRiskIndex = Math.max(0, 100 - (callbackRate * 25 * 100 + missedRate * 30 * 100 + Math.min(complaintRate, 20) * 1.25))
  const prevServiceRisk = serviceRiskIndex * (0.95 + Math.random() * 0.1)
  const serviceRiskDef = getKPIBySlug('service_risk_index')!

  kpiValues.set('service_risk_index', {
    slug: 'service_risk_index',
    value: serviceRiskIndex,
    previousValue: prevServiceRisk,
    delta: serviceRiskIndex - prevServiceRisk,
    deltaPercent: (serviceRiskIndex - prevServiceRisk) / prevServiceRisk,
    target: serviceRiskDef.target,
    status: serviceRiskIndex >= (serviceRiskDef.target || 85) ? 'good' :
            serviceRiskIndex >= (serviceRiskDef.warningThreshold || 75) ? 'warning' : 'critical',
    trend: generateTrend(serviceRiskIndex, 0.05),
    asOfDate: now,
  })

  // 8. Callback Rate
  const callbackRateValue = callbackRate
  const prevCallbackRate = callbackRateValue * (0.9 + Math.random() * 0.2)
  const callbackDef = getKPIBySlug('callback_rate')!

  kpiValues.set('callback_rate', {
    slug: 'callback_rate',
    value: callbackRateValue,
    previousValue: prevCallbackRate,
    delta: callbackRateValue - prevCallbackRate,
    deltaPercent: (callbackRateValue - prevCallbackRate) / (prevCallbackRate || 0.01),
    target: callbackDef.target,
    status: callbackRateValue <= (callbackDef.target || 0.05) ? 'good' :
            callbackRateValue <= (callbackDef.warningThreshold || 0.08) ? 'warning' : 'critical',
    trend: generateTrend(callbackRateValue, 0.15),
    asOfDate: now,
  })

  // 9. Missed Service Rate
  const missedRateDef = getKPIBySlug('missed_service_rate')!
  const prevMissedRate = missedRate * (0.9 + Math.random() * 0.2)

  kpiValues.set('missed_service_rate', {
    slug: 'missed_service_rate',
    value: missedRate,
    previousValue: prevMissedRate,
    delta: missedRate - prevMissedRate,
    deltaPercent: (missedRate - prevMissedRate) / (prevMissedRate || 0.01),
    target: missedRateDef.target,
    status: missedRate <= (missedRateDef.target || 0.02) ? 'good' :
            missedRate <= (missedRateDef.warningThreshold || 0.04) ? 'warning' : 'critical',
    trend: generateTrend(missedRate, 0.2),
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
    deltaPercent: (avgResponseTime - prevResponseTime) / prevResponseTime,
    target: responseDef.target,
    status: avgResponseTime <= (responseDef.target || 24) ? 'good' :
            avgResponseTime <= (responseDef.warningThreshold || 36) ? 'warning' : 'critical',
    trend: generateTrend(avgResponseTime, 0.12),
    asOfDate: now,
  })

  // 11. AR Aging
  const openInvoices = invoices.filter(i => ['open', 'overdue', 'disputed'].includes(i.status))
  const arTotal = openInvoices.reduce((sum, i) => sum + i.amount, 0)
  const prevAR = arTotal * (0.95 + Math.random() * 0.1)

  kpiValues.set('ar_aging', {
    slug: 'ar_aging',
    value: arTotal,
    previousValue: prevAR,
    delta: arTotal - prevAR,
    deltaPercent: (arTotal - prevAR) / prevAR,
    status: arTotal < prevAR ? 'good' : 'warning',
    trend: generateTrend(arTotal, 0.1),
    asOfDate: now,
  })

  // 12. DSO
  const last30Revenue = revenueMTD * 1.1
  const dso = last30Revenue > 0 ? (arTotal / last30Revenue) * 30 : 40
  const prevDSO = dso * (0.95 + Math.random() * 0.1)
  const dsoDef = getKPIBySlug('dso')!

  kpiValues.set('dso', {
    slug: 'dso',
    value: dso,
    previousValue: prevDSO,
    delta: dso - prevDSO,
    deltaPercent: (dso - prevDSO) / prevDSO,
    target: dsoDef.target,
    status: dso <= (dsoDef.target || 35) ? 'good' :
            dso <= (dsoDef.warningThreshold || 45) ? 'warning' : 'critical',
    trend: generateTrend(dso, 0.08),
    asOfDate: now,
  })

  // 13. Capacity Utilization
  const recentCapacity = capacity.filter(c => c.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const avgUtilization = recentCapacity.length > 0
    ? recentCapacity.reduce((sum, c) => sum + c.utilization, 0) / recentCapacity.length
    : 0.78
  const prevUtilization = avgUtilization * (0.95 + Math.random() * 0.1)
  const capacityDef = getKPIBySlug('capacity_utilization')!

  kpiValues.set('capacity_utilization', {
    slug: 'capacity_utilization',
    value: Math.min(avgUtilization, 1),
    previousValue: prevUtilization,
    delta: avgUtilization - prevUtilization,
    deltaPercent: (avgUtilization - prevUtilization) / prevUtilization,
    target: capacityDef.target,
    status: avgUtilization >= (capacityDef.target || 0.85) ? 'good' :
            avgUtilization >= (capacityDef.warningThreshold || 0.70) ? 'warning' : 'critical',
    trend: generateTrend(avgUtilization, 0.08),
    asOfDate: now,
  })

  // 14. Scheduling Pressure Index
  const overUtilized = recentCapacity.filter(c => c.utilization > 1).length
  const schedulingPressure = 20 + (overUtilized / recentCapacity.length) * 60
  const prevPressure = schedulingPressure * (0.9 + Math.random() * 0.2)
  const pressureDef = getKPIBySlug('scheduling_pressure_index')!

  kpiValues.set('scheduling_pressure_index', {
    slug: 'scheduling_pressure_index',
    value: schedulingPressure,
    previousValue: prevPressure,
    delta: schedulingPressure - prevPressure,
    deltaPercent: (schedulingPressure - prevPressure) / prevPressure,
    target: pressureDef.target,
    status: schedulingPressure <= (pressureDef.target || 30) ? 'good' :
            schedulingPressure <= (pressureDef.warningThreshold || 50) ? 'warning' : 'critical',
    trend: generateTrend(schedulingPressure, 0.15),
    asOfDate: now,
  })

  // 15. CRM Hygiene Score
  const oppsWithNextStep = openOpps.filter(o => o.nextStepDate !== null).length
  const recentActivityOpps = openOpps.filter(o => {
    const oppActivities = activities.filter(a => a.opportunityId === o.id)
    return oppActivities.some(a => a.timestamp > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
  }).length

  const completeFieldsPct = oppsWithNextStep / (openOpps.length || 1)
  const recentActivityPct = recentActivityOpps / (openOpps.length || 1)
  const crmHygieneScore = (completeFieldsPct * 40 + recentActivityPct * 30 + 0.8 * 30)
  const prevHygiene = crmHygieneScore * (0.95 + Math.random() * 0.1)
  const hygieneDef = getKPIBySlug('crm_hygiene_score')!

  kpiValues.set('crm_hygiene_score', {
    slug: 'crm_hygiene_score',
    value: crmHygieneScore * 100,
    previousValue: prevHygiene * 100,
    delta: (crmHygieneScore - prevHygiene) * 100,
    deltaPercent: (crmHygieneScore - prevHygiene) / prevHygiene,
    target: hygieneDef.target,
    status: crmHygieneScore * 100 >= (hygieneDef.target || 90) ? 'good' :
            crmHygieneScore * 100 >= (hygieneDef.warningThreshold || 75) ? 'warning' : 'critical',
    trend: generateTrend(crmHygieneScore * 100, 0.05),
    asOfDate: now,
  })

  // 16. Stalled Opportunities
  const stalledOpps = openOpps.filter(o => o.isStalled)
  const stalledValue = stalledOpps.reduce((sum, o) => sum + o.amount, 0)
  const prevStalled = stalledValue * (0.9 + Math.random() * 0.2)

  kpiValues.set('stalled_opps', {
    slug: 'stalled_opps',
    value: stalledValue,
    previousValue: prevStalled,
    delta: stalledValue - prevStalled,
    deltaPercent: (stalledValue - prevStalled) / (prevStalled || 1),
    status: stalledValue < prevStalled ? 'good' : stalledValue > prevStalled * 1.1 ? 'critical' : 'warning',
    trend: generateTrend(stalledValue, 0.2),
    asOfDate: now,
  })

  // 17. Retention Risk
  const highRiskAccounts = accounts.filter(a => a.retentionRisk === 'high')
  const retentionRiskValue = highRiskAccounts.reduce((sum, a) => sum + a.contractValue, 0)
  const prevRetentionRisk = retentionRiskValue * (0.95 + Math.random() * 0.1)

  kpiValues.set('retention_risk', {
    slug: 'retention_risk',
    value: retentionRiskValue,
    previousValue: prevRetentionRisk,
    delta: retentionRiskValue - prevRetentionRisk,
    deltaPercent: (retentionRiskValue - prevRetentionRisk) / prevRetentionRisk,
    status: retentionRiskValue < prevRetentionRisk ? 'good' : 'critical',
    trend: generateTrend(retentionRiskValue, 0.12),
    asOfDate: now,
  })

  // 18. Complaint Rate
  const complaintRateValue = complaintRate
  const prevComplaintRate = complaintRateValue * (0.9 + Math.random() * 0.2)
  const complaintDef = getKPIBySlug('complaint_rate')!

  kpiValues.set('complaint_rate', {
    slug: 'complaint_rate',
    value: complaintRateValue,
    previousValue: prevComplaintRate,
    delta: complaintRateValue - prevComplaintRate,
    deltaPercent: (complaintRateValue - prevComplaintRate) / (prevComplaintRate || 1),
    target: complaintDef.target,
    status: complaintRateValue <= (complaintDef.target || 5) ? 'good' :
            complaintRateValue <= (complaintDef.warningThreshold || 8) ? 'warning' : 'critical',
    trend: generateTrend(complaintRateValue, 0.15),
    asOfDate: now,
  })

  // 19. NRR
  const nrr = 1.02 + Math.random() * 0.06
  const prevNRR = nrr * (0.98 + Math.random() * 0.04)
  const nrrDef = getKPIBySlug('nrr')!

  kpiValues.set('nrr', {
    slug: 'nrr',
    value: nrr,
    previousValue: prevNRR,
    delta: nrr - prevNRR,
    deltaPercent: (nrr - prevNRR) / prevNRR,
    target: nrrDef.target,
    status: nrr >= (nrrDef.target || 1.05) ? 'good' :
            nrr >= (nrrDef.warningThreshold || 0.98) ? 'warning' : 'critical',
    trend: generateTrend(nrr, 0.03),
    asOfDate: now,
  })

  // 20. Margin Proxy
  const marginProxy = 0.38 + Math.random() * 0.1
  const prevMargin = marginProxy * (0.98 + Math.random() * 0.04)
  const marginDef = getKPIBySlug('margin_proxy')!

  kpiValues.set('margin_proxy', {
    slug: 'margin_proxy',
    value: marginProxy,
    previousValue: prevMargin,
    delta: marginProxy - prevMargin,
    deltaPercent: (marginProxy - prevMargin) / prevMargin,
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

  // 4. Collections priorities
  const overdueInvoices = invoices.filter(i =>
    i.status === 'overdue' &&
    (i.agingBucket === '61-90' || i.agingBucket === '90+')
  )
  overdueInvoices.sort((a, b) => b.amount - a.amount).slice(0, 15).forEach(inv => {
    actions.push({
      id: `ACT-COLL-${inv.id}`,
      type: 'collection_priority',
      entityId: inv.id,
      entityType: 'invoice',
      title: `${inv.accountName} - ${inv.agingBucket} days overdue`,
      owner: 'AR Collections',
      ownerId: '',
      severity: inv.agingBucket === '90+' ? 'critical' : 'high',
      financialImpact: inv.amount,
      nextBestAction: inv.agingBucket === '90+'
        ? 'Escalate to collections agency or legal review'
        : 'Direct outreach to AP contact with payment plan option',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      details: { invoiceDate: inv.invoiceDate, dueDate: inv.dueDate, amount: inv.amount },
    })
  })

  return actions.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity] || b.financialImpact - a.financialImpact
  })
}

// Get variance drivers
export function getVarianceDrivers(kpiSlug: string): VarianceDriver[] {
  const drivers: VarianceDriver[] = []

  if (kpiSlug === 'revenue_mtd' || kpiSlug === 'variance_to_target_mtd') {
    drivers.push(
      {
        factor: 'Commercial segment growth',
        impact: 125000,
        direction: 'positive',
        explanation: 'New enterprise contracts in Northeast and West Coast markets driving 8% YoY growth',
      },
      {
        factor: 'Residential churn',
        impact: -45000,
        direction: 'negative',
        explanation: 'Higher than expected cancellations in Southwest market due to competitor pricing',
      },
      {
        factor: 'Seasonal uplift',
        impact: 35000,
        direction: 'positive',
        explanation: 'Q3 seasonal pest activity driving increased service frequency',
      },
      {
        factor: 'Collection timing',
        impact: -28000,
        direction: 'negative',
        explanation: 'Several large invoices shifted to next period due to customer payment cycles',
      },
      {
        factor: 'Price increase realization',
        impact: 18000,
        direction: 'positive',
        explanation: 'Annual price adjustments taking effect across renewal base',
      }
    )
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
