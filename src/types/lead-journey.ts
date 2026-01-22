/**
 * Lead Journey Tracking Types
 *
 * Based on RNA/TMX Global Leads Data Process Flow document.
 * Tracks the 8 prioritized lead journeys with match rates.
 */

// Lead journey source channels
export type LeadChannel =
  | 'trusted_advisor'   // Field Tech / Technician referrals (100% match rate)
  | 'ccm'               // CCM Winning Formula campaigns (96.1% match rate)
  | 'invoca'            // Invoca call attribution (53.9% match rate)
  | 'web_form'          // Web form submissions (9.6% match rate)
  | 'email_chat'        // Email/Chat leads (3.1% match rate)
  | 'marketing'         // Marketing campaigns (30.1% match rate)
  | 'referral'          // Customer referrals
  | 'partner'           // Partner referrals

// Match rate health status
export type MatchRateStatus = 'excellent' | 'good' | 'medium' | 'poor' | 'critical'

/**
 * Lead journey flow definition
 */
export interface LeadJourneyFlow {
  id: string
  flowNumber: number               // Flow #4-#11 from document
  name: string
  channel: LeadChannel
  description: string
  sourceSystem: string             // Invoca, CCM, Web, etc.
  matchRate: number               // Current match rate percentage
  baselineMatchRate: number       // Target/baseline match rate
  trend: 'up' | 'down' | 'stable'
  status: MatchRateStatus
  leadsTotal: number              // Total leads in period
  leadsMatched: number            // Leads successfully matched
  leadsMissing: number            // Leads that failed to match
  missingFields: string[]         // Common missing fields
  lastUpdated: Date
}

/**
 * Web channel anomaly for low-traceability detection
 */
export interface WebChannelAnomaly {
  id: string
  channel: LeadChannel
  channelName: string
  currentMatchRate: number
  baselineMatchRate: number
  variance: number                // % change from baseline
  threshold: number               // Alert threshold
  severity: 'critical' | 'warning' | 'info'
  missingFields: string[]         // Fields causing match failures
  affectedLeadCount: number
  detectedAt: Date
  status: 'active' | 'acknowledged' | 'resolved'
}

/**
 * Lead journey trend data point
 */
export interface LeadJourneyTrend {
  date: string                    // YYYY-MM-DD
  channel: LeadChannel
  matchRate: number
  leadsTotal: number
  leadsMatched: number
}

/**
 * Gap analysis for unmatched leads
 */
export interface LeadGapAnalysis {
  channel: LeadChannel
  channelName: string
  totalUnmatched: number
  missingBillToId: number
  missingLocationId: number
  missingAccountNumber: number
  missingContactInfo: number
  otherIssues: number
  topIssue: string
  recommendedAction: string
}

/**
 * Lead journey summary metrics
 */
export interface LeadJourneySummary {
  totalLeads: number
  totalMatched: number
  overallMatchRate: number
  channelsAboveTarget: number
  channelsBelowTarget: number
  criticalChannels: number        // Channels < 20% match rate
  trendsImproving: number
  trendsDeclining: number
}

/**
 * Get match rate status based on percentage
 */
export function getMatchRateStatus(rate: number): MatchRateStatus {
  if (rate >= 90) return 'excellent'
  if (rate >= 70) return 'good'
  if (rate >= 50) return 'medium'
  if (rate >= 20) return 'poor'
  return 'critical'
}

/**
 * Get status color for UI
 */
export function getMatchRateColor(status: MatchRateStatus): string {
  switch (status) {
    case 'excellent': return 'text-green-600 dark:text-green-400'
    case 'good': return 'text-green-500 dark:text-green-500'
    case 'medium': return 'text-yellow-600 dark:text-yellow-400'
    case 'poor': return 'text-orange-600 dark:text-orange-400'
    case 'critical': return 'text-red-600 dark:text-red-400'
  }
}

/**
 * Get background color for status badges
 */
export function getMatchRateBgColor(status: MatchRateStatus): string {
  switch (status) {
    case 'excellent': return 'bg-green-100 dark:bg-green-900/30'
    case 'good': return 'bg-green-50 dark:bg-green-900/20'
    case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30'
    case 'poor': return 'bg-orange-100 dark:bg-orange-900/30'
    case 'critical': return 'bg-red-100 dark:bg-red-900/30'
  }
}

/**
 * Channel display names
 */
export const CHANNEL_NAMES: Record<LeadChannel, string> = {
  trusted_advisor: 'Trusted Advisor (Field Tech)',
  ccm: 'CCM (Winning Formula)',
  invoca: 'Invoca (Call Attribution)',
  web_form: 'Web Form',
  email_chat: 'Email/Chat',
  marketing: 'Marketing Campaign',
  referral: 'Customer Referral',
  partner: 'Partner Referral'
}

/**
 * Alert thresholds by channel
 */
export const CHANNEL_THRESHOLDS: Record<LeadChannel, number> = {
  trusted_advisor: 95,  // Expect near-perfect matching
  ccm: 90,
  invoca: 50,
  web_form: 15,         // Known problematic channel
  email_chat: 10,       // Known problematic channel
  marketing: 30,
  referral: 70,
  partner: 70
}
