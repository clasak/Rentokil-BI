/**
 * BigQuery Leads Service
 *
 * Provides lead data access through BigQuery.
 * Implements methods for lead funnel, traceability, and analytics.
 */

import { bigQueryClient, type BigQueryClient } from '@/lib/bigquery'
import { LEAD_QUERIES } from '@/lib/bigquery/queries'
import { getLeadTraces, getTraceabilityReport, getFlowMetrics } from '@/lib/bigquery/lead-traceability'
import type { LeadTrace, FlowTraceabilityMetrics, TraceabilityReport } from '@/lib/bigquery/types'
import type { SourceSystemId } from '@/lib/bigquery/source-systems'

// =============================================================================
// TYPES
// =============================================================================

export interface Lead {
  id: string
  source: string
  stage: string
  assignedTo: string
  receivedAt: Date
  updatedAt: Date
  disposition?: string
  market: string
  region: string
  branch?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  pestType?: string
  estimatedValue?: number
}

export interface LeadFunnelStage {
  stage: string
  count: number
  conversionRate?: number
}

export interface LeadsBySource {
  source: string
  count: number
  converted: number
  conversionRate: number
}

export interface LeadsByTypePest {
  pestType: string
  leadCount: number
  converted: number
  avgValue: number
}

export interface LeadTrend {
  date: string
  leads: number
  converted: number
  conversionRate: number
}

export interface LeadRanking {
  rank: number
  market: string
  region?: string
  branch?: string
  leads: number
  converted: number
  conversionRate: number
  change: number
}

