import seedrandom from 'seedrandom'
import type {
  FinanceTransaction,
  ARAgingDetail,
  RevenueMetrics,
  CollectionMetrics,
  RevenueTrend,
  DSOTrend,
  CollectionAction,
  WriteOff,
  FinanceByBranch,
  FinanceDashboard,
  PaymentStatus,
  PaymentMethod,
  AgingBucket,
  RevenueType,
} from '@/types/finance-extended'

let rng: () => number

export function initializeFinanceSeed(seed: number = 12345) {
  rng = seedrandom(`finance-${seed}`)
}

initializeFinanceSeed()

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + rng() * (end.getTime() - start.getTime()))
}

const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'partial', 'overdue', 'written_off', 'disputed']
const PAYMENT_METHODS: PaymentMethod[] = ['credit_card', 'ach', 'check', 'cash', 'wire', 'autopay']
const AGING_BUCKETS: AgingBucket[] = ['current', '1_30', '31_60', '61_90', '90_plus']
const REVENUE_TYPES: RevenueType[] = ['recurring', 'one_time', 'service_call', 'material', 'termite']
const SERVICE_TYPES = ['Pest Control', 'Termite', 'Wildlife', 'Mosquito', 'Commercial', 'Bed Bug']

const COMPANY_NAMES = ['ABC Properties', 'Metro Hotels', 'City Schools', 'Regional Medical', 'Prime Retail', 'Industrial Parks']

const REGIONS = [
  { id: 'R16', name: 'Arkansas/Missouri' },
  { id: 'R23', name: 'Oklahoma/Kansas' },
  { id: 'R52', name: 'Texas East' },
  { id: 'R54', name: 'Texas Central' },
  { id: 'R75', name: 'Atlantic' },
]

export function generateFinanceTransactions(count: number = 1000): FinanceTransaction[] {
  const transactions: FinanceTransaction[] = []
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const date = randomDate(sixMonthsAgo, now)
    const type = randomChoice(['invoice', 'payment', 'credit', 'refund', 'adjustment'] as const)
    const amount = randomInt(100, 5000)
    const status = randomChoice(PAYMENT_STATUSES)

    const transaction: FinanceTransaction = {
      id: `FIN-${String(i + 1).padStart(6, '0')}`,
      date,
      type,
      accountId: `ACC-${String(randomInt(1, 500)).padStart(5, '0')}`,
      accountName: `${randomChoice(COMPANY_NAMES)} ${randomInt(1, 99)}`,
      amount,
      originalAmount: amount,
      appliedAmount: status === 'paid' ? amount : status === 'partial' ? Math.floor(amount * randomFloat(0.3, 0.8)) : 0,
      balanceRemaining: status === 'paid' ? 0 : status === 'partial' ? Math.floor(amount * randomFloat(0.2, 0.7)) : amount,
      invoiceNumber: type === 'invoice' ? `INV-${randomInt(10000, 99999)}` : undefined,
      invoiceDate: type === 'invoice' ? date : undefined,
      dueDate: type === 'invoice' ? new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
      status,
      paymentMethod: status === 'paid' || status === 'partial' ? randomChoice(PAYMENT_METHODS) : undefined,
      paymentDate: status === 'paid' ? new Date(date.getTime() + randomInt(5, 45) * 24 * 60 * 60 * 1000) : undefined,
      paymentReference: status === 'paid' ? `PMT-${randomInt(10000, 99999)}` : undefined,
      revenueType: randomChoice(REVENUE_TYPES),
      serviceType: randomChoice(SERVICE_TYPES),
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
    }

    transactions.push(transaction)
  }

  return transactions
}

