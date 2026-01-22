/**
 * Lead Journey Mock Data
 *
 * Mock data for the 8 prioritized lead journeys from RNA/TMX Global Leads Data Process Flow.
 * Match rates align with document findings.
 */

import type {
  LeadJourneyFlow,
  WebChannelAnomaly,
  LeadJourneyTrend,
  LeadGapAnalysis,
  LeadJourneySummary,
} from '@/types/lead-journey'
import { getMatchRateStatus, CHANNEL_THRESHOLDS } from '@/types/lead-journey'

// ============================================================================
// TEST MODE - mirrors platformAdminData.ts TEST_MODE
// ============================================================================
import { TEST_MODE } from './platformAdminData'

/**
 * Get all lead journey flows
 */
export function getLeadJourneyFlows(): LeadJourneyFlow[] {
  const now = new Date()

  if (TEST_MODE) {
    // STRESS TEST: Multiple channels below target
    return [
      {
        id: 'flow-4',
        flowNumber: 4,
        name: 'Trusted Advisor → Lead',
        channel: 'trusted_advisor',
        description: 'Field technician referrals with 100% traceability',
        sourceSystem: 'PestPac / Field Service',
        matchRate: 98.2,            // Slightly below 100%
        baselineMatchRate: 100,
        trend: 'down',
        status: getMatchRateStatus(98.2),
        leadsTotal: 1245,
        leadsMatched: 1222,
        leadsMissing: 23,
        missingFields: ['tech_id', 'service_ticket'],
        lastUpdated: now
      },
      {
        id: 'flow-5',
        flowNumber: 5,
        name: 'CCM → Lead',
        channel: 'ccm',
        description: 'Winning Formula campaign attribution',
        sourceSystem: 'CCM (Winning Formula)',
        matchRate: 89.4,            // Below 96.1% baseline
        baselineMatchRate: 96.1,
        trend: 'down',
        status: getMatchRateStatus(89.4),
        leadsTotal: 3420,
        leadsMatched: 3057,
        leadsMissing: 363,
        missingFields: ['campaign_id', 'utm_source'],
        lastUpdated: now
      },
      {
        id: 'flow-6',
        flowNumber: 6,
        name: 'Invoca → Lead',
        channel: 'invoca',
        description: 'Call attribution and recording',
        sourceSystem: 'Invoca',
        matchRate: 42.3,            // Below 53.9% baseline
        baselineMatchRate: 53.9,
        trend: 'down',
        status: getMatchRateStatus(42.3),
        leadsTotal: 8765,
        leadsMatched: 3708,
        leadsMissing: 5057,
        missingFields: ['call_id', 'ani', 'caller_id'],
        lastUpdated: now
      },
      {
        id: 'flow-7',
        flowNumber: 7,
        name: 'Web → Lead',
        channel: 'web_form',
        description: 'Web form submissions',
        sourceSystem: 'Web / Salesforce',
        matchRate: 6.8,             // CRITICAL - below 9.6%
        baselineMatchRate: 9.6,
        trend: 'down',
        status: getMatchRateStatus(6.8),
        leadsTotal: 12340,
        leadsMatched: 839,
        leadsMissing: 11501,
        missingFields: ['bill_to_id', 'location_id', 'account_number'],
        lastUpdated: now
      },
      {
        id: 'flow-8',
        flowNumber: 8,
        name: 'Email/Chat → Lead',
        channel: 'email_chat',
        description: 'Email and chat inquiries',
        sourceSystem: 'Email / Chat / Five9',
        matchRate: 2.1,             // CRITICAL - below 3.1%
        baselineMatchRate: 3.1,
        trend: 'down',
        status: getMatchRateStatus(2.1),
        leadsTotal: 5678,
        leadsMatched: 119,
        leadsMissing: 5559,
        missingFields: ['email', 'contact_id', 'bill_to_id'],
        lastUpdated: now
      },
      {
        id: 'flow-9',
        flowNumber: 9,
        name: 'Marketing → Lead',
        channel: 'marketing',
        description: 'Marketing campaign leads',
        sourceSystem: 'Marketing Automation',
        matchRate: 24.5,            // Below 30.1% baseline
        baselineMatchRate: 30.1,
        trend: 'down',
        status: getMatchRateStatus(24.5),
        leadsTotal: 4567,
        leadsMatched: 1119,
        leadsMissing: 3448,
        missingFields: ['campaign_id', 'source_code', 'utm_medium'],
        lastUpdated: now
      },
      {
        id: 'flow-10',
        flowNumber: 10,
        name: 'Referral → Lead',
        channel: 'referral',
        description: 'Customer referrals',
        sourceSystem: 'Salesforce',
        matchRate: 58.3,
        baselineMatchRate: 70,
        trend: 'stable',
        status: getMatchRateStatus(58.3),
        leadsTotal: 2345,
        leadsMatched: 1367,
        leadsMissing: 978,
        missingFields: ['referrer_account_id', 'referral_code'],
        lastUpdated: now
      },
      {
        id: 'flow-11',
        flowNumber: 11,
        name: 'Partner → Lead',
        channel: 'partner',
        description: 'Partner referrals',
        sourceSystem: 'Partner Portal',
        matchRate: 61.7,
        baselineMatchRate: 70,
        trend: 'down',
        status: getMatchRateStatus(61.7),
        leadsTotal: 1234,
        leadsMatched: 761,
        leadsMissing: 473,
        missingFields: ['partner_id', 'partner_code'],
        lastUpdated: now
      }
    ]
  }

  // Normal mode - closer to baseline with some natural variance
  return [
    {
      id: 'flow-4',
      flowNumber: 4,
      name: 'Trusted Advisor → Lead',
      channel: 'trusted_advisor',
      description: 'Field technician referrals with 100% traceability',
      sourceSystem: 'PestPac / Field Service',
      matchRate: 100,
      baselineMatchRate: 100,
      trend: 'stable',
      status: getMatchRateStatus(100),
      leadsTotal: 1245,
      leadsMatched: 1245,
      leadsMissing: 0,
      missingFields: [],
      lastUpdated: now
    },
    {
      id: 'flow-5',
      flowNumber: 5,
      name: 'CCM → Lead',
      channel: 'ccm',
      description: 'Winning Formula campaign attribution',
      sourceSystem: 'CCM (Winning Formula)',
      matchRate: 96.1,
      baselineMatchRate: 96.1,
      trend: 'up',
      status: getMatchRateStatus(96.1),
      leadsTotal: 3420,
      leadsMatched: 3287,
      leadsMissing: 133,
      missingFields: ['campaign_id'],
      lastUpdated: now
    },
    {
      id: 'flow-6',
      flowNumber: 6,
      name: 'Invoca → Lead',
      channel: 'invoca',
      description: 'Call attribution and recording',
      sourceSystem: 'Invoca',
      matchRate: 53.9,
      baselineMatchRate: 53.9,
      trend: 'stable',
      status: getMatchRateStatus(53.9),
      leadsTotal: 8765,
      leadsMatched: 4724,
      leadsMissing: 4041,
      missingFields: ['call_id', 'ani'],
      lastUpdated: now
    },
    {
      id: 'flow-7',
      flowNumber: 7,
      name: 'Web → Lead',
      channel: 'web_form',
      description: 'Web form submissions',
      sourceSystem: 'Web / Salesforce',
      matchRate: 9.6,
      baselineMatchRate: 9.6,
      trend: 'stable',
      status: getMatchRateStatus(9.6),
      leadsTotal: 12340,
      leadsMatched: 1185,
      leadsMissing: 11155,
      missingFields: ['bill_to_id', 'location_id', 'account_number'],
      lastUpdated: now
    },
    {
      id: 'flow-8',
      flowNumber: 8,
      name: 'Email/Chat → Lead',
      channel: 'email_chat',
      description: 'Email and chat inquiries',
      sourceSystem: 'Email / Chat / Five9',
      matchRate: 3.1,
      baselineMatchRate: 3.1,
      trend: 'stable',
      status: getMatchRateStatus(3.1),
      leadsTotal: 5678,
      leadsMatched: 176,
      leadsMissing: 5502,
      missingFields: ['email', 'contact_id', 'bill_to_id'],
      lastUpdated: now
    },
    {
      id: 'flow-9',
      flowNumber: 9,
      name: 'Marketing → Lead',
      channel: 'marketing',
      description: 'Marketing campaign leads',
      sourceSystem: 'Marketing Automation',
      matchRate: 30.1,
      baselineMatchRate: 30.1,
      trend: 'up',
      status: getMatchRateStatus(30.1),
      leadsTotal: 4567,
      leadsMatched: 1375,
      leadsMissing: 3192,
      missingFields: ['campaign_id', 'source_code'],
      lastUpdated: now
    },
    {
      id: 'flow-10',
      flowNumber: 10,
      name: 'Referral → Lead',
      channel: 'referral',
      description: 'Customer referrals',
      sourceSystem: 'Salesforce',
      matchRate: 72.5,
      baselineMatchRate: 70,
      trend: 'up',
      status: getMatchRateStatus(72.5),
      leadsTotal: 2345,
      leadsMatched: 1700,
      leadsMissing: 645,
      missingFields: ['referrer_account_id'],
      lastUpdated: now
    },
    {
      id: 'flow-11',
      flowNumber: 11,
      name: 'Partner → Lead',
      channel: 'partner',
      description: 'Partner referrals',
      sourceSystem: 'Partner Portal',
      matchRate: 71.2,
      baselineMatchRate: 70,
      trend: 'stable',
      status: getMatchRateStatus(71.2),
      leadsTotal: 1234,
      leadsMatched: 879,
      leadsMissing: 355,
      missingFields: ['partner_id'],
      lastUpdated: now
    }
  ]
}

