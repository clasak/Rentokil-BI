/**
 * Mock Sales Extended Data
 *
 * Synthetic data for extended sales operations.
 */

import seedrandom from 'seedrandom'
import type {
  SpeedToInstallMetric,
  SpeedToInstallDetail,
  BacklogItem,
  BacklogSummary,
  CanceledAgreement,
  CancelReasonAnalysis,
  SalesTodayMetrics,
  StartRateMetric,
} from '@/types/sales-extended'

let rng = seedrandom('sales-ext-42')

function resetRng(seed = 'sales-ext-42') {
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

const SERVICE_TYPES = ['General Pest', 'Termite', 'Commercial', 'Wildlife', 'Fumigation']
const CANCEL_REASONS = ['price', 'competitor', 'changed_mind', 'service_not_needed', 'moved', 'financial', 'poor_service', 'scheduling', 'other'] as const
const BACKLOG_STATUSES = ['pending_schedule', 'scheduled', 'parts_ordered', 'waiting_customer', 'blocked', 'ready'] as const

// =============================================================================
// SPEED TO INSTALL
// =============================================================================

export function generateMockSpeedToInstall(weeks: number = 12, seed?: string): SpeedToInstallMetric[] {
  if (seed) resetRng(seed)
  else resetRng()

  const metrics: SpeedToInstallMetric[] = []
  const now = new Date()

  for (let w = weeks - 1; w >= 0; w--) {
    const periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - (w + 1) * 7)
    const periodEnd = new Date(periodStart)
    periodEnd.setDate(periodEnd.getDate() + 7)

    const totalSold = randomInt(40, 80)
    const totalInstalled = randomInt(Math.floor(totalSold * 0.7), totalSold)
    const within24Hours = randomInt(5, Math.floor(totalInstalled * 0.15))
    const within48Hours = randomInt(within24Hours, Math.floor(totalInstalled * 0.3))
    const within7Days = randomInt(within48Hours, Math.floor(totalInstalled * 0.7))
    const within14Days = randomInt(within7Days, Math.floor(totalInstalled * 0.9))

    metrics.push({
      period: periodStart.toISOString().split('T')[0],
      periodStart,
      periodEnd,
      totalSold,
      totalInstalled,
      avgDaysToInstall: randomFloat(4, 12),
      medianDaysToInstall: randomFloat(3, 10),
      minDaysToInstall: randomInt(0, 2),
      maxDaysToInstall: randomInt(14, 30),
      within24Hours,
      within48Hours,
      within7Days,
      within14Days,
      over14Days: totalInstalled - within14Days,
      onTimeRate: within14Days / totalInstalled,
      slaTarget: 14,
    })
  }

  return metrics
}

export function generateMockSpeedToInstallDetails(count: number = 50, seed?: string): SpeedToInstallDetail[] {
  if (seed) resetRng(seed)
  else resetRng()

  const details: SpeedToInstallDetail[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const soldDaysAgo = randomInt(1, 30)
    const soldDate = new Date(now - soldDaysAgo * 24 * 60 * 60 * 1000)
    const isInstalled = rng() > 0.3
    const daysToInstall = isInstalled ? randomInt(1, 21) : undefined
    const installedDate = isInstalled ? new Date(soldDate.getTime() + daysToInstall! * 24 * 60 * 60 * 1000) : undefined

    details.push({
      saleId: `SALE-${String(i + 1).padStart(6, '0')}`,
      accountName: `Customer ${i + 1}`,
      repName: `Sales Rep ${randomInt(1, 15)}`,
      technicianName: isInstalled ? `Tech ${randomInt(1, 30)}` : undefined,
      serviceType: randomChoice(SERVICE_TYPES),
      saleAmount: randomInt(800, 8000),
      soldDate,
      scheduledDate: rng() > 0.2 ? new Date(soldDate.getTime() + randomInt(1, 14) * 24 * 60 * 60 * 1000) : undefined,
      installedDate,
      daysToSchedule: randomInt(0, 7),
      daysToInstall,
      totalDays: daysToInstall,
      status: isInstalled ? 'installed' : rng() > 0.5 ? 'scheduled' : 'pending',
      isOverdue: !isInstalled && soldDaysAgo > 14,
    })
  }

  return details
}

// =============================================================================
// BACKLOG
// =============================================================================

