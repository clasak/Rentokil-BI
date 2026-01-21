/**
 * Mock SALTI Extended Data
 *
 * Synthetic SALTI data for daily check-ins, productivity, and sales analytics.
 */

import seedrandom from 'seedrandom'
import type {
  DailyCheckIn,
  DailyCheckInSummary,
  RepProductivity,
  ProposalPipelineItem,
  ProposalPipelineSummary,
  YoYComparison,
  FunnelFalloutStage,
  SalesLadderEntry,
  WeekendBlitzCampaign,
} from '@/types/salti-extended'

let rng = seedrandom('salti-mock-42')

function resetRng(seed = 'salti-mock-42') {
  rng = seedrandom(seed)
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

const MARKETS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
const REP_NAMES = [
  'John Smith', 'Sarah Johnson', 'Mike Williams', 'Emily Brown', 'David Jones',
  'Lisa Davis', 'James Wilson', 'Jennifer Martinez', 'Robert Anderson', 'Michelle Taylor',
  'Christopher Thomas', 'Amanda Jackson', 'Daniel White', 'Jessica Harris', 'Matthew Martin',
]

// =============================================================================
// DAILY CHECK-IN DATA
// =============================================================================

export function generateMockDailyCheckIns(days: number = 30, seed?: string): DailyCheckIn[] {
  if (seed) resetRng(seed)
  else resetRng()

  const checkIns: DailyCheckIn[] = []
  const now = new Date()

  for (let d = 0; d < days; d++) {
    const date = new Date(now)
    date.setDate(date.getDate() - d)

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue

    REP_NAMES.forEach((repName, i) => {
      if (rng() > 0.9) return // 10% missing check-ins

      const callsMade = randomInt(20, 60)
      const callsConnected = randomInt(5, Math.floor(callsMade * 0.5))
      const appointmentsSet = randomInt(1, Math.floor(callsConnected * 0.6))
      const appointmentsCompleted = randomInt(1, appointmentsSet)
      const proposalsSent = randomInt(0, appointmentsCompleted)
      const proposalsValue = proposalsSent * randomInt(1500, 4000)
      const salesClosed = randomInt(0, proposalsSent)
      const salesValue = salesClosed * randomInt(1800, 5000)

      checkIns.push({
        id: `CHK-${d}-${i}`,
        repId: `REP-${100 + i}`,
        repName,
        date,
        market: randomChoice(MARKETS),
        region: `Region-${randomInt(1, 12)}`,
        callsMade,
        callsConnected,
        appointmentsSet,
        appointmentsCompleted,
        proposalsSent,
        proposalsValue,
        salesClosed,
        salesValue,
        callGoal: 40,
        appointmentGoal: 4,
        proposalGoal: 3,
        salesGoal: 2,
        callConnectRate: callsConnected / callsMade,
        appointmentSetRate: appointmentsSet / callsConnected || 0,
        proposalCloseRate: salesClosed / proposalsSent || 0,
        goalAttainment: (callsMade / 40 + appointmentsSet / 4 + proposalsSent / 3 + salesClosed / 2) / 4,
        challenges: rng() > 0.7 ? 'High callback volume' : undefined,
        wins: rng() > 0.6 ? 'Closed large commercial deal' : undefined,
      })
    })
  }

  return checkIns
}

export function generateMockCheckInSummary(date: Date, seed?: string): DailyCheckInSummary {
  if (seed) resetRng(seed)
  else resetRng()

  const totalReps = REP_NAMES.length
  const repsCheckedIn = randomInt(Math.floor(totalReps * 0.85), totalReps)

  return {
    date,
    totalReps,
    repsCheckedIn,
    checkInRate: repsCheckedIn / totalReps,
    totalCalls: randomInt(400, 700),
    totalAppointments: randomInt(40, 80),
    totalProposals: randomInt(25, 50),
    totalSales: randomInt(15, 35),
    totalValue: randomInt(50000, 120000),
    avgCallsPerRep: randomInt(30, 50),
    avgAppointmentsPerRep: randomInt(3, 6),
    avgProposalsPerRep: randomInt(2, 4),
    avgSalesPerRep: randomInt(1, 3),
    topPerformers: [
      { repId: 'REP-101', repName: REP_NAMES[1], metric: 'sales', value: randomInt(4, 8) },
      { repId: 'REP-103', repName: REP_NAMES[3], metric: 'calls', value: randomInt(55, 75) },
      { repId: 'REP-105', repName: REP_NAMES[5], metric: 'appointments', value: randomInt(6, 10) },
    ],
  }
}

// =============================================================================
// PRODUCTIVITY DATA
// =============================================================================

export function generateMockRepProductivity(period: string = 'MTD', seed?: string): RepProductivity[] {
  if (seed) resetRng(seed)
  else resetRng()

  return REP_NAMES.map((repName, i) => {
    const leadsAssigned = randomInt(60, 150)
    const leadsWorked = randomInt(Math.floor(leadsAssigned * 0.7), leadsAssigned)
    const contactsMade = randomInt(Math.floor(leadsWorked * 0.6), leadsWorked)
    const appointmentsSet = randomInt(Math.floor(contactsMade * 0.3), Math.floor(contactsMade * 0.6))
    const inspectionsCompleted = randomInt(Math.floor(appointmentsSet * 0.8), appointmentsSet)
    const proposalsGenerated = randomInt(Math.floor(inspectionsCompleted * 0.7), inspectionsCompleted)
    const proposalsPresented = randomInt(Math.floor(proposalsGenerated * 0.8), proposalsGenerated)
    const salesClosed = randomInt(Math.floor(proposalsPresented * 0.3), Math.floor(proposalsPresented * 0.6))

    const salesValue = salesClosed * randomInt(1800, 4500)
    const proposalValue = proposalsGenerated * randomInt(2000, 5000)

    return {
      repId: `REP-${100 + i}`,
      repName,
      market: randomChoice(MARKETS),
      region: `Region-${randomInt(1, 12)}`,
      period,
      leadsAssigned,
      leadsWorked,
      contactsMade,
      appointmentsSet,
      inspectionsCompleted,
      proposalsGenerated,
      proposalsPresented,
      salesClosed,
      proposalValue,
      salesValue,
      avgDealSize: salesClosed > 0 ? salesValue / salesClosed : 0,
      leadWorkRate: leadsWorked / leadsAssigned,
      contactRate: contactsMade / leadsWorked,
      appointmentRate: appointmentsSet / contactsMade,
      inspectionRate: inspectionsCompleted / appointmentsSet,
      proposalRate: proposalsGenerated / inspectionsCompleted,
      closeRate: salesClosed / proposalsPresented,
      avgLeadResponseTime: randomInt(15, 180),
      avgCycleTime: randomFloat(5, 21),
      avgTimePerLead: randomInt(15, 45),
      rank: i + 1,
      rankChange: randomInt(-5, 5),
      percentile: 100 - (i * 100 / REP_NAMES.length),
    }
  }).sort((a, b) => b.salesValue - a.salesValue)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

// =============================================================================
// PROPOSAL PIPELINE
// =============================================================================

const PROPOSAL_STATUSES = ['draft', 'sent', 'viewed', 'presented', 'negotiating', 'accepted', 'declined', 'expired'] as const

export function generateMockProposalPipeline(count: number = 100, seed?: string): ProposalPipelineItem[] {
  if (seed) resetRng(seed)
  else resetRng()

  const now = Date.now()
  const items: ProposalPipelineItem[] = []

  for (let i = 0; i < count; i++) {
    const createdDaysAgo = randomInt(1, 45)
    const status = randomChoice(PROPOSAL_STATUSES)

    items.push({
      id: `PROP-${String(i + 1).padStart(6, '0')}`,
      accountName: `Customer ${i + 1}`,
      repId: `REP-${randomInt(100, 114)}`,
      repName: randomChoice(REP_NAMES),
      createdAt: new Date(now - createdDaysAgo * 24 * 60 * 60 * 1000),
      presentedAt: status !== 'draft' && status !== 'sent' ? new Date(now - randomInt(1, createdDaysAgo) * 24 * 60 * 60 * 1000) : undefined,
      status,
      amount: randomInt(1000, 12000),
      serviceType: randomChoice(['General Pest', 'Termite', 'Commercial', 'Wildlife']),
      expiresAt: new Date(now + randomInt(-10, 30) * 24 * 60 * 60 * 1000),
      followUpDate: rng() > 0.4 ? new Date(now + randomInt(1, 7) * 24 * 60 * 60 * 1000) : undefined,
      customerName: `Contact ${i + 1}`,
      customerPhone: `555-${randomInt(1000, 9999)}`,
      customerEmail: `customer${i}@example.com`,
      daysOpen: createdDaysAgo,
      touchpoints: randomInt(1, 8),
      lastTouchpoint: new Date(now - randomInt(0, 7) * 24 * 60 * 60 * 1000),
    })
  }

  return items
}

export function generateMockProposalSummary(seed?: string): ProposalPipelineSummary {
  if (seed) resetRng(seed)
  else resetRng()

  return {
    totalProposals: randomInt(80, 150),
    totalValue: randomInt(200000, 500000),
    byStatus: {
      draft: { count: randomInt(5, 15), value: randomInt(15000, 40000) },
      sent: { count: randomInt(10, 25), value: randomInt(30000, 80000) },
      viewed: { count: randomInt(8, 20), value: randomInt(25000, 65000) },
      presented: { count: randomInt(10, 20), value: randomInt(35000, 70000) },
      negotiating: { count: randomInt(5, 15), value: randomInt(20000, 50000) },
      accepted: { count: randomInt(15, 35), value: randomInt(50000, 120000) },
      declined: { count: randomInt(8, 18), value: randomInt(20000, 50000) },
      expired: { count: randomInt(3, 10), value: randomInt(8000, 25000) },
    },
    avgTimeToClose: randomFloat(8, 18),
    avgAmount: randomInt(2500, 4500),
    winRate: randomFloat(0.25, 0.45),
    expiringSoon: randomInt(5, 15),
    needsFollowUp: randomInt(10, 25),
  }
}

// =============================================================================
// YOY COMPARISON
// =============================================================================

export function generateMockYoYComparisons(seed?: string): YoYComparison[] {
  if (seed) resetRng(seed)
  else resetRng()

  const now = new Date()
  const lastYear = new Date(now)
  lastYear.setFullYear(lastYear.getFullYear() - 1)

  const metrics = [
    { metric: 'revenue', label: 'Revenue', isPositive: true },
    { metric: 'leads', label: 'Total Leads', isPositive: true },
    { metric: 'conversion_rate', label: 'Conversion Rate', isPositive: true },
    { metric: 'avg_deal_size', label: 'Avg Deal Size', isPositive: true },
    { metric: 'cycle_time', label: 'Sales Cycle Time', isPositive: false },
    { metric: 'cancel_rate', label: 'Cancel Rate', isPositive: false },
  ]

  return metrics.map(({ metric, label, isPositive }) => {
    const currentValue = metric === 'revenue' ? randomInt(400000, 800000) :
                         metric === 'leads' ? randomInt(800, 1500) :
                         metric === 'conversion_rate' ? randomFloat(0.15, 0.35) :
                         metric === 'avg_deal_size' ? randomInt(2000, 4500) :
                         metric === 'cycle_time' ? randomFloat(10, 20) :
                         randomFloat(0.05, 0.15)

    const changePercent = randomFloat(-20, 25)
    const priorValue = currentValue / (1 + changePercent / 100)

    return {
      metric,
      metricLabel: label,
      currentPeriod: { value: currentValue, start: new Date(now.getFullYear(), 0, 1), end: now },
      priorPeriod: { value: priorValue, start: new Date(lastYear.getFullYear(), 0, 1), end: lastYear },
      change: currentValue - priorValue,
      changePercent,
      trend: changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'flat',
      isPositive: isPositive ? changePercent > 0 : changePercent < 0,
    }
  })
}

// =============================================================================
// FUNNEL FALLOUT
// =============================================================================

export function generateMockFunnelFallout(seed?: string): FunnelFalloutStage[] {
  if (seed) resetRng(seed)
  else resetRng()

  const stages = ['Lead', 'Contact', 'Appointment', 'Inspection', 'Proposal', 'Negotiation', 'Close']
  let remaining = randomInt(800, 1200)

  return stages.map((stage, i) => {
    const entered = remaining
    const falloutRate = i === 0 ? 0 : randomFloat(0.15, 0.40)
    const lost = Math.floor(entered * falloutRate)
    const converted = entered - lost
    remaining = converted

    const reasons = [
      { reason: 'No response', count: Math.floor(lost * 0.3), percent: 30 },
      { reason: 'Not interested', count: Math.floor(lost * 0.25), percent: 25 },
      { reason: 'Competitor', count: Math.floor(lost * 0.2), percent: 20 },
      { reason: 'Price', count: Math.floor(lost * 0.15), percent: 15 },
      { reason: 'Other', count: Math.floor(lost * 0.1), percent: 10 },
    ]

    return {
      stage,
      stageOrder: i + 1,
      entered,
      exited: converted,
      converted,
      lost,
      conversionRate: converted / entered,
      falloutRate,
      avgTimeInStage: randomFloat(4, 72),
      topFalloutReasons: reasons.slice(0, 3),
    }
  })
}

// =============================================================================
// SALES LADDER
// =============================================================================

export function generateMockSalesLadder(count: number = 20, seed?: string): SalesLadderEntry[] {
  if (seed) resetRng(seed)
  else resetRng()

  const entries: SalesLadderEntry[] = []

  for (let i = 0; i < Math.min(count, REP_NAMES.length); i++) {
    const quota = randomInt(25000, 60000)
    const revenue = randomInt(15000, 75000)
    const deals = randomInt(5, 25)
    const priorRank = randomInt(1, count)

    entries.push({
      rank: i + 1,
      repId: `REP-${100 + i}`,
      repName: REP_NAMES[i],
      market: randomChoice(MARKETS),
      region: `Region-${randomInt(1, 12)}`,
      revenue,
      deals,
      avgDealSize: revenue / deals,
      winRate: randomFloat(0.25, 0.55),
      quota,
      attainment: revenue / quota,
      priorRank,
      rankChange: priorRank - (i + 1),
      trend: priorRank > i + 1 ? 'up' : priorRank < i + 1 ? 'down' : 'flat',
      topServiceType: randomChoice(['General Pest', 'Termite', 'Commercial']),
      topLeadSource: randomChoice(['Web', 'Phone', 'Referral']),
      avgCycleTime: randomFloat(8, 18),
    })
  }

  return entries.sort((a, b) => b.revenue - a.revenue)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

// =============================================================================
// WEEKEND BLITZ
// =============================================================================

export function generateMockWeekendBlitz(seed?: string): WeekendBlitzCampaign[] {
  if (seed) resetRng(seed)
  else resetRng()

  const campaigns: WeekendBlitzCampaign[] = []
  const now = new Date()

  // Past campaigns
  for (let i = 0; i < 4; i++) {
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (i + 1) * 14)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 2)

    campaigns.push({
      id: `BLITZ-${i + 1}`,
      name: `Weekend Blitz ${i + 1}`,
      startDate,
      endDate,
      status: 'completed',
      leadGoal: randomInt(100, 200),
      appointmentGoal: randomInt(30, 60),
      salesGoal: randomInt(15, 30),
      revenueGoal: randomInt(40000, 80000),
      leadsGenerated: randomInt(80, 220),
      appointmentsSet: randomInt(25, 70),
      salesClosed: randomInt(10, 35),
      revenueGenerated: randomInt(30000, 90000),
      totalReps: REP_NAMES.length,
      activeReps: randomInt(Math.floor(REP_NAMES.length * 0.7), REP_NAMES.length),
      leadAttainment: randomFloat(0.7, 1.2),
      appointmentAttainment: randomFloat(0.7, 1.2),
      salesAttainment: randomFloat(0.6, 1.3),
      revenueAttainment: randomFloat(0.6, 1.3),
    })
  }

  return campaigns
}

// =============================================================================
// EXPORT
// =============================================================================

export const mockSaltiData = {
  generateDailyCheckIns: generateMockDailyCheckIns,
  generateCheckInSummary: generateMockCheckInSummary,
  generateRepProductivity: generateMockRepProductivity,
  generateProposalPipeline: generateMockProposalPipeline,
  generateProposalSummary: generateMockProposalSummary,
  generateYoYComparisons: generateMockYoYComparisons,
  generateFunnelFallout: generateMockFunnelFallout,
  generateSalesLadder: generateMockSalesLadder,
  generateWeekendBlitz: generateMockWeekendBlitz,
}