export function generateARAgingDetails(count: number = 100): ARAgingDetail[] {
  const details: ARAgingDetail[] = []

  for (let i = 0; i < count; i++) {
    const totalBalance = randomInt(500, 50000)
    const current = Math.floor(totalBalance * randomFloat(0.3, 0.6))
    const remaining = totalBalance - current
    const days1_30 = Math.floor(remaining * randomFloat(0.2, 0.4))
    const days31_60 = Math.floor(remaining * randomFloat(0.1, 0.3))
    const days61_90 = Math.floor(remaining * randomFloat(0.05, 0.15))
    const days90Plus = remaining - days1_30 - days31_60 - days61_90

    details.push({
      accountId: `ACC-${String(i + 1).padStart(5, '0')}`,
      accountName: `${randomChoice(COMPANY_NAMES)} ${randomInt(1, 99)}`,
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
      current,
      days1_30: Math.max(0, days1_30),
      days31_60: Math.max(0, days31_60),
      days61_90: Math.max(0, days61_90),
      days90Plus: Math.max(0, days90Plus),
      totalBalance,
      lastPaymentDate: rng() > 0.3 ? randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()) : undefined,
      lastPaymentAmount: rng() > 0.3 ? randomInt(100, 5000) : undefined,
      avgPaymentDays: randomInt(15, 60),
      paymentTerms: randomChoice(['Net 30', 'Net 45', 'Net 60', 'Due on Receipt']),
      collectionStatus: randomChoice(['current', 'at_risk', 'in_collection', 'legal']),
      lastContactDate: rng() > 0.5 ? randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()) : undefined,
      nextActionDate: rng() > 0.4 ? randomDate(new Date(), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)) : undefined,
      assignedCollector: rng() > 0.6 ? `Collector ${randomInt(1, 10)}` : undefined,
    })
  }

  return details.sort((a, b) => b.totalBalance - a.totalBalance)
}

export function calculateRevenueMetrics(transactions: FinanceTransaction[]): RevenueMetrics {
  const invoices = transactions.filter(t => t.type === 'invoice')
  const payments = transactions.filter(t => t.type === 'payment')

  const totalRevenue = invoices.reduce((sum, t) => sum + t.amount, 0)
  const recurringRevenue = invoices.filter(t => t.revenueType === 'recurring').reduce((sum, t) => sum + t.amount, 0)
  const oneTimeRevenue = invoices.filter(t => t.revenueType === 'one_time').reduce((sum, t) => sum + t.amount, 0)
  const serviceCallRevenue = invoices.filter(t => t.revenueType === 'service_call').reduce((sum, t) => sum + t.amount, 0)

  const totalCollected = payments.reduce((sum, t) => sum + t.amount, 0)
  const totalAR = invoices.reduce((sum, t) => sum + t.balanceRemaining, 0)

  const byAgingBucket = AGING_BUCKETS.reduce((acc, bucket) => {
    acc[bucket] = randomInt(10000, 100000)
    return acc
  }, {} as Record<AgingBucket, number>)

  const byRevenueType = REVENUE_TYPES.reduce((acc, type) => {
    acc[type] = invoices.filter(t => t.revenueType === type).reduce((sum, t) => sum + t.amount, 0)
    return acc
  }, {} as Record<RevenueType, number>)

  const byPaymentMethod = PAYMENT_METHODS.reduce((acc, method) => {
    acc[method] = payments.filter(t => t.paymentMethod === method).reduce((sum, t) => sum + t.amount, 0)
    return acc
  }, {} as Record<PaymentMethod, number>)

  return {
    totalRevenue,
    recurringRevenue,
    oneTimeRevenue,
    serviceCallRevenue,
    mrr: recurringRevenue / 6,
    arr: (recurringRevenue / 6) * 12,
    mrrGrowth: randomFloat(2, 10),
    totalCollected,
    collectionRate: totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0,
    dso: randomInt(35, 55),
    totalAR,
    currentAR: Math.floor(totalAR * 0.6),
    pastDueAR: Math.floor(totalAR * 0.4),
    badDebtReserve: Math.floor(totalAR * 0.02),
    byAgingBucket,
    byRevenueType,
    byPaymentMethod,
  }
}