export function generateMockBacklog(count: number = 60, seed?: string): BacklogItem[] {
  if (seed) resetRng(seed)
  else resetRng()

  const items: BacklogItem[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const daysSinceSold = randomInt(1, 45)
    const soldDate = new Date(now - daysSinceSold * 24 * 60 * 60 * 1000)
    const status = randomChoice(BACKLOG_STATUSES)
    const isBlocked = status === 'blocked'

    items.push({
      id: `BKL-${String(i + 1).padStart(6, '0')}`,
      accountName: `Backlog Customer ${i + 1}`,
      accountId: `ACC-${randomInt(1000, 9999)}`,
      repId: `REP-${randomInt(100, 114)}`,
      repName: `Sales Rep ${randomInt(1, 15)}`,
      serviceType: randomChoice(SERVICE_TYPES),
      amount: randomInt(500, 12000),
      soldDate,
      scheduledInstallDate: status === 'scheduled' ? new Date(now + randomInt(1, 14) * 24 * 60 * 60 * 1000) : undefined,
      status,
      priority: daysSinceSold > 21 ? 'high' : daysSinceSold > 14 ? 'medium' : 'low',
      blockedReason: isBlocked ? randomChoice(['Parts on order', 'Customer unavailable', 'Permit required', 'Weather delay']) : undefined,
      daysSinceSold,
      daysPastDue: daysSinceSold > 14 ? daysSinceSold - 14 : undefined,
      isAtRisk: daysSinceSold > 21,
    })
  }

  return items.sort((a, b) => b.daysSinceSold - a.daysSinceSold)
}

export function generateMockBacklogSummary(seed?: string): BacklogSummary {
  if (seed) resetRng(seed)
  else resetRng()

  const items = generateMockBacklog(60, seed)
  const totalValue = items.reduce((sum, i) => sum + i.amount, 0)

  return {
    totalItems: items.length,
    totalValue,
    byStatus: {
      pending_schedule: { count: randomInt(10, 20), value: randomInt(20000, 50000) },
      scheduled: { count: randomInt(15, 25), value: randomInt(40000, 80000) },
      parts_ordered: { count: randomInt(3, 8), value: randomInt(8000, 20000) },
      waiting_customer: { count: randomInt(5, 12), value: randomInt(12000, 30000) },
      blocked: { count: randomInt(2, 6), value: randomInt(5000, 15000) },
      ready: { count: randomInt(8, 15), value: randomInt(20000, 40000) },
    },
    under7Days: { count: randomInt(20, 30), value: randomInt(50000, 90000) },
    days7to14: { count: randomInt(15, 25), value: randomInt(40000, 70000) },
    days14to30: { count: randomInt(10, 18), value: randomInt(25000, 50000) },
    over30Days: { count: randomInt(3, 10), value: randomInt(8000, 25000) },
    atRiskCount: randomInt(8, 18),
    atRiskValue: randomInt(20000, 50000),
    blockedCount: randomInt(2, 8),
    blockedValue: randomInt(5000, 20000),
    avgAge: randomFloat(8, 16),
    oldestItem: randomInt(30, 50),
  }
}

// =============================================================================
// CANCELED AGREEMENTS
// =============================================================================

export function generateMockCanceledAgreements(count: number = 40, seed?: string): CanceledAgreement[] {
  if (seed) resetRng(seed)
  else resetRng()

  const agreements: CanceledAgreement[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const cancelDaysAgo = randomInt(1, 60)
    const daysToCancel = randomInt(1, 30)
    const cancelDate = new Date(now - cancelDaysAgo * 24 * 60 * 60 * 1000)
    const soldDate = new Date(cancelDate.getTime() - daysToCancel * 24 * 60 * 60 * 1000)

    agreements.push({
      id: `CAN-${String(i + 1).padStart(6, '0')}`,
      accountName: `Canceled Customer ${i + 1}`,
      accountId: `ACC-${randomInt(1000, 9999)}`,
      repId: `REP-${randomInt(100, 114)}`,
      repName: `Sales Rep ${randomInt(1, 15)}`,
      serviceType: randomChoice(SERVICE_TYPES),
      amount: randomInt(500, 10000),
      soldDate,
      cancelDate,
      daysToCancel,
      cancelReason: randomChoice(CANCEL_REASONS),
      cancelReasonDetail: rng() > 0.5 ? 'Customer provided additional details...' : undefined,
      cancelInitiator: rng() > 0.8 ? 'company' : 'customer',
      wasStarted: rng() > 0.7,
      recoveryAttempted: rng() > 0.6,
      recoverySuccessful: rng() > 0.8 ? false : undefined,
    })
  }

  return agreements.sort((a, b) => b.cancelDate.getTime() - a.cancelDate.getTime())
}