/**
 * Get web channel anomalies
 */
export function getWebChannelAnomalies(): WebChannelAnomaly[] {
  const now = new Date()
  const flows = getLeadJourneyFlows()

  const anomalies: WebChannelAnomaly[] = []

  // Check each flow against its threshold
  for (const flow of flows) {
    const threshold = CHANNEL_THRESHOLDS[flow.channel]
    const variance = ((flow.matchRate - flow.baselineMatchRate) / flow.baselineMatchRate) * 100

    // Generate anomaly if below threshold or significant decline
    if (flow.matchRate < threshold || variance < -10) {
      let severity: 'critical' | 'warning' | 'info' = 'info'
      if (flow.matchRate < 10) severity = 'critical'
      else if (flow.matchRate < 30) severity = 'warning'

      anomalies.push({
        id: `anomaly-${flow.id}`,
        channel: flow.channel,
        channelName: flow.name,
        currentMatchRate: flow.matchRate,
        baselineMatchRate: flow.baselineMatchRate,
        variance: Math.round(variance * 10) / 10,
        threshold,
        severity,
        missingFields: flow.missingFields,
        affectedLeadCount: flow.leadsMissing,
        detectedAt: now,
        status: 'active'
      })
    }
  }

  return anomalies.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * Get lead journey trends (last 30 days)
 */
export function getLeadJourneyTrends(): LeadJourneyTrend[] {
  const trends: LeadJourneyTrend[] = []
  const flows = getLeadJourneyFlows()
  const today = new Date()

  // Generate 30 days of trend data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    for (const flow of flows) {
      // Add some variance to make it look realistic
      const variance = (Math.random() - 0.5) * 10
      const matchRate = Math.max(0, Math.min(100, flow.matchRate + variance))
      const totalVariance = Math.floor((Math.random() - 0.5) * flow.leadsTotal * 0.1)
      const leadsTotal = Math.max(10, flow.leadsTotal + totalVariance)
      const leadsMatched = Math.floor(leadsTotal * (matchRate / 100))

      trends.push({
        date: dateStr,
        channel: flow.channel,
        matchRate: Math.round(matchRate * 10) / 10,
        leadsTotal,
        leadsMatched
      })
    }
  }

  return trends
}

