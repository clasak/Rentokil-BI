/**
 * Source Systems & Lead Flow Definitions
 *
 * Maps source systems to their BigQuery representations and defines
 * the 15 lead journey flows for traceability tracking.
 *
 * Master Lead Service Engine - Strategic Initiative
 */

// =============================================================================
// SOURCE SYSTEM DEFINITIONS
// =============================================================================

export type SourceSystemId =
  | 'INVOCA'
  | 'FIVE9'
  | 'LEAD_EXEC'
  | 'SALES_EXEC'
  | 'WINNING_FORMULA'
  | 'PESTPAC'
  | 'SALESFORCE'
  | 'CCM'
  | 'WEB_FORMS'
  | 'SERVICE_TRACK'

export type SourceSystemType =
  | 'Call Tracking'
  | 'Call Center'
  | 'Lead Management'
  | 'Sales Pipeline'
  | 'Field Sales'
  | 'Service Delivery'
  | 'CRM'
  | 'Customer Communication'
  | 'Web Capture'
  | 'Service Referrals'

export type TraceabilityStatus = 'perfect' | 'excellent' | 'good' | 'low' | 'critical'

export interface SourceSystemConfig {
  id: SourceSystemId
  name: string
  type: SourceSystemType
  description: string
  dataTypes: string[]
  bigQueryDataset: string | null
  bigQueryTable: string | null
  knownTables: string[]
  integrationStatus: 'connected' | 'partial' | 'pending' | 'unknown'
  color: string
  icon: string
}

/**
 * Source system configurations
 * Maps each system to its BigQuery representation
 */
export const SOURCE_SYSTEMS: Record<SourceSystemId, SourceSystemConfig> = {
  INVOCA: {
    id: 'INVOCA',
    name: 'Invoca',
    type: 'Call Tracking',
    description: 'Inbound call tracking platform - captures call recordings, outcomes, and attribution',
    dataTypes: ['Inbound calls', 'Call recordings', 'Call outcomes', 'Marketing attribution'],
    bigQueryDataset: null, // To be discovered
    bigQueryTable: null,
    knownTables: [],
    integrationStatus: 'pending',
    color: '#6366F1', // Indigo
    icon: 'phone-incoming',
  },
  FIVE9: {
    id: 'FIVE9',
    name: 'Five9',
    type: 'Call Center',
    description: 'Call center platform for inside sales - manages agent interactions and dispositions',
    dataTypes: ['Call center interactions', 'Agent assignments', 'Call dispositions', 'Queue metrics'],
    bigQueryDataset: null,
    bigQueryTable: null,
    knownTables: [],
    integrationStatus: 'pending',
    color: '#8B5CF6', // Violet
    icon: 'headphones',
  },
  LEAD_EXEC: {
    id: 'LEAD_EXEC',
    name: 'Lead Exec',
    type: 'Lead Management',
    description: 'Lead management system - routes MQLs to sales, tracks lead assignments and outcomes',
    dataTypes: ['MQLs', 'Lead routing', 'Lead assignments', 'Lead stages', 'Dispositions'],
    bigQueryDataset: null, // Will discover actual dataset
    bigQueryTable: 'LeadsExecAPIExtract_STG',
    knownTables: ['LeadsExecAPIExtract_STG'],
    integrationStatus: 'connected',
    color: '#3B82F6', // Blue
    icon: 'users',
  },
  SALES_EXEC: {
    id: 'SALES_EXEC',
    name: 'Sales Exec',
    type: 'Sales Pipeline',
    description: 'Sales pipeline management - tracks SQLs, opportunities, proposals, and closed deals',
    dataTypes: ['SQLs', 'Opportunities', 'Proposals', 'Sales', 'Win/Loss data'],
    bigQueryDataset: null,
    bigQueryTable: 'SalesExecAPIExtract',
    knownTables: ['SalesExecAPIExtract'],
    integrationStatus: 'connected',
    color: '#10B981', // Emerald
    icon: 'trending-up',
  },
  WINNING_FORMULA: {
    id: 'WINNING_FORMULA',
    name: 'Winning Formula',
    type: 'Field Sales',
    description: 'Field sales activities system - inspections, proposals, and direct sales by field reps',
    dataTypes: ['Field inspections', 'Field proposals', 'Direct sales', 'Territory coverage'],
    bigQueryDataset: null,
    bigQueryTable: null,
    knownTables: [],
    integrationStatus: 'partial', // Has 96%+ traceability
    color: '#F59E0B', // Amber
    icon: 'map-pin',
  },
  PESTPAC: {
    id: 'PESTPAC',
    name: 'PestPac',
    type: 'Service Delivery',
    description: 'Field service management - service orders, technician routes, completions',
    dataTypes: ['Service orders', 'Technician assignments', 'Route data', 'Completions', 'Callbacks'],
    bigQueryDataset: null,
    bigQueryTable: null,
    knownTables: [],
    integrationStatus: 'partial',
    color: '#22C55E', // Green
    icon: 'truck',
  },
  SALESFORCE: {
    id: 'SALESFORCE',
    name: 'Salesforce',
    type: 'CRM',
    description: 'Customer relationship management - accounts, contacts, activities, campaigns',
    dataTypes: ['Accounts', 'Contacts', 'Activities', 'Campaigns', 'Cases'],
    bigQueryDataset: null,
    bigQueryTable: null,
    knownTables: [],
    integrationStatus: 'pending',
    color: '#0EA5E9', // Sky
    icon: 'cloud',
  },
  CCM: {
    id: 'CCM',
    name: 'CCM',
    type: 'Customer Communication',
    description: 'Customer communication management - email, SMS, notifications',
    dataTypes: ['Emails', 'SMS', 'Notifications', 'Communication logs'],
    bigQueryDataset: null,
    bigQueryTable: null,
    knownTables: [],
    integrationStatus: 'unknown',
    color: '#EC4899', // Pink
    icon: 'mail',
  },
  WEB_FORMS: {
    id: 'WEB_FORMS',
    name: 'Web Forms',
    type: 'Web Capture',
    description: 'Website lead capture - contact forms, chat, quote requests',
    dataTypes: ['Form submissions', 'Chat transcripts', 'Quote requests', 'Landing page data'],
    bigQueryDataset: null,
    bigQueryTable: null,
    knownTables: [],
    integrationStatus: 'pending',
    color: '#64748B', // Slate
    icon: 'globe',
  },
  SERVICE_TRACK: {
    id: 'SERVICE_TRACK',
    name: 'Service Track',
    type: 'Service Referrals',
    description: 'Referrals from existing service customers - upsells and cross-sells',
    dataTypes: ['Service referrals', 'Upsells', 'Cross-sells', 'Customer expansion'],
    bigQueryDataset: null,
    bigQueryTable: null,
    knownTables: [],
    integrationStatus: 'partial',
    color: '#14B8A6', // Teal
    icon: 'repeat',
  },
}

