/**
 * Mock Finance Extended Data
 *
 * Synthetic data for finance operations including AR, projections, and P&L.
 */

import seedrandom from 'seedrandom'
import type {
  ARAgingBucket,
  ARAgingSummary,
  ARDetailItem,
  RevenueProjection,
  PnLStatement,
  PnLLineItem,
  DSOMetric,
} from '@/types/finance-extended'

let rng = seedrandom('finance-42')

function resetRng(seed = 'finance-42') {
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

// =============================================================================
// AR AGING
// =============================================================================

export function generateMockARAgingSummary(seed?: string): ARAgingSummary {
  if (seed) resetRng(seed)
  else resetRng()

  const current = { count: randomInt(500, 800), amount: randomInt(400000, 700000) }
  const days1_30 = { count: randomInt(150, 300), amount: randomInt(100000, 250000) }
  const days31_60 = { count: randomInt(80, 150), amount: randomInt(60000, 150000) }
  const days61_90 = { count: randomInt(40, 80), amount: randomInt(30000, 80000) }
  const days90Plus = { count: randomInt(20, 50), amount: randomInt(20000, 60000) }

  const totalOutstanding = current.amount + days1_30.amount + days31_60.amount + days61_90.amount + days90Plus.amount
  const totalInvoices = current.count + days1_30.count + days31_60.count + days61_90.count + days90Plus.count
  const highRiskAmount = days61_90.amount + days90Plus.amount

  const buckets: ARAgingBucket[] = [
    {
      bucket: 'current',
      bucketLabel: 'Current',
      invoiceCount: current.count,
      totalAmount: current.amount,
      percentOfTotal: current.amount / totalOutstanding,
      avgDaysOutstanding: randomFloat(5, 15),
      topAccounts: generateTopAccounts(3),
    },
    {
      bucket: '1-30',
      bucketLabel: '1-30 Days',
      invoiceCount: days1_30.count,
      totalAmount: days1_30.amount,
      percentOfTotal: days1_30.amount / totalOutstanding,
      avgDaysOutstanding: randomFloat(15, 25),
      topAccounts: generateTopAccounts(3),
    },
    {
      bucket: '31-60',
      bucketLabel: '31-60 Days',
      invoiceCount: days31_60.count,
      totalAmount: days31_60.amount,
      percentOfTotal: days31_60.amount / totalOutstanding,
      avgDaysOutstanding: randomFloat(40, 55),
      topAccounts: generateTopAccounts(3),
    },
    {
      bucket: '61-90',
      bucketLabel: '61-90 Days',
      invoiceCount: days61_90.count,
      totalAmount: days61_90.amount,
      percentOfTotal: days61_90.amount / totalOutstanding,
      avgDaysOutstanding: randomFloat(70, 85),
      topAccounts: generateTopAccounts(3),
    },
    {
      bucket: '90+',
      bucketLabel: '90+ Days',
      invoiceCount: days90Plus.count,
      totalAmount: days90Plus.amount,
      percentOfTotal: days90Plus.amount / totalOutstanding,
      avgDaysOutstanding: randomFloat(100, 150),
      topAccounts: generateTopAccounts(3),
    },
  ]

  return {
    asOfDate: new Date(),
    totalOutstanding,
    totalInvoices,
    avgDaysOutstanding: randomFloat(25, 40),
    buckets,
    totalVsLastMonth: randomFloat(-50000, 80000),
    totalVsLastMonthPercent: randomFloat(-8, 12),
    highRiskAmount,
    highRiskPercent: highRiskAmount / totalOutstanding,
    collectedMTD: randomInt(300000, 600000),
    collectedVsTarget: randomFloat(-10, 15),
  }
}

function generateTopAccounts(count: number): ARAgingBucket['topAccounts'] {
  return Array.from({ length: count }, (_, i) => ({
    accountId: `ACC-${randomInt(1000, 9999)}`,
    accountName: `Customer ${randomInt(1, 500)}`,
    amount: randomInt(5000, 30000),
    daysOutstanding: randomInt(1, 120),
  }))
}

export function generateMockARDetails(count: number = 100, seed?: string): ARDetailItem[] {
  if (seed) resetRng(seed)
  else resetRng()

  const items: ARDetailItem[] = []
  const now = Date.now()
  const statuses = ['current', 'overdue', 'collections', 'write_off'] as const
  const buckets = ['current', '1-30', '31-60', '61-90', '90+'] as const

  for (let i = 0; i < count; i++) {
    const daysOutstanding = randomInt(0, 150)
    const bucket = daysOutstanding <= 0 ? 'current' :
                   daysOutstanding <= 30 ? '1-30' :
                   daysOutstanding <= 60 ? '31-60' :
                   daysOutstanding <= 90 ? '61-90' : '90+'
    const originalAmount = randomInt(200, 8000)
    const paidAmount = rng() > 0.7 ? randomInt(0, originalAmount) : 0

    items.push({
      invoiceId: `INV-${String(i + 1).padStart(6, '0')}`,
      invoiceNumber: `INV-2024-${String(randomInt(1000, 9999))}`,
      accountId: `ACC-${randomInt(1000, 9999)}`,
      accountName: `Customer ${i + 1}`,
      accountType: rng() > 0.8 ? 'commercial' : 'residential',
      market: randomChoice(MARKETS),
      region: `Region-${randomInt(1, 12)}`,
      originalAmount,
      paidAmount,
      balanceDue: originalAmount - paidAmount,
      invoiceDate: new Date(now - (daysOutstanding + randomInt(0, 30)) * 24 * 60 * 60 * 1000),
      dueDate: new Date(now - daysOutstanding * 24 * 60 * 60 * 1000),
      lastPaymentDate: paidAmount > 0 ? new Date(now - randomInt(1, 30) * 24 * 60 * 60 * 1000) : undefined,
      daysOutstanding,
      status: daysOutstanding > 90 ? 'collections' : daysOutstanding > 0 ? 'overdue' : 'current',
      agingBucket: bucket,
      collectionStatus: daysOutstanding > 60 ? randomChoice(['Called', 'Left message', 'Promise to pay', 'Disputed']) : undefined,
    })
  }

  return items
}

// =============================================================================
// REVENUE PROJECTIONS
// =============================================================================

export function generateMockRevenueProjections(months: number = 6, seed?: string): RevenueProjection[] {
  if (seed) resetRng(seed)
  else resetRng()

  const projections: RevenueProjection[] = []
  const now = new Date()

  for (let m = 0; m < months; m++) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() + m, 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + m + 1, 0)

    const pipelineValue = randomInt(300000, 600000)
    const weightedPipeline = pipelineValue * randomFloat(0.4, 0.6)
    const recurringRevenue = randomInt(400000, 700000)
    const renewalRevenue = randomInt(50000, 150000)
    const expansionRevenue = randomInt(20000, 80000)

    const totalProjected = weightedPipeline + recurringRevenue + renewalRevenue + expansionRevenue
    const target = randomInt(600000, 900000)

    projections.push({
      period: periodStart.toISOString().slice(0, 7),
      periodStart,
      periodEnd,
      pipelineValue,
      weightedPipeline,
      expectedClose: weightedPipeline,
      recurringRevenue,
      renewalRevenue,
      expansionRevenue,
      totalProjected,
      confidenceLevel: m < 2 ? 'high' : m < 4 ? 'medium' : 'low',
      vsTarget: totalProjected - target,
      vsTargetPercent: (totalProjected - target) / target * 100,
      vsPriorYear: randomInt(-100000, 150000),
      vsPriorYearPercent: randomFloat(-15, 20),
    })
  }

  return projections
}