/**
 * Get gap analysis for unmatched leads
 */
export function getLeadGapAnalysis(): LeadGapAnalysis[] {
  const flows = getLeadJourneyFlows()

  return flows.map(flow => {
    const total = flow.leadsMissing
    // Distribute missing leads across common issues
    const missingBillTo = Math.floor(total * 0.35)
    const missingLocation = Math.floor(total * 0.28)
    const missingAccount = Math.floor(total * 0.20)
    const missingContact = Math.floor(total * 0.12)
    const other = total - missingBillTo - missingLocation - missingAccount - missingContact

    let topIssue = 'Missing Bill-to ID'
    let recommendedAction = 'Ensure Bill-to ID is captured at lead intake'

    if (flow.channel === 'web_form' || flow.channel === 'email_chat') {
      topIssue = 'Missing Bill-to ID and Location ID'
      recommendedAction = 'Expose Bill-to ID and Location ID fields via API for web channel leads'
    } else if (flow.channel === 'invoca') {
      topIssue = 'Call attribution data incomplete'
      recommendedAction = 'Verify Invoca → Salesforce integration mapping'
    }

    return {
      channel: flow.channel,
      channelName: flow.name,
      totalUnmatched: total,
      missingBillToId: missingBillTo,
      missingLocationId: missingLocation,
      missingAccountNumber: missingAccount,
      missingContactInfo: missingContact,
      otherIssues: other,
      topIssue,
      recommendedAction
    }
  }).filter(gap => gap.totalUnmatched > 0)
    .sort((a, b) => b.totalUnmatched - a.totalUnmatched)
}

/**
 * Get lead journey summary
 */
export function getLeadJourneySummary(): LeadJourneySummary {
  const flows = getLeadJourneyFlows()

  const totalLeads = flows.reduce((sum, f) => sum + f.leadsTotal, 0)
  const totalMatched = flows.reduce((sum, f) => sum + f.leadsMatched, 0)
  const overallMatchRate = Math.round((totalMatched / totalLeads) * 1000) / 10

  const channelsAboveTarget = flows.filter(f => f.matchRate >= f.baselineMatchRate).length
  const channelsBelowTarget = flows.filter(f => f.matchRate < f.baselineMatchRate).length
  const criticalChannels = flows.filter(f => f.matchRate < 20).length
  const trendsImproving = flows.filter(f => f.trend === 'up').length
  const trendsDeclining = flows.filter(f => f.trend === 'down').length

  return {
    totalLeads,
    totalMatched,
    overallMatchRate,
    channelsAboveTarget,
    channelsBelowTarget,
    criticalChannels,
    trendsImproving,
    trendsDeclining
  }
}
