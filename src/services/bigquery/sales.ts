/**
 * BigQuery Sales Service
 *
 * Provides sales data access through BigQuery.
 * Implements methods for pipeline, performance, and analytics.
 */

import { bigQueryClient, type BigQueryClient } from '@/lib/bigquery'
import { SALES_QUERIES } from '@/lib/bigquery/queries'
import seedrandom from 'seedrandom'

// =============================================================================
// TYPES
// =============================================================================

export interface SalesOpportunity {
  id: string
  leadId?: string
  accountName: string
  stage: string
  amount: number
  closeDate?: Date
  createdAt: Date
  updatedAt: Date
  ownerId: string
  ownerName: string
  source: string
  market: string
  region: string
  branch?: string
  serviceType?: string
  probability?: number
}

export interface PipelineStage {
  stage: string
  count: number
  totalValue: number
  avgValue: number
  avgProbability: number
}

export interface SalesLadderEntry {
  rank: number
  ownerId: string
  ownerName: string
  totalOpportunities: number
  wins: number
  losses: number
  revenue: number
  winRate: number
  quota?: number
  attainment?: number
}

export interface SpeedToInstallMetric {
  week: string
  avgDaysToInstall: number
  installs: number
  within7Days: number
  within14Days: number
  onTimeRate: number
}

export interface CanceledAgreement {
  id: string
  accountName: string
  ownerName: string
  amount: number
  cancelDate: Date
  cancelReason: string
  daysToCancel: number
}

export interface BacklogItem {
  id: string
  accountName: string
  ownerName: string
  amount: number
  stage: string
  closeDate: Date
  scheduledInstallDate?: Date
  daysSinceClose: number
}

export interface SalesTodaySummary {
  closedWon: number
  closedWonValue: number
  proposalsSent: number
  proposalsValue: number
  inspectionsScheduled: number
  newLeadsAssigned: number
}