// =============================================================================
// P&L STATEMENT
// =============================================================================

export function generateMockPnL(period: string = 'MTD', seed?: string): PnLStatement {
  if (seed) resetRng(seed)
  else resetRng()

  const revenue = randomInt(800000, 1500000)
  const cogs = revenue * randomFloat(0.35, 0.45)
  const grossProfit = revenue - cogs
  const opex = revenue * randomFloat(0.30, 0.40)
  const operatingIncome = grossProfit - opex
  const otherIncome = randomInt(5000, 20000)
  const otherExpense = randomInt(10000, 30000)
  const netIncome = operatingIncome + otherIncome - otherExpense

  const lineItems: PnLLineItem[] = [
    { category: 'revenue', label: 'Service Revenue', amount: revenue * 0.85 },
    { category: 'revenue', label: 'Product Revenue', amount: revenue * 0.10 },
    { category: 'revenue', label: 'Other Revenue', amount: revenue * 0.05 },
    { category: 'cost_of_goods_sold', label: 'Labor', amount: cogs * 0.60 },
    { category: 'cost_of_goods_sold', label: 'Materials', amount: cogs * 0.25 },
    { category: 'cost_of_goods_sold', label: 'Vehicle', amount: cogs * 0.15 },
    { category: 'operating_expenses', label: 'Sales & Marketing', amount: opex * 0.35 },
    { category: 'operating_expenses', label: 'G&A', amount: opex * 0.40 },
    { category: 'operating_expenses', label: 'Facilities', amount: opex * 0.15 },
    { category: 'operating_expenses', label: 'Technology', amount: opex * 0.10 },
  ]

  return {
    period,
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    periodEnd: new Date(),
    entityType: 'company',
    revenue,
    costOfGoodsSold: cogs,
    grossProfit,
    grossMargin: grossProfit / revenue,
    operatingExpenses: opex,
    operatingIncome,
    operatingMargin: operatingIncome / revenue,
    netIncome,
    netMargin: netIncome / revenue,
    lineItems,
    vsBudget: {
      revenue: randomFloat(-5, 10),
      grossProfit: randomFloat(-8, 12),
      operatingIncome: randomFloat(-10, 15),
      netIncome: randomFloat(-12, 18),
    },
    vsPriorYear: {
      revenue: randomFloat(-5, 15),
      grossProfit: randomFloat(-8, 18),
      operatingIncome: randomFloat(-10, 20),
      netIncome: randomFloat(-12, 22),
    },
  }
}