// =============================================================================
// LEAD FLOW DEFINITIONS (15 Total, 8 Prioritized)
// =============================================================================

export interface LeadFlowDefinition {
  id: number
  name: string
  shortName: string
  description: string
  category: 'residential_outbound' | 'web_inbound' | 'trusted_advisor' | 'commercial' | 'other'
  matchRate: number
  targetMatchRate: number
  status: TraceabilityStatus
  systems: SourceSystemId[]
  handoffs: number
  priority: 'high' | 'medium' | 'low'
  volumeEstimate: 'high' | 'medium' | 'low'
  keyIssues: string[]
  improvementActions: string[]
}

/**
 * Lead flow definitions with match rates and system mappings
 * Prioritized flows have detailed implementation plans
 */
export const LEAD_FLOWS: Record<string, LeadFlowDefinition> = {
  // ==========================================================================
  // RESIDENTIAL OUTBOUND FLOWS (Flows 4-6)
  // ==========================================================================
  FLOW_4: {
    id: 4,
    name: 'Residential Outbound - Inside Sales Direct',
    shortName: 'Res Outbound → Inside Sales',
    description: 'Residential outbound leads where inside sales person sells directly without field handoff',
    category: 'residential_outbound',
    matchRate: 0.301,
    targetMatchRate: 0.90,
    status: 'low',
    systems: ['FIVE9', 'SALES_EXEC'],
    handoffs: 1,
    priority: 'high',
    volumeEstimate: 'high',
    keyIssues: [
      'Lead ID not consistently passed from Five9 to Sales Exec',
      'Call disposition codes not standardized',
      'Timing gaps between call end and Sales Exec entry',
    ],
    improvementActions: [
      'Implement automatic lead ID passthrough via API',
      'Standardize disposition code mapping',
      'Add real-time sync between systems',
    ],
  },
  FLOW_5: {
    id: 5,
    name: 'Residential Outbound - Field Sales Handoff',
    shortName: 'Res Outbound → Lead Exec → Field',
    description: 'Residential outbound leads passed from call center to field sales person via Lead Exec',
    category: 'residential_outbound',
    matchRate: 0.929,
    targetMatchRate: 0.98,
    status: 'good',
    systems: ['FIVE9', 'LEAD_EXEC', 'SALES_EXEC'],
    handoffs: 2,
    priority: 'medium',
    volumeEstimate: 'high',
    keyIssues: [
      'Some leads missing Lead Exec routing timestamp',
      'Field sales not always updating Sales Exec promptly',
    ],
    improvementActions: [
      'Add mandatory timestamp capture in Lead Exec',
      'Implement SLA alerts for field sales updates',
    ],
  },
  FLOW_6: {
    id: 6,
    name: 'Residential Lead - Field Sales Direct',
    shortName: 'Res Lead → Winning Formula',
    description: 'Field-based sales person sells directly via Winning Formula without inside sales involvement',
    category: 'residential_outbound',
    matchRate: 0.978,
    targetMatchRate: 0.99,
    status: 'excellent',
    systems: ['LEAD_EXEC', 'WINNING_FORMULA'],
    handoffs: 1,
    priority: 'low',
    volumeEstimate: 'medium',
    keyIssues: [
      'Winning Formula data occasionally delayed in sync',
    ],
    improvementActions: [
      'Reduce sync interval from 4 hours to 1 hour',
    ],
  },

  // ==========================================================================
  // WEB/EMAIL/CHAT INBOUND FLOWS (Flows 7-9)
  // ==========================================================================
  FLOW_7: {
    id: 7,
    name: 'Web/Email/Chat - Inside Sales Direct',
    shortName: 'Web → Lead Exec → Inside Sales',
    description: 'Web leads where inside sales person sells directly via Lead Exec and Sales Exec',
    category: 'web_inbound',
    matchRate: 0.096,
    targetMatchRate: 0.85,
    status: 'critical',
    systems: ['WEB_FORMS', 'LEAD_EXEC', 'SALES_EXEC'],
    handoffs: 2,
    priority: 'high',
    volumeEstimate: 'high',
    keyIssues: [
      'Web form lead IDs not propagating to Lead Exec',
      'Multiple duplicate leads created for same inquiry',
      'Email/chat leads missing source attribution',
      'Long delay between web submission and Lead Exec entry',
    ],
    improvementActions: [
      'Implement web-to-Lead Exec API integration',
      'Add duplicate detection before Lead Exec entry',
      'Standardize UTM parameter capture for attribution',
      'Real-time webhook on form submission',
    ],
  },
  FLOW_8: {
    id: 8,
    name: 'Web/Email/Chat - Field Sales Allocation',
    shortName: 'Web → Lead Exec → Field',
    description: 'Web leads allocated to field sales via Lead Exec routing',
    category: 'web_inbound',
    matchRate: 0.031,
    targetMatchRate: 0.80,
    status: 'critical',
    systems: ['WEB_FORMS', 'LEAD_EXEC'],
    handoffs: 1,
    priority: 'high',
    volumeEstimate: 'medium',
    keyIssues: [
      'Lead Exec routing rules not capturing web source',
      'Field assignment happening outside Lead Exec',
      'No confirmation of field rep receipt',
    ],
    improvementActions: [
      'Update Lead Exec routing rules for web leads',
      'Enforce all field assignments through Lead Exec',
      'Add receipt confirmation requirement',
    ],
  },
  FLOW_9: {
    id: 9,
    name: 'Web/Email/Chat - No Sales Involvement',
    shortName: 'Web → Self-Service',
    description: 'Web leads that self-service or are lost without sales involvement',
    category: 'web_inbound',
    matchRate: 0.0, // Not tracked - leads drop off
    targetMatchRate: 0.50, // Goal is to capture these
    status: 'critical',
    systems: ['WEB_FORMS'],
    handoffs: 0,
    priority: 'medium',
    volumeEstimate: 'medium', // Unknown volume, estimate medium
    keyIssues: [
      'Leads abandoning forms not captured',
      'No re-engagement workflow',
      'Self-service booking not tracked',
    ],
    improvementActions: [
      'Implement form abandonment tracking',
      'Add automated re-engagement emails',
      'Connect self-service booking to Lead Exec',
    ],
  },

  // ==========================================================================
  // TRUSTED ADVISOR FLOWS (Flows 10-12)
  // ==========================================================================
  FLOW_10: {
    id: 10,
    name: 'Trusted Advisor - Tech Direct Sale',
    shortName: 'Tech → Sales Exec',
    description: 'Technician generates and sells directly (TAP program) - logged in Sales Exec',
    category: 'trusted_advisor',
    matchRate: 1.0,
    targetMatchRate: 1.0,
    status: 'perfect',
    systems: ['PESTPAC', 'SALES_EXEC'],
    handoffs: 1,
    priority: 'low',
    volumeEstimate: 'low',
    keyIssues: [],
    improvementActions: [
      'Maintain current process - working well',
    ],
  },
  FLOW_11: {
    id: 11,
    name: 'Trusted Advisor - Residential Sales Handoff',
    shortName: 'Tech → Lead Exec',
    description: 'Technician generates lead, handed to residential sales via Lead Exec',
    category: 'trusted_advisor',
    matchRate: 1.0,
    targetMatchRate: 1.0,
    status: 'perfect',
    systems: ['PESTPAC', 'LEAD_EXEC'],
    handoffs: 1,
    priority: 'low',
    volumeEstimate: 'low',
    keyIssues: [],
    improvementActions: [
      'Maintain current process - working well',
    ],
  },
  FLOW_12: {
    id: 12,
    name: 'Trusted Advisor - Commercial Sales Handoff',
    shortName: 'Tech → Commercial Sales',
    description: 'Technician generates commercial lead, handed to commercial sales team',
    category: 'trusted_advisor',
    matchRate: 0.95,
    targetMatchRate: 1.0,
    status: 'excellent',
    systems: ['PESTPAC', 'SALESFORCE'],
    handoffs: 1,
    priority: 'low',
    volumeEstimate: 'low',
    keyIssues: [
      'Some commercial leads not tagged correctly in Salesforce',
    ],
    improvementActions: [
      'Add automatic commercial tag based on account type',
    ],
  },

  // ==========================================================================
  // COMMERCIAL FLOWS (Flows 1-3)
  // ==========================================================================
  FLOW_1: {
    id: 1,
    name: 'Commercial Inbound - Direct',
    shortName: 'Commercial Inbound',
    description: 'Commercial inbound leads handled directly by commercial sales team',
    category: 'commercial',
    matchRate: 0.85,
    targetMatchRate: 0.95,
    status: 'good',
    systems: ['INVOCA', 'SALESFORCE'],
    handoffs: 1,
    priority: 'medium',
    volumeEstimate: 'medium',
    keyIssues: [
      'Invoca call data sometimes delayed',
      'Commercial vs residential classification errors',
    ],
    improvementActions: [
      'Improve call routing classification',
      'Add real-time Invoca → Salesforce sync',
    ],
  },
  FLOW_2: {
    id: 2,
    name: 'Commercial Outbound - Prospecting',
    shortName: 'Commercial Outbound',
    description: 'Commercial outbound prospecting via Salesforce campaigns',
    category: 'commercial',
    matchRate: 0.92,
    targetMatchRate: 0.98,
    status: 'good',
    systems: ['SALESFORCE', 'SALES_EXEC'],
    handoffs: 1,
    priority: 'low',
    volumeEstimate: 'medium',
    keyIssues: [
      'Campaign attribution sometimes missing',
    ],
    improvementActions: [
      'Enforce campaign association on all outbound activities',
    ],
  },
  FLOW_3: {
    id: 3,
    name: 'Commercial Referral',
    shortName: 'Commercial Referral',
    description: 'Commercial leads from existing customer referrals',
    category: 'commercial',
    matchRate: 0.88,
    targetMatchRate: 0.95,
    status: 'good',
    systems: ['PESTPAC', 'SALESFORCE'],
    handoffs: 1,
    priority: 'low',
    volumeEstimate: 'low',
    keyIssues: [
      'Referral source not always captured',
    ],
    improvementActions: [
      'Add mandatory referral source field',
    ],
  },

  // ==========================================================================
  // OTHER FLOWS (Flows 13-15)
  // ==========================================================================
  FLOW_13: {
    id: 13,
    name: 'Partner/Affiliate Leads',
    shortName: 'Partner Leads',
    description: 'Leads from partner and affiliate channels',
    category: 'other',
    matchRate: 0.75,
    targetMatchRate: 0.90,
    status: 'low',
    systems: ['WEB_FORMS', 'LEAD_EXEC', 'SALES_EXEC'],
    handoffs: 2,
    priority: 'low',
    volumeEstimate: 'low',
    keyIssues: [
      'Partner source attribution inconsistent',
      'Commission tracking gaps',
    ],
    improvementActions: [
      'Implement partner portal with unique tracking codes',
    ],
  },
  FLOW_14: {
    id: 14,
    name: 'Re-engagement/Win-back',
    shortName: 'Win-back',
    description: 'Re-engagement of lost leads or former customers',
    category: 'other',
    matchRate: 0.60,
    targetMatchRate: 0.85,
    status: 'low',
    systems: ['CCM', 'LEAD_EXEC', 'SALES_EXEC'],
    handoffs: 2,
    priority: 'low',
    volumeEstimate: 'medium',
    keyIssues: [
      'CCM campaigns not linked to Lead Exec',
      'Re-engagement attribution lost',
    ],
    improvementActions: [
      'Connect CCM campaign responses to Lead Exec',
    ],
  },
  FLOW_15: {
    id: 15,
    name: 'Seasonal/Event Campaigns',
    shortName: 'Campaign Leads',
    description: 'Leads from seasonal campaigns and marketing events',
    category: 'other',
    matchRate: 0.45,
    targetMatchRate: 0.80,
    status: 'low',
    systems: ['WEB_FORMS', 'CCM', 'LEAD_EXEC'],
    handoffs: 2,
    priority: 'low',
    volumeEstimate: 'medium', // Seasonal - varies throughout year
    keyIssues: [
      'Campaign tracking codes not standardized',
      'Event lead capture manual',
    ],
    improvementActions: [
      'Standardize campaign UTM structure',
      'Add digital event lead capture',
    ],
  },
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get flows by priority
 */
export function getFlowsByPriority(priority: 'high' | 'medium' | 'low'): LeadFlowDefinition[] {
  return Object.values(LEAD_FLOWS).filter(flow => flow.priority === priority)
}

/**
 * Get flows by status
 */
export function getFlowsByStatus(status: TraceabilityStatus): LeadFlowDefinition[] {
  return Object.values(LEAD_FLOWS).filter(flow => flow.status === status)
}

/**
 * Get flows by category
 */
export function getFlowsByCategory(category: LeadFlowDefinition['category']): LeadFlowDefinition[] {
  return Object.values(LEAD_FLOWS).filter(flow => flow.category === category)
}

/**
 * Get critical flows (match rate < 30%)
 */
export function getCriticalFlows(): LeadFlowDefinition[] {
  return Object.values(LEAD_FLOWS).filter(flow => flow.status === 'critical')
}

/**
 * Get prioritized flows (the 8 with high/medium priority)
 */
export function getPrioritizedFlows(): LeadFlowDefinition[] {
  return Object.values(LEAD_FLOWS)
    .filter(flow => flow.priority === 'high' || flow.priority === 'medium')
    .sort((a, b) => {
      if (a.priority === b.priority) return a.matchRate - b.matchRate
      return a.priority === 'high' ? -1 : 1
    })
}

/**
 * Calculate overall traceability metrics
 */
export function calculateOverallTraceability(): {
  averageMatchRate: number
  criticalFlowCount: number
  perfectFlowCount: number
  totalFlows: number
  prioritizedAverageMatchRate: number
} {
  const flows = Object.values(LEAD_FLOWS)
  const prioritized = getPrioritizedFlows()

  const avgRate = flows.reduce((sum, f) => sum + f.matchRate, 0) / flows.length
  const prioritizedAvg = prioritized.reduce((sum, f) => sum + f.matchRate, 0) / prioritized.length

  return {
    averageMatchRate: Math.round(avgRate * 1000) / 1000,
    criticalFlowCount: flows.filter(f => f.status === 'critical').length,
    perfectFlowCount: flows.filter(f => f.status === 'perfect').length,
    totalFlows: flows.length,
    prioritizedAverageMatchRate: Math.round(prioritizedAvg * 1000) / 1000,
  }
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: TraceabilityStatus): string {
  switch (status) {
    case 'perfect':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    case 'excellent':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'good':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'low':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

/**
 * Get status badge variant
 */
export function getStatusBadgeVariant(status: TraceabilityStatus): 'success' | 'warning' | 'danger' | 'default' {
  switch (status) {
    case 'perfect':
    case 'excellent':
      return 'success'
    case 'good':
      return 'default'
    case 'low':
      return 'warning'
    case 'critical':
      return 'danger'
    default:
      return 'default'
  }
}

/**
 * Calculate match rate status from value
 */
export function getMatchRateStatus(rate: number): TraceabilityStatus {
  if (rate >= 0.99) return 'perfect'
  if (rate >= 0.90) return 'excellent'
  if (rate >= 0.70) return 'good'
  if (rate >= 0.30) return 'low'
  return 'critical'
}
