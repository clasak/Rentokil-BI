/**
 * Mock Leads Data
 *
 * Synthetic lead data for development and testing.
 */

import seedrandom from 'seedrandom'
import type { Lead, LeadFunnelStage, LeadsBySource, LeadsByTypePest, LeadTrend, LeadRanking, LeadGeographic } from '@/types/leads'

let rng = seedrandom('leads-mock-42')

function resetRng(seed = 'leads-mock-42') {
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

// =============================================================================
// LEAD DATA
// =============================================================================

const STAGES = ['New', 'Contacted', 'Qualified', 'Scheduled', 'Inspected', 'Proposed', 'Negotiating', 'Closed Won', 'Closed Lost'] as const
const SOURCES = ['Web Form', 'Phone', 'Referral', 'Email', 'Chat', 'Partner', 'Outbound', 'Social']
const PEST_TYPES = ['General Pest', 'Termite', 'Rodent', 'Wildlife', 'Bed Bug', 'Mosquito', 'Commercial']
const MARKETS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
const DISPOSITIONS = ['Converted', 'Lost', 'No Contact', 'Not Interested', 'Bad Contact', 'Duplicate', 'Scheduled', 'Callback'] as const

export function generateMockLeads(count: number = 500, seed?: string): Lead[] {
  if (seed) resetRng(seed)
  else resetRng()

  const leads: Lead[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const receivedDaysAgo = randomInt(0, 60)
    const updatedDaysAgo = randomInt(0, receivedDaysAgo)
    const stage = randomChoice(STAGES)
    const isClosed = stage === 'Closed Won' || stage === 'Closed Lost'

    leads.push({
      id: `LEAD-${String(i + 1).padStart(6, '0')}`,
      source: randomChoice(SOURCES),
      stage,
      assignedTo: `Agent-${randomInt(100, 199)}`,
      receivedAt: new Date(now - receivedDaysAgo * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - updatedDaysAgo * 24 * 60 * 60 * 1000),
      disposition: isClosed ? randomChoice(DISPOSITIONS) : undefined,
      market: randomChoice(MARKETS),
      region: `Region-${randomInt(1, 12)}`,
      branch: rng() > 0.3 ? `Branch-${randomInt(100, 500)}` : undefined,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `lead${i}@example.com`,
      phone: `555-${String(randomInt(1000, 9999))}`,
      pestType: randomChoice(PEST_TYPES),
      estimatedValue: randomInt(200, 8000),
    })
  }

  return leads
}

// =============================================================================
// FUNNEL DATA
// =============================================================================

export function generateMockFunnel(seed?: string): LeadFunnelStage[] {
  if (seed) resetRng(seed)
  else resetRng()

  const total = randomInt(800, 1200)
  let remaining = total

  return STAGES.map((stage, i) => {
    const dropRate = i === 0 ? 0 : randomFloat(0.15, 0.35)
    const count = i === 0 ? total : Math.floor(remaining * (1 - dropRate))
    remaining = count

    return {
      stage,
      count,
      value: count * randomInt(1500, 3500),
      conversionRate: count / total,
      avgTimeInStage: randomFloat(4, 72),
      dropoffRate: dropRate,
    }
  })
}

// =============================================================================
// LEADS BY SOURCE
// =============================================================================

export function generateMockLeadsBySource(seed?: string): LeadsBySource[] {
  if (seed) resetRng(seed)
  else resetRng()

  return SOURCES.map(source => {
    const count = randomInt(50, 250)
    const converted = randomInt(5, Math.floor(count * 0.35))
    return {
      source,
      count,
      converted,
      conversionRate: converted / count,
      avgValue: randomInt(1500, 4000),
    }
  }).sort((a, b) => b.count - a.count)
}

// =============================================================================
// LEADS BY PEST TYPE
// =============================================================================

export function generateMockLeadsByTypePest(seed?: string): LeadsByTypePest[] {
  if (seed) resetRng(seed)
  else resetRng()

  return PEST_TYPES.map(pestType => {
    const leadCount = randomInt(30, 200)
    const converted = randomInt(5, Math.floor(leadCount * 0.3))
    const avgValue = pestType === 'Termite' ? randomInt(2000, 5000) :
                     pestType === 'Commercial' ? randomInt(3000, 8000) :
                     randomInt(400, 1500)

    return {
      pestType,
      leadCount,
      converted,
      avgValue,
      marketShare: leadCount / 1000,
    }
  }).sort((a, b) => b.leadCount - a.leadCount)
}

// =============================================================================
// LEAD TRENDS
// =============================================================================

export function generateMockLeadTrends(daysBack: number = 30, seed?: string): LeadTrend[] {
  if (seed) resetRng(seed)
  else resetRng()

  const trends: LeadTrend[] = []
  const now = new Date()

  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Add weekly seasonality
    const dayOfWeek = date.getDay()
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1.0

    const leads = Math.floor(randomInt(25, 55) * weekendFactor)
    const converted = randomInt(3, Math.floor(leads * 0.25))

    trends.push({
      date: date.toISOString().split('T')[0],
      leads,
      converted,
      conversionRate: converted / leads,
      avgValue: randomInt(1800, 3200),
    })
  }

  return trends
}

// =============================================================================
// LEAD RANKINGS
// =============================================================================

export function generateMockLeadRankings(
  groupBy: 'market' | 'region' | 'branch' = 'market',
  limit: number = 10,
  seed?: string
): LeadRanking[] {
  if (seed) resetRng(seed)
  else resetRng()

  const entities = groupBy === 'market' ? MARKETS :
                   groupBy === 'region' ? Array.from({ length: 12 }, (_, i) => `Region-${i + 1}`) :
                   Array.from({ length: limit }, (_, i) => `Branch-${100 + i}`)

  return entities.slice(0, limit).map((entity, i) => {
    const leads = randomInt(80, 300)
    const converted = randomInt(10, Math.floor(leads * 0.3))
    const change = randomFloat(-15, 15)

    return {
      rank: i + 1,
      entity,
      entityType: groupBy,
      leads,
      converted,
      conversionRate: converted / leads,
      change,
      trend: (change > 2 ? 'up' : change < -2 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
    }
  }).sort((a, b) => b.conversionRate - a.conversionRate)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

// =============================================================================
// LEAD GEOGRAPHIC
// =============================================================================

export function generateMockLeadGeographic(seed?: string): LeadGeographic[] {
  if (seed) resetRng(seed)
  else resetRng()

  const results: LeadGeographic[] = []

  MARKETS.forEach(market => {
    for (let r = 1; r <= 4; r++) {
      const leads = randomInt(40, 150)
      const converted = randomInt(5, Math.floor(leads * 0.3))

      results.push({
        market,
        region: `${market}-${r}`,
        leads,
        converted,
        avgResponseTime: randomInt(10, 180),
        heatmapValue: leads * (converted / leads),
      })
    }
  })

  return results
}

// =============================================================================
// EXPORT ALL GENERATORS
// =============================================================================

export const mockLeadsData = {
  generateLeads: generateMockLeads,
  generateFunnel: generateMockFunnel,
  generateBySource: generateMockLeadsBySource,
  generateByTypePest: generateMockLeadsByTypePest,
  generateTrends: generateMockLeadTrends,
  generateRankings: generateMockLeadRankings,
  generateGeographic: generateMockLeadGeographic,
}