export function calculateCollectionMetrics(): CollectionMetrics {
  const totalOutstanding = randomInt(500000, 2000000)
  const currentBalance = Math.floor(totalOutstanding * randomFloat(0.5, 0.7))
  const pastDueBalance = totalOutstanding - currentBalance

  return {
    totalOutstanding,
    currentBalance,
    pastDueBalance,
    bucket1_30: Math.floor(pastDueBalance * 0.4),
    bucket31_60: Math.floor(pastDueBalance * 0.25),
    bucket61_90: Math.floor(pastDueBalance * 0.2),
    bucket90Plus: Math.floor(pastDueBalance * 0.15),
    collectedThisPeriod: randomInt(100000, 500000),
    writeOffsThisPeriod: randomInt(5000, 30000),
    dso: randomInt(35, 55),
    collectionEfficiency: randomFloat(85, 98),
    arTrendDirection: randomChoice(['improving', 'stable', 'worsening']),
    pastDueTrend: randomChoice(['improving', 'stable', 'worsening']),
  }
}

export function generateRevenueTrends(days: number = 30): RevenueTrend[] {
  const trends: RevenueTrend[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const totalRevenue = randomInt(20000, 80000)

    trends.push({
      date,
      totalRevenue,
      recurringRevenue: Math.floor(totalRevenue * randomFloat(0.6, 0.8)),
      oneTimeRevenue: Math.floor(totalRevenue * randomFloat(0.1, 0.3)),
      mrr: randomInt(150000, 250000),
      collections: randomInt(15000, 60000),
    })
  }

  return trends
}

export function generateDSOTrends(days: number = 30): DSOTrend[] {
  const trends: DSOTrend[] = []
  const now = new Date()
  const baseDSO = randomInt(40, 50)

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)

    trends.push({
      date,
      dso: baseDSO + randomInt(-5, 5),
      targetDso: 45,
      industryBenchmark: 52,
    })
  }

  return trends
}

export function generateCollectionActions(count: number = 50): CollectionAction[] {
  const actions: CollectionAction[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    actions.push({
      id: `COL-${String(i + 1).padStart(5, '0')}`,
      accountId: `ACC-${String(randomInt(1, 500)).padStart(5, '0')}`,
      accountName: `${randomChoice(COMPANY_NAMES)} ${randomInt(1, 99)}`,
      balance: randomInt(500, 25000),
      daysOverdue: randomInt(1, 120),
      actionType: randomChoice(['call', 'email', 'letter', 'collection_agency', 'legal']),
      scheduledDate: randomDate(now, new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
      assignedTo: `Collector ${randomInt(1, 10)}`,
      priority: randomChoice(['low', 'medium', 'high', 'critical']),
      status: randomChoice(['pending', 'in_progress', 'completed', 'escalated']),
      notes: 'Follow up on outstanding balance',
      lastContactResult: rng() > 0.5 ? randomChoice(['No answer', 'Left message', 'Promised payment', 'Dispute']) : undefined,
    })
  }

  return actions.sort((a, b) => b.balance - a.balance)
}

export function generateFinanceByBranch(): FinanceByBranch[] {
  const branches: FinanceByBranch[] = []

  for (let i = 0; i < 20; i++) {
    const revenue = randomInt(50000, 500000)
    const arBalance = randomInt(10000, 100000)

    branches.push({
      branchId: `BR-${String(i + 1).padStart(3, '0')}`,
      branchName: `Branch ${i + 1}`,
      regionId: randomChoice(REGIONS).id,
      revenue,
      revenueGrowth: randomFloat(-10, 25),
      collections: Math.floor(revenue * randomFloat(0.85, 0.98)),
      collectionRate: randomFloat(85, 98),
      arBalance,
      pastDueBalance: Math.floor(arBalance * randomFloat(0.2, 0.5)),
      dso: randomInt(30, 60),
      writeOffs: randomInt(0, 5000),
    })
  }

  return branches.sort((a, b) => b.revenue - a.revenue)
}

export function generateFinanceDashboard(): FinanceDashboard {
  const transactions = generateFinanceTransactions(1000)

  return {
    period: 'MTD',
    metrics: calculateRevenueMetrics(transactions),
    collectionMetrics: calculateCollectionMetrics(),
    revenueTrend: generateRevenueTrends(30),
    dsoTrend: generateDSOTrends(30),
    agingDetail: generateARAgingDetails(100),
    pendingActions: generateCollectionActions(50),
    byBranch: generateFinanceByBranch(),
  }
}
