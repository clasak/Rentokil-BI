import seedrandom from 'seedrandom'
import type {
  Lead,
  LeadSource,
  LeadStatus,
  LeadQuality,
  LeadChannel,
  LeadMetrics,
  LeadTrend,
  LeadFunnel,
  LeadPerformance,
  LeadSourceAnalysis,
  LeadDashboard,
} from '@/types/leads'

let rng: () => number

export function initializeLeadsSeed(seed: number = 12345) {
  rng = seedrandom(`leads-${seed}`)
}

initializeLeadsSeed()

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

const LEAD_SOURCES: LeadSource[] = [
  'inbound_call', 'web_form', 'referral', 'canvass', 'door_knock',
  'trade_show', 'partner', 'reactivation', 'cross_sell', 'upsell'
]

const LEAD_STATUSES: LeadStatus[] = [
  'new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost', 'disqualified'
]

const LEAD_QUALITIES: LeadQuality[] = ['hot', 'warm', 'cold']

const LEAD_CHANNELS: LeadChannel[] = ['phone', 'email', 'web', 'in_person', 'chat']

const SERVICE_TYPES = ['Pest Control', 'Termite', 'Wildlife', 'Mosquito', 'Bed Bug', 'Commercial', 'Rodent Control']

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
const COMPANY_NAMES = ['ABC Corp', 'XYZ Industries', 'Tech Solutions', 'Global Services', 'Premier Holdings', 'Metro Properties']
const CITIES = ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Phoenix', 'Denver', 'Atlanta', 'Miami', 'Chicago', 'Seattle']
const STATES = ['TX', 'TX', 'TX', 'TX', 'AZ', 'CO', 'GA', 'FL', 'IL', 'WA']