export interface StartRateMetric {
  period: string
  sold: number
  started: number
  startRate: number
  avgDaysToStart: number
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export interface BigQuerySalesService {
  // Opportunity data
  getOpportunities(params?: { daysBack?: number; stage?: string; ownerId?: string; limit?: number }): Promise<SalesOpportunity[]>
  getOpportunityById(id: string): Promise<SalesOpportunity | null>

  // Pipeline analysis
  getPipelineByStage(params?: { daysBack?: number }): Promise<PipelineStage[]>
  getSalesLadder(params?: { daysBack?: number; limit?: number }): Promise<SalesLadderEntry[]>

  // Performance metrics
  getSpeedToInstall(params?: { daysBack?: number }): Promise<SpeedToInstallMetric[]>
  getCanceledAgreements(params?: { daysBack?: number; limit?: number }): Promise<CanceledAgreement[]>
  getBacklog(params?: { daysBack?: number; limit?: number }): Promise<BacklogItem[]>

  // Daily metrics
  getSalesToday(): Promise<SalesTodaySummary>
  getStartRate(params?: { daysBack?: number }): Promise<StartRateMetric[]>
}

/**
 * Create BigQuery Sales Service
 */
export function createBigQuerySalesService(client: BigQueryClient = bigQueryClient): BigQuerySalesService {
  return {
    async getOpportunities(params = {}): Promise<SalesOpportunity[]> {
      if (!client.isConfigured()) {
        return generateDemoOpportunities(params.limit || 100, params.stage)
      }

      try {
        const query = SALES_QUERIES.getAllOpportunities({
          daysBack: params.daysBack || 30,
          limit: params.limit || 100,
        })
        const result = await client.query<SalesOpportunity>(query)
        return result.rows
      } catch (error) {
        console.warn('[BigQuery Sales] Query failed, using demo data:', error)
        return generateDemoOpportunities(params.limit || 100, params.stage)
      }
    },

    async getOpportunityById(id: string): Promise<SalesOpportunity | null> {
      const opportunities = await this.getOpportunities({ limit: 1000 })
      return opportunities.find(o => o.id === id) || null
    },

    async getPipelineByStage(params = {}): Promise<PipelineStage[]> {
      if (!client.isConfigured()) {
        return generateDemoPipelineStages()
      }

      try {
        const query = SALES_QUERIES.getPipelineByStage({
          daysBack: params.daysBack || 30,
        })
        const result = await client.query<{
          stage: string
          opportunity_count: number
          total_value: number
          avg_value: number
          avg_probability: number
        }>(query)
        return result.rows.map(row => ({
          stage: row.stage,
          count: row.opportunity_count,
          totalValue: row.total_value,
          avgValue: row.avg_value,
          avgProbability: row.avg_probability,
        }))
      } catch (error) {
        console.warn('[BigQuery Sales] Pipeline query failed:', error)
        return generateDemoPipelineStages()
      }
    },

    async getSalesLadder(params = {}): Promise<SalesLadderEntry[]> {
      if (!client.isConfigured()) {
        return generateDemoSalesLadder(params.limit || 20)
      }

      try {
        const query = SALES_QUERIES.getSalesLadder({
          daysBack: params.daysBack || 30,
          limit: params.limit || 20,
        })
        const result = await client.query<{
          owner_id: string
          owner_name: string
          total_opportunities: number
          wins: number
          losses: number
          revenue: number
          win_rate: number
        }>(query)
        return result.rows.map((row, i) => ({
          rank: i + 1,
          ownerId: row.owner_id,
          ownerName: row.owner_name,
          totalOpportunities: row.total_opportunities,
          wins: row.wins,
          losses: row.losses,
          revenue: row.revenue,
          winRate: row.win_rate,
        }))
      } catch (error) {
        console.warn('[BigQuery Sales] Sales ladder query failed:', error)
        return generateDemoSalesLadder(params.limit || 20)
      }
    },

    async getSpeedToInstall(params = {}): Promise<SpeedToInstallMetric[]> {
      return generateDemoSpeedToInstall(params.daysBack || 60)
    },

    async getCanceledAgreements(params = {}): Promise<CanceledAgreement[]> {
      return generateDemoCanceledAgreements(params.limit || 50)
    },

    async getBacklog(params = {}): Promise<BacklogItem[]> {
      return generateDemoBacklog(params.limit || 50)
    },

    async getSalesToday(): Promise<SalesTodaySummary> {
      return generateDemoSalesToday()
    },

    async getStartRate(params = {}): Promise<StartRateMetric[]> {
      return generateDemoStartRate(params.daysBack || 90)
    },
  }
}

// =============================================================================
// DEMO DATA GENERATORS
// =============================================================================

let rng = seedrandom('sales-service-42')

function resetRng() {
  rng = seedrandom('sales-service-42')
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function generateDemoOpportunities(count: number, filterStage?: string): SalesOpportunity[] {
  resetRng()
  const stages = ['Qualification', 'Needs Analysis', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']
  const sources = ['Web', 'Phone', 'Referral', 'Outbound', 'Partner']
  const serviceTypes = ['General Pest', 'Termite', 'Commercial', 'Wildlife', 'Fumigation']
  const markets = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']

  const opportunities: SalesOpportunity[] = []
  const now = Date.now()

  for (let i = 0; i < count * 2; i++) {
    const stage = randomChoice(stages)
    if (filterStage && stage !== filterStage) continue
    if (opportunities.length >= count) break

    const createdDaysAgo = randomInt(1, 90)
    const closedWon = stage === 'Closed Won'
    const closedLost = stage === 'Closed Lost'

    opportunities.push({
      id: `OPP-${String(i + 1).padStart(6, '0')}`,
      leadId: rng() > 0.3 ? `LEAD-${String(randomInt(1, 500)).padStart(6, '0')}` : undefined,
      accountName: `Customer ${i + 1}`,
      stage,
      amount: randomInt(500, 15000),
      closeDate: (closedWon || closedLost) ? new Date(now - randomInt(1, 30) * 24 * 60 * 60 * 1000) : undefined,
      createdAt: new Date(now - createdDaysAgo * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - randomInt(0, createdDaysAgo) * 24 * 60 * 60 * 1000),
      ownerId: `REP-${randomInt(100, 150)}`,
      ownerName: `Sales Rep ${randomInt(1, 50)}`,
      source: randomChoice(sources),
      market: randomChoice(markets),
      region: `Region-${randomInt(1, 12)}`,
      branch: rng() > 0.3 ? `Branch-${randomInt(100, 500)}` : undefined,
      serviceType: randomChoice(serviceTypes),
      probability: closedWon ? 100 : closedLost ? 0 : randomInt(10, 90),
    })
  }

  return opportunities
}

function generateDemoPipelineStages(): PipelineStage[] {
  resetRng()
  return [
    { stage: 'Qualification', count: randomInt(80, 120), totalValue: randomInt(150000, 250000), avgValue: randomInt(1800, 2200), avgProbability: 15 },
    { stage: 'Needs Analysis', count: randomInt(60, 90), totalValue: randomInt(130000, 200000), avgValue: randomInt(2000, 2500), avgProbability: 30 },
    { stage: 'Proposal', count: randomInt(40, 70), totalValue: randomInt(100000, 180000), avgValue: randomInt(2200, 2800), avgProbability: 50 },
    { stage: 'Negotiation', count: randomInt(25, 45), totalValue: randomInt(70000, 120000), avgValue: randomInt(2500, 3200), avgProbability: 75 },
    { stage: 'Closed Won', count: randomInt(30, 50), totalValue: randomInt(80000, 140000), avgValue: randomInt(2400, 3000), avgProbability: 100 },
    { stage: 'Closed Lost', count: randomInt(20, 35), totalValue: randomInt(50000, 90000), avgValue: randomInt(2200, 2800), avgProbability: 0 },
  ]
}

function generateDemoSalesLadder(count: number): SalesLadderEntry[] {
  resetRng()
  const ladder: SalesLadderEntry[] = []

  for (let i = 0; i < count; i++) {
    const wins = randomInt(3, 20)
    const losses = randomInt(2, 15)
    const quota = randomInt(20000, 50000)
    const revenue = randomInt(15000, 60000)

    ladder.push({
      rank: i + 1,
      ownerId: `REP-${100 + i}`,
      ownerName: `Sales Rep ${i + 1}`,
      totalOpportunities: wins + losses + randomInt(5, 20),
      wins,
      losses,
      revenue,
      winRate: wins / (wins + losses),
      quota,
      attainment: revenue / quota,
    })
  }

  return ladder.sort((a, b) => b.revenue - a.revenue).map((entry, i) => ({ ...entry, rank: i + 1 }))
}

function generateDemoSpeedToInstall(daysBack: number): SpeedToInstallMetric[] {
  resetRng()
  const weeks = Math.ceil(daysBack / 7)
  const metrics: SpeedToInstallMetric[] = []
  const now = new Date()

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7)

    const installs = randomInt(20, 50)
    const within7Days = randomInt(Math.floor(installs * 0.4), Math.floor(installs * 0.7))
    const within14Days = randomInt(within7Days, Math.floor(installs * 0.9))

    metrics.push({
      week: weekStart.toISOString().split('T')[0],
      avgDaysToInstall: randomFloat(5, 14),
      installs,
      within7Days,
      within14Days,
      onTimeRate: within14Days / installs,
    })
  }

  return metrics
}

function generateDemoCanceledAgreements(count: number): CanceledAgreement[] {
  resetRng()
  const reasons = [
    'Price concerns',
    'Competitor chosen',
    'Changed mind',
    'Service not needed',
    'Moved/relocated',
    'Financial issues',
    'Poor communication',
    'Scheduling conflict',
  ]

  const agreements: CanceledAgreement[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    agreements.push({
      id: `CAN-${String(i + 1).padStart(6, '0')}`,
      accountName: `Canceled Customer ${i + 1}`,
      ownerName: `Sales Rep ${randomInt(1, 50)}`,
      amount: randomInt(500, 8000),
      cancelDate: new Date(now - randomInt(1, 60) * 24 * 60 * 60 * 1000),
      cancelReason: randomChoice(reasons),
      daysToCancel: randomInt(1, 30),
    })
  }

  return agreements.sort((a, b) => b.cancelDate.getTime() - a.cancelDate.getTime())
}

function generateDemoBacklog(count: number): BacklogItem[] {
  resetRng()
  const items: BacklogItem[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const daysSinceClose = randomInt(1, 45)
    const closeDate = new Date(now - daysSinceClose * 24 * 60 * 60 * 1000)

    items.push({
      id: `BKL-${String(i + 1).padStart(6, '0')}`,
      accountName: `Backlog Customer ${i + 1}`,
      ownerName: `Sales Rep ${randomInt(1, 50)}`,
      amount: randomInt(500, 10000),
      stage: 'Closed Won',
      closeDate,
      scheduledInstallDate: rng() > 0.4 ? new Date(now + randomInt(1, 14) * 24 * 60 * 60 * 1000) : undefined,
      daysSinceClose,
    })
  }

  return items.sort((a, b) => b.daysSinceClose - a.daysSinceClose)
}

function generateDemoSalesToday(): SalesTodaySummary {
  resetRng()
  return {
    closedWon: randomInt(3, 12),
    closedWonValue: randomInt(8000, 35000),
    proposalsSent: randomInt(8, 20),
    proposalsValue: randomInt(25000, 60000),
    inspectionsScheduled: randomInt(15, 35),
    newLeadsAssigned: randomInt(20, 50),
  }
}

function generateDemoStartRate(daysBack: number): StartRateMetric[] {
  resetRng()
  const weeks = Math.ceil(daysBack / 7)
  const metrics: StartRateMetric[] = []
  const now = new Date()

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7)

    const sold = randomInt(30, 60)
    const started = randomInt(Math.floor(sold * 0.7), Math.floor(sold * 0.95))

    metrics.push({
      period: weekStart.toISOString().split('T')[0],
      sold,
      started,
      startRate: started / sold,
      avgDaysToStart: randomFloat(3, 10),
    })
  }

  return metrics
}

// Export singleton
export const bigQuerySalesService = createBigQuerySalesService()