// =============================================================================
// DSO METRICS
// =============================================================================

export function generateMockDSOMetrics(months: number = 12, seed?: string): DSOMetric[] {
  if (seed) resetRng(seed)
  else resetRng()

  const metrics: DSOMetric[] = []
  const now = new Date()

  for (let m = months - 1; m >= 0; m--) {
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - m, 0)
    const dso = randomFloat(28, 48)
    const target = 35

    metrics.push({
      period: periodEnd.toISOString().slice(0, 7),
      periodEnd,
      dso,
      target,
      variance: dso - target,
      trend: dso < target ? 'improving' : dso > target + 5 ? 'worsening' : 'stable',
      avgInvoiceAmount: randomInt(400, 800),
      avgPaymentDays: randomFloat(25, 45),
      collectionEfficiency: randomFloat(0.75, 0.95),
      byAccountType: {
        residential: randomFloat(25, 40),
        commercial: randomFloat(35, 55),
      },
      byMarket: MARKETS.reduce((acc, market) => {
        acc[market] = randomFloat(28, 50)
        return acc
      }, {} as Record<string, number>),
    })
  }

  return metrics
}

// =============================================================================
// EXPORT
// =============================================================================

export const mockFinanceExtendedData = {
  generateARAgingSummary: generateMockARAgingSummary,
  generateARDetails: generateMockARDetails,
  generateRevenueProjections: generateMockRevenueProjections,
  generatePnL: generateMockPnL,
  generateDSOMetrics: generateMockDSOMetrics,
}
