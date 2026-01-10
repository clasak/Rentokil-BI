"use client"

import seedrandom from 'seedrandom'

export type LeadSource =
  | 'salesforce'
  | 'winning_formula'
  | 'service_track'
  | 'branch_referral'
  | 'web_form'

export interface LeadSourceConfig {
  id: LeadSource
  name: string
  description: string
  avgConversionRate: number // Base conversion rate
  avgDealSize: number // Average deal size in dollars
  qualityScore: number // 1-5 star rating
  icon: 'database' | 'target' | 'truck' | 'users' | 'globe'
  color: string
}

export const LEAD_SOURCE_CONFIG: Record<LeadSource, LeadSourceConfig> = {
  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM-originated leads from marketing campaigns',
    avgConversionRate: 0.34,
    avgDealSize: 6900,
    qualityScore: 4,
    icon: 'database',
    color: 'blue'
  },
  winning_formula: {
    id: 'winning_formula',
    name: 'Winning Formula',
    description: 'Targeted commercial prospects from market analysis',
    avgConversionRate: 0.28,
    avgDealSize: 6200,
    qualityScore: 3,
    icon: 'target',
    color: 'purple'
  },
  service_track: {
    id: 'service_track',
    name: 'Service Track',
    description: 'Referrals from existing service customers',
    avgConversionRate: 0.42,
    avgDealSize: 5600,
    qualityScore: 5,
    icon: 'truck',
    color: 'green'
  },
  branch_referral: {
    id: 'branch_referral',
    name: 'Branch Referrals',
    description: 'Local branch and technician referrals',
    avgConversionRate: 0.51,
    avgDealSize: 6100,
    qualityScore: 4,
    icon: 'users',
    color: 'orange'
  },
  web_form: {
    id: 'web_form',
    name: 'Web Forms',
    description: 'Inbound leads from website contact forms',
    avgConversionRate: 0.12,
    avgDealSize: 6000,
    qualityScore: 2,
    icon: 'globe',
    color: 'gray'
  }
}

export interface LeadSourceMetrics {
  source: LeadSource
  sourceName: string
  leadCount: number
  totalValue: number
  avgDealSize: number
  conversionRate: number
  qualityScore: number
  // Health breakdown
  healthyCount: number
  atRiskCount: number
  criticalCount: number
  // Potential duplicates across sources
  potentialDuplicates: number
  // Trend
  trend: 'up' | 'down' | 'flat'
  trendPercent: number
}

export interface LeadSourceSummary {
  totalLeads: number
  totalValue: number
  avgConversionRate: number
  bestSource: LeadSource
  worstSource: LeadSource
  potentialDuplicatesTotal: number
  duplicateValueAtRisk: number
}

// Generate synthetic lead source metrics
export function getLeadSourceMetrics(seed = 'lead-sources-2024'): LeadSourceMetrics[] {
  const rng = seedrandom(seed)

  const sources: LeadSource[] = [
    'salesforce',
    'winning_formula',
    'service_track',
    'branch_referral',
    'web_form'
  ]

  return sources.map(source => {
    const config = LEAD_SOURCE_CONFIG[source]

    // Generate lead counts with some variance
    const baseCount = Math.floor(20 + rng() * 50)
    const leadCount = baseCount

    // Calculate value with variance around config average
    const avgDealSize = Math.round(config.avgDealSize * (0.85 + rng() * 0.3))
    const totalValue = leadCount * avgDealSize

    // Conversion rate with variance
    const conversionRate = Math.round((config.avgConversionRate * (0.8 + rng() * 0.4)) * 100) / 100

    // Health breakdown based on quality score
    const criticalRatio = (5 - config.qualityScore) * 0.05 + rng() * 0.05
    const atRiskRatio = (5 - config.qualityScore) * 0.08 + rng() * 0.08

    const criticalCount = Math.floor(leadCount * criticalRatio)
    const atRiskCount = Math.floor(leadCount * atRiskRatio)
    const healthyCount = leadCount - criticalCount - atRiskCount

    // Potential duplicates (web forms have most, branch referrals have least)
    const duplicateBase = source === 'web_form' ? 0.15 :
                          source === 'branch_referral' ? 0.02 : 0.06
    const potentialDuplicates = Math.floor(leadCount * (duplicateBase + rng() * 0.05))

    // Trend
    const trendRoll = rng()
    const trend = trendRoll > 0.6 ? 'up' : trendRoll > 0.3 ? 'flat' : 'down'
    const trendPercent = Math.round((rng() * 15 + 2) * 10) / 10

    return {
      source,
      sourceName: config.name,
      leadCount,
      totalValue,
      avgDealSize,
      conversionRate,
      qualityScore: config.qualityScore,
      healthyCount,
      atRiskCount,
      criticalCount,
      potentialDuplicates,
      trend,
      trendPercent
    }
  })
}

export function getLeadSourceSummary(metrics: LeadSourceMetrics[]): LeadSourceSummary {
  const totalLeads = metrics.reduce((sum, m) => sum + m.leadCount, 0)
  const totalValue = metrics.reduce((sum, m) => sum + m.totalValue, 0)

  // Weighted average conversion rate
  const avgConversionRate = metrics.reduce((sum, m) =>
    sum + (m.conversionRate * m.leadCount), 0) / totalLeads

  // Find best/worst by conversion rate
  const sorted = [...metrics].sort((a, b) => b.conversionRate - a.conversionRate)
  const bestSource = sorted[0].source
  const worstSource = sorted[sorted.length - 1].source

  // Total duplicates
  const potentialDuplicatesTotal = metrics.reduce((sum, m) => sum + m.potentialDuplicates, 0)
  const avgDeal = totalValue / totalLeads
  const duplicateValueAtRisk = potentialDuplicatesTotal * avgDeal

  return {
    totalLeads,
    totalValue,
    avgConversionRate: Math.round(avgConversionRate * 100) / 100,
    bestSource,
    worstSource,
    potentialDuplicatesTotal,
    duplicateValueAtRisk
  }
}
