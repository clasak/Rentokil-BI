import seedrandom from 'seedrandom'
import type {
  SalesTransaction,
  SalesQuota,
  SalesMetrics,
  SalesTrend,
  SalesLeaderboard,
  SalesByProduct,
  SalesByRegion,
  SalesVelocity,
  SalesDashboard,
  SalesChannel,
  SalesType,
  ContractType,
} from '@/types/sales-extended'

let rng: () => number

export function initializeSalesExtendedSeed(seed: number = 12345) {
  rng = seedrandom(`sales-ext-${seed}`)
}

initializeSalesExtendedSeed()

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

const SALES_CHANNELS: SalesChannel[] = ['direct', 'inside_sales', 'field_sales', 'partner', 'digital']
const SALES_TYPES: SalesType[] = ['new_business', 'expansion', 'renewal', 'reactivation']
const CONTRACT_TYPES: ContractType[] = ['monthly', 'quarterly', 'annual', 'multi_year']
const SERVICE_LINES = ['Pest Control', 'Termite', 'Wildlife', 'Mosquito', 'Commercial', 'Bed Bug', 'Rodent']

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
const COMPANY_NAMES = ['ABC Corp', 'XYZ Industries', 'Metro Hotels', 'City Properties', 'Regional Foods', 'Prime Retail']

const REGIONS = [
  { id: 'R16', name: 'Arkansas/Missouri' },
  { id: 'R23', name: 'Oklahoma/Kansas' },
  { id: 'R52', name: 'Texas East' },
  { id: 'R54', name: 'Texas Central' },
  { id: 'R75', name: 'Atlantic' },
]

export function generateSalesTransactions(count: number = 500): SalesTransaction[] {
  const transactions: SalesTransaction[] = []
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const date = randomDate(sixMonthsAgo, now)
    const salesType = randomChoice(SALES_TYPES)
    const isNewCustomer = salesType === 'new_business'
    const contractType = randomChoice(CONTRACT_TYPES)
    const recurringRevenue = randomInt(100, 2000)
    const oneTimeRevenue = randomInt(0, 500)
    const contractMonths = contractType === 'monthly' ? 1 : contractType === 'quarterly' ? 3 : contractType === 'annual' ? 12 : 24

    const transaction: SalesTransaction = {
      id: `TXN-${String(i + 1).padStart(6, '0')}`,
      date,
      accountId: `ACC-${String(randomInt(1, 1000)).padStart(5, '0')}`,
      accountName: `${randomChoice(COMPANY_NAMES)} ${randomInt(1, 99)}`,
      isNewCustomer,
      salesType,
      channel: randomChoice(SALES_CHANNELS),
      oneTimeRevenue,
      recurringRevenue,
      totalRevenue: oneTimeRevenue + recurringRevenue,
      contractType,
      contractStartDate: date,
      contractEndDate: new Date(date.getTime() + contractMonths * 30 * 24 * 60 * 60 * 1000),
      contractValue: recurringRevenue * contractMonths,
      mrr: recurringRevenue,
      serviceTypes: [randomChoice(SERVICE_LINES)],
      repId: `REP-${String(randomInt(1, 50)).padStart(3, '0')}`,
      repName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
      leadSource: randomChoice(['Inbound', 'Outbound', 'Referral', 'Web', 'Partner']),
      campaignId: rng() > 0.7 ? `CAMP-${randomInt(1, 20)}` : undefined,
    }

    transactions.push(transaction)
  }

  return transactions
}

export function generateSalesQuotas(count: number = 50): SalesQuota[] {
  const quotas: SalesQuota[] = []

  for (let i = 0; i < count; i++) {
    const newBusinessQuota = randomInt(30000, 100000)
    const renewalQuota = randomInt(20000, 60000)
    const totalQuota = newBusinessQuota + renewalQuota
    const newBusinessActual = Math.floor(newBusinessQuota * randomFloat(0.5, 1.3))
    const renewalActual = Math.floor(renewalQuota * randomFloat(0.6, 1.2))
    const totalActual = newBusinessActual + renewalActual

    quotas.push({
      id: `QUOTA-${String(i + 1).padStart(4, '0')}`,
      period: 'Q1 2025',
      repId: `REP-${String(i + 1).padStart(3, '0')}`,
      repName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: randomChoice(REGIONS).id,
      newBusinessQuota,
      renewalQuota,
      totalQuota,
      newBusinessActual,
      renewalActual,
      totalActual,
      attainmentPercent: (totalActual / totalQuota) * 100,
      gapToQuota: totalQuota - totalActual,
      onTrackForQuota: totalActual >= totalQuota * 0.75,
    })
  }

  return quotas
}

