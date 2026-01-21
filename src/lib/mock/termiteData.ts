/**
 * Mock Termite Data
 *
 * Synthetic data for termite-specific operations including PNI and renewals.
 */

import seedrandom from 'seedrandom'
import type {
  PNIInspection,
  PNISummary,
  TermiteRenewal,
  RenewalSummary,
  TermiteClaim,
} from '@/types/termite'

let rng = seedrandom('termite-42')

function resetRng(seed = 'termite-42') {
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

const PROPERTY_TYPES = ['single_family', 'multi_family', 'condo', 'townhouse', 'commercial'] as const
const INSPECTION_TYPES = ['real_estate', 'new_construction', 'existing_home', 'annual_renewal', 'callback'] as const
const FOUNDATION_TYPES = ['slab', 'crawlspace', 'basement', 'pier_beam', 'mixed'] as const
const TREATMENT_TYPES = ['liquid_barrier', 'bait_system', 'fumigation', 'spot_treatment', 'wood_treatment', 'preventive'] as const
const DAMAGE_LEVELS = ['none', 'minor', 'moderate', 'severe', 'extensive'] as const
const MARKETS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']

// =============================================================================
// PNI INSPECTIONS
// =============================================================================

export function generateMockPNIInspections(count: number = 100, seed?: string): PNIInspection[] {
  if (seed) resetRng(seed)
  else resetRng()

  const inspections: PNIInspection[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const inspectionDaysAgo = randomInt(0, 60)
    const inspectionDate = new Date(now - inspectionDaysAgo * 24 * 60 * 60 * 1000)
    const activityFound = rng() > 0.65
    const proposalSent = rng() > 0.3
    const saleConverted = proposalSent && rng() > 0.5

    const damageLevel = activityFound ? randomChoice(DAMAGE_LEVELS.slice(1)) : 'none'
    const estimatedCost = damageLevel === 'none' ? randomInt(300, 800) :
                          damageLevel === 'minor' ? randomInt(800, 2000) :
                          damageLevel === 'moderate' ? randomInt(2000, 4000) :
                          damageLevel === 'severe' ? randomInt(4000, 8000) :
                          randomInt(8000, 15000)

    inspections.push({
      id: `PNI-${String(i + 1).padStart(6, '0')}`,
      accountId: `ACC-${randomInt(1000, 9999)}`,
      accountName: `Property Owner ${i + 1}`,
      propertyAddress: `${randomInt(100, 9999)} ${randomChoice(['Oak', 'Main', 'Elm', 'Pine', 'Cedar'])} ${randomChoice(['St', 'Ave', 'Blvd', 'Dr'])}`,
      propertyType: randomChoice(PROPERTY_TYPES),
      inspectorId: `TECH-${randomInt(100, 150)}`,
      inspectorName: `Inspector ${randomInt(1, 20)}`,
      inspectionDate,
      inspectionType: randomChoice(INSPECTION_TYPES),
      status: saleConverted ? 'converted' : proposalSent ? 'proposal_sent' : activityFound ? 'needs_follow_up' : 'completed',
      squareFootage: randomInt(1200, 4500),
      yearBuilt: randomInt(1960, 2020),
      foundationType: randomChoice(FOUNDATION_TYPES),
      constructionType: randomChoice(['wood_frame', 'brick', 'stucco', 'concrete', 'mixed'] as const),
      termiteActivityFound: activityFound,
      activityType: activityFound ? randomChoice(['subterranean', 'drywood', 'formosan'] as const) : undefined,
      damageLevel: damageLevel as typeof DAMAGE_LEVELS[number],
      infestationAreas: activityFound ? [randomChoice(['basement', 'crawlspace', 'attic', 'garage', 'exterior'])] : undefined,
      moistureIssues: rng() > 0.7,
      woodToGroundContact: rng() > 0.6,
      treatmentRecommended: [randomChoice(TREATMENT_TYPES)],
      estimatedCost,
      urgency: damageLevel === 'severe' || damageLevel === 'extensive' ? 'immediate' : activityFound ? 'soon' : 'preventive',
      proposalSent,
      proposalDate: proposalSent ? new Date(inspectionDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000) : undefined,
      proposalAmount: proposalSent ? estimatedCost * randomFloat(1.0, 1.3) : undefined,
      saleConverted,
      saleAmount: saleConverted ? estimatedCost * randomFloat(0.9, 1.2) : undefined,
    })
  }

  return inspections
}

export function generateMockPNISummary(seed?: string): PNISummary {
  if (seed) resetRng(seed)
  else resetRng()

  const totalInspections = randomInt(150, 250)
  const completedInspections = randomInt(Math.floor(totalInspections * 0.85), totalInspections)
  const withActivityFound = randomInt(Math.floor(completedInspections * 0.25), Math.floor(completedInspections * 0.40))
  const proposalsSent = randomInt(Math.floor(withActivityFound * 0.7), withActivityFound)
  const salesConverted = randomInt(Math.floor(proposalsSent * 0.4), Math.floor(proposalsSent * 0.65))
  const totalRevenue = salesConverted * randomInt(1500, 4000)

  return {
    period: 'MTD',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    periodEnd: new Date(),
    totalInspections,
    completedInspections,
    pendingInspections: totalInspections - completedInspections,
    withActivityFound,
    activityRate: withActivityFound / completedInspections,
    avgDamageLevel: randomFloat(1.5, 2.5),
    proposalsSent,
    proposalRate: proposalsSent / withActivityFound,
    salesConverted,
    conversionRate: salesConverted / proposalsSent,
    totalRevenue,
    avgSaleAmount: totalRevenue / salesConverted,
    byInspectionType: {
      real_estate: { count: randomInt(40, 80), activityRate: randomFloat(0.20, 0.35), conversionRate: randomFloat(0.45, 0.65), revenue: randomInt(30000, 80000) },
      new_construction: { count: randomInt(20, 40), activityRate: randomFloat(0.05, 0.15), conversionRate: randomFloat(0.70, 0.90), revenue: randomInt(15000, 40000) },
      existing_home: { count: randomInt(50, 100), activityRate: randomFloat(0.30, 0.45), conversionRate: randomFloat(0.40, 0.55), revenue: randomInt(50000, 120000) },
      annual_renewal: { count: randomInt(30, 60), activityRate: randomFloat(0.10, 0.20), conversionRate: randomFloat(0.80, 0.95), revenue: randomInt(20000, 50000) },
      callback: { count: randomInt(10, 25), activityRate: randomFloat(0.50, 0.70), conversionRate: randomFloat(0.60, 0.80), revenue: randomInt(10000, 30000) },
    },
    topInspectors: Array.from({ length: 5 }, (_, i) => ({
      inspectorId: `TECH-${100 + i}`,
      inspectorName: `Inspector ${i + 1}`,
      inspections: randomInt(20, 50),
      conversionRate: randomFloat(0.45, 0.70),
      revenue: randomInt(15000, 50000),
    })),
  }
}

// =============================================================================
// RENEWALS
// =============================================================================

export function generateMockTermiteRenewals(count: number = 80, seed?: string): TermiteRenewal[] {
  if (seed) resetRng(seed)
  else resetRng()

  const renewals: TermiteRenewal[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const renewalDaysFromNow = randomInt(-30, 90)
    const renewalDate = new Date(now + renewalDaysFromNow * 24 * 60 * 60 * 1000)
    const currentValue = randomInt(300, 1200)
    const priceChange = randomFloat(-0.05, 0.15)
    const proposedValue = Math.round(currentValue * (1 + priceChange))

    const status = renewalDaysFromNow < -14 ? randomChoice(['renewed', 'canceled', 'lapsed'] as const) :
                   renewalDaysFromNow < 0 ? 'due' :
                   renewalDaysFromNow < 30 ? 'upcoming' : 'upcoming'

    renewals.push({
      id: `REN-${String(i + 1).padStart(6, '0')}`,
      contractId: `CON-${randomInt(10000, 99999)}`,
      accountId: `ACC-${randomInt(1000, 9999)}`,
      accountName: `Renewal Customer ${i + 1}`,
      propertyAddress: `${randomInt(100, 9999)} ${randomChoice(['Oak', 'Main', 'Elm'])} St`,
      originalStartDate: new Date(now - randomInt(365, 2000) * 24 * 60 * 60 * 1000),
      currentTermStart: new Date(now - randomInt(30, 365) * 24 * 60 * 60 * 1000),
      currentTermEnd: renewalDate,
      renewalDate,
      daysUntilRenewal: renewalDaysFromNow,
      currentAnnualValue: currentValue,
      proposedRenewalValue: proposedValue,
      priceChange: proposedValue - currentValue,
      priceChangePercent: priceChange * 100,
      status,
      renewalType: randomChoice(['annual', 'multi_year', 'month_to_month'] as const),
      autoRenew: rng() > 0.4,
      treatmentType: randomChoice(TREATMENT_TYPES),
      lastServiceDate: new Date(now - randomInt(30, 180) * 24 * 60 * 60 * 1000),
      servicesThisTerm: randomInt(1, 4),
      claimsThisTerm: rng() > 0.9 ? randomInt(1, 2) : 0,
      churnRisk: rng() > 0.8 ? 'high' : rng() > 0.5 ? 'medium' : 'low',
      riskFactors: rng() > 0.7 ? ['Price sensitivity', 'Competitor activity'] : undefined,
      competitorThreat: rng() > 0.85,
    })
  }

  return renewals.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
}

export function generateMockRenewalSummary(seed?: string): RenewalSummary {
  if (seed) resetRng(seed)
  else resetRng()

  const totalDue = randomInt(80, 150)
  const totalValue = totalDue * randomInt(400, 800)
  const renewed = randomInt(Math.floor(totalDue * 0.75), Math.floor(totalDue * 0.90))
  const renewedValue = renewed * randomInt(450, 850)
  const canceled = randomInt(5, Math.floor(totalDue * 0.12))
  const canceledValue = canceled * randomInt(350, 700)

  return {
    period: 'MTD',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    periodEnd: new Date(),
    totalDue,
    totalValue,
    renewed,
    renewedValue,
    renewalRate: renewed / totalDue,
    canceled,
    canceledValue,
    cancelRate: canceled / totalDue,
    pending: totalDue - renewed - canceled,
    pendingValue: totalValue - renewedValue - canceledValue,
    avgPriceIncrease: randomFloat(15, 45),
    avgPriceIncreasePercent: randomFloat(3, 8),
    priceIncreaseAcceptance: randomFloat(0.85, 0.95),
    highRiskCount: randomInt(5, 15),
    highRiskValue: randomInt(3000, 10000),
  }
}

// =============================================================================
// CLAIMS
// =============================================================================

export function generateMockTermiteClaims(count: number = 30, seed?: string): TermiteClaim[] {
  if (seed) resetRng(seed)
  else resetRng()

  const claims: TermiteClaim[] = []
  const now = Date.now()
  const statuses = ['reported', 'under_review', 'inspection_scheduled', 'inspected', 'approved', 'denied', 'paid', 'closed'] as const
  const resolutions = ['full_payment', 'partial_payment', 'denied_not_covered', 'denied_pre_existing', 'denied_maintenance', 'withdrawn'] as const

  for (let i = 0; i < count; i++) {
    const claimDaysAgo = randomInt(1, 120)
    const claimDate = new Date(now - claimDaysAgo * 24 * 60 * 60 * 1000)
    const status = randomChoice(statuses)
    const isResolved = ['approved', 'denied', 'paid', 'closed'].includes(status)

    claims.push({
      id: `CLM-${String(i + 1).padStart(6, '0')}`,
      contractId: `CON-${randomInt(10000, 99999)}`,
      accountId: `ACC-${randomInt(1000, 9999)}`,
      accountName: `Claim Customer ${i + 1}`,
      propertyAddress: `${randomInt(100, 9999)} ${randomChoice(['Oak', 'Main', 'Elm'])} St`,
      claimDate,
      reportedBy: randomChoice(['Customer', 'Inspector', 'Technician']),
      damageDescription: 'Termite damage observed in ' + randomChoice(['crawlspace', 'basement', 'attic', 'exterior wall']),
      damageLocation: [randomChoice(['basement', 'crawlspace', 'attic', 'garage', 'exterior'])],
      inspectionDate: status !== 'reported' ? new Date(claimDate.getTime() + randomInt(3, 14) * 24 * 60 * 60 * 1000) : undefined,
      inspectorId: status !== 'reported' ? `TECH-${randomInt(100, 150)}` : undefined,
      damageLevel: randomChoice(DAMAGE_LEVELS.slice(1)) as typeof DAMAGE_LEVELS[number],
      estimatedRepairCost: randomInt(500, 15000),
      isCovered: rng() > 0.25,
      status,
      resolution: isResolved ? randomChoice(resolutions) : undefined,
      paidAmount: status === 'paid' || status === 'closed' ? randomInt(500, 12000) : undefined,
      resolvedDate: isResolved ? new Date(claimDate.getTime() + randomInt(14, 60) * 24 * 60 * 60 * 1000) : undefined,
      daysToResolve: isResolved ? randomInt(14, 60) : undefined,
    })
  }

  return claims.sort((a, b) => b.claimDate.getTime() - a.claimDate.getTime())
}

// =============================================================================
// EXPORT
// =============================================================================

export const mockTermiteData = {
  generatePNIInspections: generateMockPNIInspections,
  generatePNISummary: generateMockPNISummary,
  generateTermiteRenewals: generateMockTermiteRenewals,
  generateRenewalSummary: generateMockRenewalSummary,
  generateTermiteClaims: generateMockTermiteClaims,
}