export function generateLeads(count: number = 500): Lead[] {
  const leads: Lead[] = []
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const createdAt = randomDate(sixMonthsAgo, now)
    const status = randomChoice(LEAD_STATUSES)
    const cityIndex = randomInt(0, CITIES.length - 1)

    const lead: Lead = {
      id: `LEAD-${String(i + 1).padStart(6, '0')}`,
      createdAt,
      source: randomChoice(LEAD_SOURCES),
      channel: randomChoice(LEAD_CHANNELS),
      status,
      quality: randomChoice(LEAD_QUALITIES),
      contactName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      contactPhone: `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
      contactEmail: `contact${i}@example.com`,
      companyName: rng() > 0.6 ? randomChoice(COMPANY_NAMES) : undefined,
      address: `${randomInt(100, 9999)} ${randomChoice(['Main', 'Oak', 'Elm', 'Park', 'Cedar'])} ${randomChoice(['St', 'Ave', 'Blvd', 'Dr', 'Ln'])}`,
      city: CITIES[cityIndex],
      state: STATES[cityIndex],
      zipCode: String(randomInt(10000, 99999)),
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: `R${randomInt(16, 90)}`,
      serviceType: randomChoice(SERVICE_TYPES),
      estimatedValue: randomInt(200, 15000),
      urgency: randomChoice(['immediate', 'soon', 'researching']),
      assignedRepId: rng() > 0.2 ? `REP-${String(randomInt(1, 100)).padStart(3, '0')}` : undefined,
      assignedRepName: rng() > 0.2 ? `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}` : undefined,
      firstContactDate: status !== 'new' ? new Date(createdAt.getTime() + randomInt(1, 24) * 60 * 60 * 1000) : undefined,
      lastContactDate: ['contacted', 'qualified', 'proposal_sent', 'negotiating'].includes(status)
        ? new Date(now.getTime() - randomInt(1, 30) * 24 * 60 * 60 * 1000)
        : undefined,
      nextFollowUpDate: ['contacted', 'qualified', 'proposal_sent', 'negotiating'].includes(status)
        ? new Date(now.getTime() + randomInt(1, 14) * 24 * 60 * 60 * 1000)
        : undefined,
      contactAttempts: status === 'new' ? 0 : randomInt(1, 8),
      convertedOpportunityId: status === 'won' ? `OPP-${String(randomInt(1, 1000)).padStart(6, '0')}` : undefined,
      lostReason: status === 'lost' ? randomChoice(['Price', 'Competition', 'No response', 'Wrong timing', 'Not qualified']) : undefined,
      notes: `Lead from ${randomChoice(LEAD_SOURCES)} - ${randomChoice(SERVICE_TYPES)} interest`,
    }

    leads.push(lead)
  }

  return leads
}

export function calculateLeadMetrics(leads: Lead[]): LeadMetrics {
  const totalLeads = leads.length
  const newLeads = leads.filter(l => l.status === 'new').length
  const contactedLeads = leads.filter(l => l.status === 'contacted').length
  const qualifiedLeads = leads.filter(l => l.status === 'qualified').length
  const convertedLeads = leads.filter(l => l.status === 'won').length
  const lostLeads = leads.filter(l => l.status === 'lost').length

  const bySource = LEAD_SOURCES.reduce((acc, source) => {
    acc[source] = leads.filter(l => l.source === source).length
    return acc
  }, {} as Record<LeadSource, number>)

  const byChannel = LEAD_CHANNELS.reduce((acc, channel) => {
    acc[channel] = leads.filter(l => l.channel === channel).length
    return acc
  }, {} as Record<LeadChannel, number>)

  const byQuality = LEAD_QUALITIES.reduce((acc, quality) => {
    acc[quality] = leads.filter(l => l.quality === quality).length
    return acc
  }, {} as Record<LeadQuality, number>)

  return {
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,
    convertedLeads,
    lostLeads,
    conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    avgTimeToContact: 4.5,
    avgTimeToConvert: 21,
    avgLeadValue: leads.reduce((sum, l) => sum + l.estimatedValue, 0) / totalLeads,
    bySource,
    byChannel,
    byQuality,
  }
}

export function generateLeadTrends(days: number = 30): LeadTrend[] {
  const trends: LeadTrend[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const baseLeads = randomInt(15, 40)

    trends.push({
      date,
      leadsCreated: baseLeads,
      leadsContacted: Math.floor(baseLeads * randomFloat(0.6, 0.9)),
      leadsConverted: Math.floor(baseLeads * randomFloat(0.1, 0.25)),
      leadsLost: Math.floor(baseLeads * randomFloat(0.05, 0.15)),
      conversionRate: randomFloat(10, 25),
    })
  }

  return trends
}

export function generateLeadFunnel(): LeadFunnel[] {
  return LEAD_STATUSES.filter(s => !['won', 'lost', 'disqualified'].includes(s)).map((stage, index) => ({
    stage,
    count: randomInt(50, 200) * (LEAD_STATUSES.length - index),
    value: randomInt(50000, 500000) * (LEAD_STATUSES.length - index),
    avgAge: randomInt(1, 15),
    conversionRate: randomFloat(40, 85),
  }))
}

export function generateLeadPerformance(count: number = 20): LeadPerformance[] {
  const performances: LeadPerformance[] = []

  for (let i = 0; i < count; i++) {
    const leadsAssigned = randomInt(20, 100)
    const leadsContacted = Math.floor(leadsAssigned * randomFloat(0.7, 0.95))
    const leadsConverted = Math.floor(leadsContacted * randomFloat(0.15, 0.35))

    performances.push({
      repId: `REP-${String(i + 1).padStart(3, '0')}`,
      repName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      leadsAssigned,
      leadsContacted,
      leadsConverted,
      avgResponseTime: randomFloat(0.5, 8),
      conversionRate: (leadsConverted / leadsAssigned) * 100,
      totalValue: leadsConverted * randomInt(500, 5000),
    })
  }

  return performances.sort((a, b) => b.conversionRate - a.conversionRate)
}

export function generateLeadSourceAnalysis(): LeadSourceAnalysis[] {
  return LEAD_SOURCES.map(source => {
    const leads = randomInt(50, 300)
    const conversions = Math.floor(leads * randomFloat(0.1, 0.3))
    const avgValue = randomInt(500, 5000)

    return {
      source,
      leads,
      conversions,
      conversionRate: (conversions / leads) * 100,
      avgValue,
      totalValue: conversions * avgValue,
      costPerLead: randomInt(20, 150),
      roi: randomFloat(1.5, 8),
    }
  })
}

export function generateLeadDashboard(): LeadDashboard {
  const leads = generateLeads(500)

  return {
    period: 'MTD',
    metrics: calculateLeadMetrics(leads),
    trend: generateLeadTrends(30),
    funnel: generateLeadFunnel(),
    topPerformers: generateLeadPerformance(10),
    sourceAnalysis: generateLeadSourceAnalysis(),
  }
}