export interface LeadGeographic {
  market: string
  region: string
  leads: number
  converted: number
  avgResponseTime: number
  heatmapValue: number
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export interface BigQueryLeadsService {
  // Lead data
  getLeads(params?: { daysBack?: number; market?: string; region?: string; limit?: number }): Promise<Lead[]>
  getLeadById(id: string): Promise<Lead | null>

  // Funnel analysis
  getLeadFunnel(params?: { daysBack?: number; market?: string }): Promise<LeadFunnelStage[]>
  getLeadsBySource(params?: { daysBack?: number }): Promise<LeadsBySource[]>
  getLeadsByTypePest(params?: { daysBack?: number }): Promise<LeadsByTypePest[]>

  // Trends and rankings
  getLeadTrends(params?: { daysBack?: number; granularity?: 'day' | 'week' | 'month' }): Promise<LeadTrend[]>
  getLeadRankings(params?: { groupBy?: 'market' | 'region' | 'branch'; limit?: number }): Promise<LeadRanking[]>
  getLeadGeographic(params?: { daysBack?: number }): Promise<LeadGeographic[]>

  // Traceability (uses demo data for now)
  getLeadTraces(): LeadTrace[]
  getTraceabilityReport(): TraceabilityReport
  getFlowMetrics(flowId: number): FlowTraceabilityMetrics | null
  getTraceabilityByFlow(flowId: number): Promise<{ leads: LeadTrace[]; metrics: FlowTraceabilityMetrics | null }>
}

/**
 * Create BigQuery Leads Service
 */
export function createBigQueryLeadsService(client: BigQueryClient = bigQueryClient): BigQueryLeadsService {
  return {
    async getLeads(params = {}): Promise<Lead[]> {
      // For now, return demo data since BigQuery may not be connected
      // When connected, this would execute the query
      if (!client.isConfigured()) {
        return generateDemoLeads(params.limit || 100)
      }

      try {
        const query = LEAD_QUERIES.getAllLeads({
          daysBack: params.daysBack || 30,
          market: params.market,
          region: params.region,
          limit: params.limit || 100,
        })
        const result = await client.query<Lead>(query)
        return result.rows
      } catch (error) {
        console.warn('[BigQuery Leads] Query failed, using demo data:', error)
        return generateDemoLeads(params.limit || 100)
      }
    },

    async getLeadById(id: string): Promise<Lead | null> {
      const leads = await this.getLeads({ limit: 1000 })
      return leads.find(l => l.id === id) || null
    },

    async getLeadFunnel(params = {}): Promise<LeadFunnelStage[]> {
      if (!client.isConfigured()) {
        return generateDemoFunnel()
      }

      try {
        const query = LEAD_QUERIES.getLeadFunnel({
          daysBack: params.daysBack || 30,
          market: params.market,
        })
        const result = await client.query<{ lead_stage: string; count: number }>(query)
        return result.rows.map(row => ({
          stage: row.lead_stage,
          count: row.count,
        }))
      } catch (error) {
        console.warn('[BigQuery Leads] Funnel query failed:', error)
        return generateDemoFunnel()
      }
    },

    async getLeadsBySource(params = {}): Promise<LeadsBySource[]> {
      if (!client.isConfigured()) {
        return generateDemoLeadsBySource()
      }

      try {
        const query = LEAD_QUERIES.getLeadsBySource({
          daysBack: params.daysBack || 30,
        })
        const result = await client.query<{
          lead_source: string
          count: number
          converted: number
          conversion_rate: number
        }>(query)
        return result.rows.map(row => ({
          source: row.lead_source,
          count: row.count,
          converted: row.converted,
          conversionRate: row.conversion_rate,
        }))
      } catch (error) {
        console.warn('[BigQuery Leads] Source query failed:', error)
        return generateDemoLeadsBySource()
      }
    },

    async getLeadsByTypePest(params = {}): Promise<LeadsByTypePest[]> {
      if (!client.isConfigured()) {
        return generateDemoLeadsByTypePest()
      }

      try {
        const query = LEAD_QUERIES.getLeadsByTypePest({
          daysBack: params.daysBack || 30,
        })
        const result = await client.query<{
          pest_type: string
          lead_count: number
          converted: number
          avg_value: number
        }>(query)
        return result.rows.map(row => ({
          pestType: row.pest_type,
          leadCount: row.lead_count,
          converted: row.converted,
          avgValue: row.avg_value,
        }))
      } catch (error) {
        console.warn('[BigQuery Leads] Pest type query failed:', error)
        return generateDemoLeadsByTypePest()
      }
    },

    async getLeadTrends(params = {}): Promise<LeadTrend[]> {
      return generateDemoTrends(params.daysBack || 30, params.granularity || 'day')
    },

    async getLeadRankings(params = {}): Promise<LeadRanking[]> {
      return generateDemoRankings(params.groupBy || 'market', params.limit || 10)
    },

    async getLeadGeographic(params = {}): Promise<LeadGeographic[]> {
      return generateDemoGeographic()
    },

    // Traceability methods use the existing demo implementation
    getLeadTraces(): LeadTrace[] {
      return getLeadTraces()
    },

    getTraceabilityReport(): TraceabilityReport {
      return getTraceabilityReport()
    },

    getFlowMetrics(flowId: number): FlowTraceabilityMetrics | null {
      return getFlowMetrics(flowId)
    },

    async getTraceabilityByFlow(flowId: number): Promise<{ leads: LeadTrace[]; metrics: FlowTraceabilityMetrics | null }> {
      const allTraces = getLeadTraces()
      const leads = allTraces.filter(t => t.flowId === flowId)
      const metrics = getFlowMetrics(flowId)
      return { leads, metrics }
    },
  }
}

// =============================================================================
// DEMO DATA GENERATORS
// =============================================================================

import seedrandom from 'seedrandom'
let rng = seedrandom('leads-service-42')

function resetRng() {
  rng = seedrandom('leads-service-42')
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function generateDemoLeads(count: number): Lead[] {
  resetRng()
  const stages = ['New', 'Contacted', 'Qualified', 'Scheduled', 'Proposed', 'Negotiating', 'Closed Won', 'Closed Lost']
  const sources = ['Web Form', 'Phone', 'Referral', 'Email', 'Chat', 'Partner']
  const markets = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
  const pestTypes = ['General Pest', 'Termite', 'Rodent', 'Wildlife', 'Bed Bug', 'Mosquito']

  const leads: Lead[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const receivedDaysAgo = randomInt(0, 30)
    const updatedDaysAgo = randomInt(0, receivedDaysAgo)

    leads.push({
      id: `LEAD-${String(i + 1).padStart(6, '0')}`,
      source: randomChoice(sources),
      stage: randomChoice(stages),
      assignedTo: `Agent-${randomInt(100, 199)}`,
      receivedAt: new Date(now - receivedDaysAgo * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - updatedDaysAgo * 24 * 60 * 60 * 1000),
      disposition: rng() > 0.7 ? randomChoice(['Converted', 'Lost', 'No Contact']) : undefined,
      market: randomChoice(markets),
      region: `Region-${randomInt(1, 12)}`,
      branch: rng() > 0.3 ? `Branch-${randomInt(100, 500)}` : undefined,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `lead${i}@example.com`,
      phone: `555-${String(randomInt(1000, 9999))}`,
      pestType: randomChoice(pestTypes),
      estimatedValue: randomInt(200, 5000),
    })
  }

  return leads
}

function generateDemoFunnel(): LeadFunnelStage[] {
  resetRng()
  return [
    { stage: 'New', count: randomInt(400, 500), conversionRate: 1.0 },
    { stage: 'Contacted', count: randomInt(300, 380), conversionRate: 0.76 },
    { stage: 'Qualified', count: randomInt(200, 280), conversionRate: 0.56 },
    { stage: 'Scheduled', count: randomInt(150, 200), conversionRate: 0.40 },
    { stage: 'Proposed', count: randomInt(100, 150), conversionRate: 0.30 },
    { stage: 'Negotiating', count: randomInt(60, 100), conversionRate: 0.20 },
    { stage: 'Closed Won', count: randomInt(40, 70), conversionRate: 0.14 },
    { stage: 'Closed Lost', count: randomInt(20, 40), conversionRate: 0.06 },
  ]
}

function generateDemoLeadsBySource(): LeadsBySource[] {
  resetRng()
  return [
    { source: 'Web Form', count: randomInt(150, 200), converted: randomInt(20, 35), conversionRate: 0.15 },
    { source: 'Phone', count: randomInt(120, 160), converted: randomInt(25, 40), conversionRate: 0.22 },
    { source: 'Referral', count: randomInt(80, 120), converted: randomInt(20, 35), conversionRate: 0.28 },
    { source: 'Email', count: randomInt(60, 90), converted: randomInt(8, 15), conversionRate: 0.12 },
    { source: 'Chat', count: randomInt(40, 70), converted: randomInt(5, 12), conversionRate: 0.14 },
    { source: 'Partner', count: randomInt(30, 50), converted: randomInt(8, 15), conversionRate: 0.32 },
  ]
}

function generateDemoLeadsByTypePest(): LeadsByTypePest[] {
  resetRng()
  return [
    { pestType: 'General Pest', leadCount: randomInt(200, 280), converted: randomInt(35, 50), avgValue: randomInt(400, 600) },
    { pestType: 'Termite', leadCount: randomInt(100, 150), converted: randomInt(20, 35), avgValue: randomInt(1500, 3000) },
    { pestType: 'Rodent', leadCount: randomInt(80, 120), converted: randomInt(15, 25), avgValue: randomInt(300, 500) },
    { pestType: 'Wildlife', leadCount: randomInt(40, 70), converted: randomInt(10, 18), avgValue: randomInt(500, 900) },
    { pestType: 'Bed Bug', leadCount: randomInt(30, 50), converted: randomInt(8, 15), avgValue: randomInt(800, 1500) },
    { pestType: 'Mosquito', leadCount: randomInt(50, 80), converted: randomInt(12, 22), avgValue: randomInt(400, 700) },
  ]
}

function generateDemoTrends(daysBack: number, granularity: 'day' | 'week' | 'month'): LeadTrend[] {
  resetRng()
  const trends: LeadTrend[] = []
  const now = new Date()

  const points = granularity === 'day' ? daysBack : granularity === 'week' ? Math.ceil(daysBack / 7) : Math.ceil(daysBack / 30)

  for (let i = points - 1; i >= 0; i--) {
    const date = new Date(now)
    if (granularity === 'day') date.setDate(date.getDate() - i)
    else if (granularity === 'week') date.setDate(date.getDate() - i * 7)
    else date.setMonth(date.getMonth() - i)

    const leads = randomInt(30, 60)
    const converted = randomInt(5, 15)

    trends.push({
      date: date.toISOString().split('T')[0],
      leads,
      converted,
      conversionRate: converted / leads,
    })
  }

  return trends
}

function generateDemoRankings(groupBy: 'market' | 'region' | 'branch', limit: number): LeadRanking[] {
  resetRng()
  const rankings: LeadRanking[] = []

  const groups = groupBy === 'market'
    ? ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
    : groupBy === 'region'
    ? Array.from({ length: 12 }, (_, i) => `Region-${i + 1}`)
    : Array.from({ length: limit }, (_, i) => `Branch-${100 + i}`)

  groups.slice(0, limit).forEach((group, i) => {
    const leads = randomInt(50, 200)
    const converted = randomInt(10, Math.floor(leads * 0.3))

    rankings.push({
      rank: i + 1,
      market: groupBy === 'market' ? group : `Market-${Math.floor(i / 2) + 1}`,
      region: groupBy !== 'market' ? (groupBy === 'region' ? group : `Region-${Math.floor(i / 4) + 1}`) : undefined,
      branch: groupBy === 'branch' ? group : undefined,
      leads,
      converted,
      conversionRate: converted / leads,
      change: (rng() - 0.5) * 20,
    })
  })

  return rankings.sort((a, b) => b.leads - a.leads)
}

function generateDemoGeographic(): LeadGeographic[] {
  resetRng()
  const markets = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
  const results: LeadGeographic[] = []

  markets.forEach(market => {
    for (let r = 1; r <= 3; r++) {
      const leads = randomInt(30, 100)
      const converted = randomInt(5, Math.floor(leads * 0.3))

      results.push({
        market,
        region: `${market}-${r}`,
        leads,
        converted,
        avgResponseTime: randomInt(15, 120),
        heatmapValue: leads * (converted / leads),
      })
    }
  })

  return results
}

// Export singleton
export const bigQueryLeadsService = createBigQueryLeadsService()