export function generateMockCancelReasonAnalysis(seed?: string): CancelReasonAnalysis[] {
  if (seed) resetRng(seed)
  else resetRng()

  const totalCancels = randomInt(80, 150)
  let remaining = totalCancels

  const reasonLabels: Record<typeof CANCEL_REASONS[number], string> = {
    price: 'Price Concerns',
    competitor: 'Chose Competitor',
    changed_mind: 'Changed Mind',
    service_not_needed: 'Service Not Needed',
    moved: 'Moved/Relocated',
    financial: 'Financial Issues',
    poor_service: 'Poor Service Experience',
    scheduling: 'Scheduling Conflict',
    other: 'Other',
  }

  return CANCEL_REASONS.map((reason, i) => {
    const percent = i < 3 ? randomFloat(0.15, 0.25) :
                    i < 6 ? randomFloat(0.08, 0.15) :
                    randomFloat(0.03, 0.08)
    const count = Math.min(Math.floor(totalCancels * percent), remaining)
    remaining -= count

    return {
      reason,
      reasonLabel: reasonLabels[reason],
      count,
      value: count * randomInt(1500, 4000),
      percentOfTotal: count / totalCancels,
      avgDaysToCancel: randomFloat(5, 20),
      trend: randomChoice(['increasing', 'decreasing', 'stable'] as const),
    }
  }).sort((a, b) => b.count - a.count)
}

// =============================================================================
// SALES TODAY
// =============================================================================

export function generateMockSalesToday(seed?: string): SalesTodayMetrics {
  if (seed) resetRng(seed)
  else resetRng()

  const closedWon = randomInt(5, 18)
  const closedLost = randomInt(2, 8)

  return {
    date: new Date(),
    lastUpdated: new Date(),
    closedWon,
    closedWonValue: closedWon * randomInt(1500, 4500),
    closedLost,
    closedLostValue: closedLost * randomInt(1500, 4000),
    proposalsSent: randomInt(12, 30),
    proposalsValue: randomInt(40000, 100000),
    proposalsAccepted: randomInt(3, 10),
    proposalsDeclined: randomInt(1, 5),
    inspectionsScheduled: randomInt(20, 45),
    inspectionsCompleted: randomInt(15, 35),
    appointmentsSet: randomInt(25, 50),
    newLeadsReceived: randomInt(30, 70),
    leadsAssigned: randomInt(25, 60),
    leadsContacted: randomInt(40, 90),
    totalCalls: randomInt(200, 400),
    connectedCalls: randomInt(80, 180),
    vsYesterdayPercent: randomFloat(-15, 25),
    vsSameDayLastWeekPercent: randomFloat(-20, 30),
    vsDailyTargetPercent: randomFloat(-10, 20),
  }
}

// =============================================================================
// START RATE
// =============================================================================

export function generateMockStartRate(weeks: number = 12, seed?: string): StartRateMetric[] {
  if (seed) resetRng(seed)
  else resetRng()

  const metrics: StartRateMetric[] = []
  const now = new Date()

  for (let w = weeks - 1; w >= 0; w--) {
    const periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - (w + 1) * 7)
    const periodEnd = new Date(periodStart)
    periodEnd.setDate(periodEnd.getDate() + 7)

    const totalSold = randomInt(50, 100)
    const totalStarted = randomInt(Math.floor(totalSold * 0.75), Math.floor(totalSold * 0.95))
    const totalCanceled = randomInt(2, Math.floor(totalSold * 0.15))

    metrics.push({
      period: periodStart.toISOString().split('T')[0],
      periodStart,
      periodEnd,
      totalSold,
      totalStarted,
      totalCanceled,
      startRate: totalStarted / totalSold,
      cancelRate: totalCanceled / totalSold,
      avgDaysToStart: randomFloat(3, 12),
      byServiceType: {
        'General Pest': { sold: randomInt(20, 40), started: randomInt(18, 38), rate: randomFloat(0.85, 0.95) },
        'Termite': { sold: randomInt(10, 25), started: randomInt(8, 23), rate: randomFloat(0.80, 0.92) },
        'Commercial': { sold: randomInt(5, 15), started: randomInt(4, 14), rate: randomFloat(0.75, 0.90) },
      },
      byMarket: {
        'Northeast': { sold: randomInt(10, 20), started: randomInt(8, 18), rate: randomFloat(0.80, 0.95) },
        'Southeast': { sold: randomInt(12, 22), started: randomInt(10, 20), rate: randomFloat(0.82, 0.93) },
        'Midwest': { sold: randomInt(8, 18), started: randomInt(7, 16), rate: randomFloat(0.78, 0.90) },
      },
    })
  }

  return metrics
}

// =============================================================================
// EXPORT
// =============================================================================

export const mockSalesExtendedData = {
  generateSpeedToInstall: generateMockSpeedToInstall,
  generateSpeedToInstallDetails: generateMockSpeedToInstallDetails,
  generateBacklog: generateMockBacklog,
  generateBacklogSummary: generateMockBacklogSummary,
  generateCanceledAgreements: generateMockCanceledAgreements,
  generateCancelReasonAnalysis: generateMockCancelReasonAnalysis,
  generateSalesToday: generateMockSalesToday,
  generateStartRate: generateMockStartRate,
}