export function calculateSalesMetrics(transactions: SalesTransaction[]): SalesMetrics {
  const totalRevenue = transactions.reduce((sum, t) => sum + t.totalRevenue, 0)
  const newBusinessRevenue = transactions.filter(t => t.salesType === 'new_business').reduce((sum, t) => sum + t.totalRevenue, 0)
  const expansionRevenue = transactions.filter(t => t.salesType === 'expansion').reduce((sum, t) => sum + t.totalRevenue, 0)
  const renewalRevenue = transactions.filter(t => t.salesType === 'renewal').reduce((sum, t) => sum + t.totalRevenue, 0)

  const byChannel = SALES_CHANNELS.reduce((acc, channel) => {
    acc[channel] = transactions.filter(t => t.channel === channel).reduce((sum, t) => sum + t.totalRevenue, 0)
    return acc
  }, {} as Record<SalesChannel, number>)

  const byType = SALES_TYPES.reduce((acc, type) => {
    acc[type] = transactions.filter(t => t.salesType === type).reduce((sum, t) => sum + t.totalRevenue, 0)
    return acc
  }, {} as Record<SalesType, number>)

  const byServiceLine = SERVICE_LINES.reduce((acc, service) => {
    acc[service] = transactions.filter(t => t.serviceTypes.includes(service)).reduce((sum, t) => sum + t.totalRevenue, 0)
    return acc
  }, {} as Record<string, number>)

  return {
    totalRevenue,
    newBusinessRevenue,
    expansionRevenue,
    renewalRevenue,
    revenueGrowth: randomFloat(5, 20),
    yoyGrowth: randomFloat(-5, 25),
    newCustomers: transactions.filter(t => t.isNewCustomer).length,
    avgDealSize: totalRevenue / transactions.length,
    avgContractLength: 12,
    salesCycleLength: randomInt(25, 50),
    winRate: randomFloat(25, 45),
    quotaAttainment: randomFloat(75, 120),
    byChannel,
    byType,
    byServiceLine,
  }
}

export function generateSalesTrends(days: number = 30): SalesTrend[] {
  const trends: SalesTrend[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const transactions = randomInt(10, 30)
    const revenue = transactions * randomInt(500, 2000)

    trends.push({
      date,
      revenue,
      newBusiness: Math.floor(revenue * randomFloat(0.4, 0.6)),
      renewal: Math.floor(revenue * randomFloat(0.3, 0.5)),
      transactions,
      avgDealSize: revenue / transactions,
    })
  }

  return trends
}

export function generateSalesLeaderboard(count: number = 20): SalesLeaderboard[] {
  const leaderboard: SalesLeaderboard[] = []

  for (let i = 0; i < count; i++) {
    const revenue = randomInt(30000, 200000)
    const transactions = randomInt(15, 80)
    const priorPeriodRevenue = randomInt(25000, 180000)

    leaderboard.push({
      repId: `REP-${String(i + 1).padStart(3, '0')}`,
      repName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      branchName: `Branch ${randomInt(1, 50)}`,
      revenue,
      transactions,
      avgDealSize: revenue / transactions,
      quotaAttainment: randomFloat(60, 150),
      rank: 0,
      priorPeriodRevenue,
      growth: ((revenue - priorPeriodRevenue) / priorPeriodRevenue) * 100,
    })
  }

  return leaderboard
    .sort((a, b) => b.revenue - a.revenue)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export function generateSalesByProduct(): SalesByProduct[] {
  const total = randomInt(500000, 1500000)

  return SERVICE_LINES.map(productLine => {
    const revenue = randomInt(30000, 300000)
    return {
      productLine,
      revenue,
      transactions: randomInt(50, 300),
      avgDealSize: randomInt(500, 3000),
      growth: randomFloat(-10, 30),
      percentOfTotal: (revenue / total) * 100,
    }
  }).sort((a, b) => b.revenue - a.revenue)
}

export function generateSalesByRegion(): SalesByRegion[] {
  return REGIONS.map(region => {
    const quota = randomInt(200000, 500000)
    const revenue = Math.floor(quota * randomFloat(0.6, 1.3))

    return {
      regionId: region.id,
      regionName: region.name,
      revenue,
      quota,
      attainment: (revenue / quota) * 100,
      growth: randomFloat(-5, 25),
      transactions: randomInt(50, 200),
      avgDealSize: randomInt(800, 2500),
      topRep: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
    }
  }).sort((a, b) => b.revenue - a.revenue)
}

export function generateSalesVelocity(): SalesVelocity[] {
  const stages = ['Qualification', 'Proposal', 'Negotiation', 'Contract', 'Closed']

  return stages.map(stage => ({
    stage,
    avgDays: randomInt(3, 15),
    conversionRate: randomFloat(50, 90),
    value: randomInt(100000, 500000),
    deals: randomInt(20, 100),
  }))
}

export function generateSalesDashboard(): SalesDashboard {
  const transactions = generateSalesTransactions(500)

  return {
    period: 'MTD',
    metrics: calculateSalesMetrics(transactions),
    trend: generateSalesTrends(30),
    leaderboard: generateSalesLeaderboard(20),
    byProduct: generateSalesByProduct(),
    byRegion: generateSalesByRegion(),
    velocity: generateSalesVelocity(),
    quotaProgress: generateSalesQuotas(50),
  }
}
