/**
 * At-Risk Definitions
 *
 * Clear definitions of what triggers "at-risk" flags across the business.
 * Addresses Susan's question: "What is the stage and why is that an at-risk item?"
 *
 * This provides standardized definitions so everyone knows:
 * - What conditions trigger each at-risk status
 * - Who is responsible for addressing it
 * - What actions should be taken
 * - How severity is determined
 */

export type AtRiskCategory =
  | 'opportunity'
  | 'account'
  | 'service'
  | 'onboarding'
  | 'renewal'
  | 'collection';

export type AtRiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AtRiskOwner =
  | 'Sales Rep'
  | 'Sales Manager'
  | 'Region Director'
  | 'Operations Manager'
  | 'Branch Manager'
  | 'Technician'
  | 'Collections'
  | 'Customer Success';

export interface AtRiskDefinition {
  riskId: string;
  triggerName: string;
  category: AtRiskCategory;
  condition: string;
  threshold: string;
  thresholdValue: number | string;
  measurementUnit: string;
  severity: AtRiskSeverity;
  description: string;
  businessImpact: string;
  recommendedAction: string;
  owner: AtRiskOwner;
  escalateTo?: AtRiskOwner;
  escalationTrigger?: string;
  kpisAffected: string[];
  automatedAlert: boolean;
  alertFrequency?: string;
}

export const AT_RISK_DEFINITIONS: AtRiskDefinition[] = [
  // =============================================================================
  // OPPORTUNITY AT-RISK DEFINITIONS
  // =============================================================================
  {
    riskId: 'RISK_OPP_001',
    triggerName: 'Stale Opportunity - No Activity',
    category: 'opportunity',
    condition: 'Days since last activity on opportunity',
    threshold: '> 30 days',
    thresholdValue: 30,
    measurementUnit: 'days',
    severity: 'high',
    description: 'Opportunity has had no logged activity (calls, emails, meetings, tasks) for over 30 days.',
    businessImpact: 'Leads go cold, significantly reduces close probability. Industry data shows conversion drops 50% after 30 days of inactivity.',
    recommendedAction: 'Sales rep must contact prospect within 48 hours. If no response after 3 attempts, move to "Nurture" or "Lost" status.',
    owner: 'Sales Rep',
    escalateTo: 'Sales Manager',
    escalationTrigger: 'No activity logged within 7 days of alert',
    kpisAffected: ['win_rate', 'sales_cycle_days', 'pipeline_value'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  },
  {
    riskId: 'RISK_OPP_002',
    triggerName: 'Stuck in Stage',
    category: 'opportunity',
    condition: 'Days in current opportunity stage',
    threshold: '> 45 days',
    thresholdValue: 45,
    measurementUnit: 'days',
    severity: 'medium',
    description: 'Opportunity has not progressed to next stage for over 45 days.',
    businessImpact: 'Pipeline stagnation inflates forecasts, reduces accuracy, and ties up sales capacity.',
    recommendedAction: 'Sales rep to review with manager. Determine if deal is still viable. Update stage or move to lost.',
    owner: 'Sales Rep',
    escalateTo: 'Region Director',
    escalationTrigger: 'In same stage for > 60 days',
    kpisAffected: ['pipeline_velocity', 'forecast_accuracy', 'sales_cycle_days'],
    automatedAlert: true,
    alertFrequency: 'Weekly'
  },
  {
    riskId: 'RISK_OPP_003',
    triggerName: 'No Contact Attempts',
    category: 'opportunity',
    condition: 'Days since last contact attempt',
    threshold: '> 14 days',
    thresholdValue: 14,
    measurementUnit: 'days',
    severity: 'high',
    description: 'No contact attempts (calls, emails, visits) logged for over 14 days.',
    businessImpact: 'Prospect likely shopping competitors. High risk of losing to competitor who is actively engaging.',
    recommendedAction: 'Immediate outreach required. Multiple channel approach (call, email, text).',
    owner: 'Sales Rep',
    escalateTo: 'Sales Manager',
    escalationTrigger: 'No contact within 5 days of alert',
    kpisAffected: ['win_rate', 'activities_per_opportunity'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  },
  {
    riskId: 'RISK_OPP_004',
    triggerName: 'High Value Opportunity at Risk',
    category: 'opportunity',
    condition: 'Opportunity value > $25K AND (days without activity > 14 OR close date passed)',
    threshold: 'Value > $25K with risk indicators',
    thresholdValue: 25000,
    measurementUnit: 'currency',
    severity: 'critical',
    description: 'High-value opportunity showing risk indicators (stale, missed close date).',
    businessImpact: 'Significant revenue at risk. These deals have outsized impact on quota and forecast.',
    recommendedAction: 'Manager to personally review deal strategy. Consider executive sponsorship or escalated engagement.',
    owner: 'Sales Manager',
    escalateTo: 'Region Director',
    escalationTrigger: 'No progress within 5 business days',
    kpisAffected: ['pipeline_value', 'quota_attainment', 'forecast_accuracy'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  },
  {
    riskId: 'RISK_OPP_005',
    triggerName: 'Close Date Passed',
    category: 'opportunity',
    condition: 'Close date has passed without status update',
    threshold: 'Close date < today',
    thresholdValue: 0,
    measurementUnit: 'days past',
    severity: 'high',
    description: 'Opportunity close date has passed but opportunity is still open.',
    businessImpact: 'Forecast accuracy degraded. Pipeline hygiene issues compound downstream.',
    recommendedAction: 'Update close date to realistic date or mark as won/lost. Document reason for slip.',
    owner: 'Sales Rep',
    escalateTo: 'Sales Manager',
    escalationTrigger: 'Not updated within 3 days',
    kpisAffected: ['forecast_accuracy', 'pipeline_hygiene'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  },

  // =============================================================================
  // ONBOARDING AT-RISK DEFINITIONS
  // =============================================================================
  {
    riskId: 'RISK_ONB_001',
    triggerName: 'Initial Service Not Scheduled',
    category: 'onboarding',
    condition: 'Days since contract signed without initial service scheduled',
    threshold: '> 7 days',
    thresholdValue: 7,
    measurementUnit: 'days',
    severity: 'high',
    description: 'New account signed but initial service not yet scheduled.',
    businessImpact: 'Customer starts experience with poor impression. Revenue recognition delayed.',
    recommendedAction: 'Operations to contact customer within 24 hours to schedule. Escalate if capacity issue.',
    owner: 'Operations Manager',
    escalateTo: 'Branch Manager',
    escalationTrigger: 'Not scheduled within 10 days',
    kpisAffected: ['time_to_first_service', 'customer_satisfaction', 'onboarding_completion'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  },
  {
    riskId: 'RISK_ONB_002',
    triggerName: 'Start Packet Incomplete',
    category: 'onboarding',
    condition: 'Start packet missing required fields',
    threshold: 'Completeness < 80%',
    thresholdValue: 80,
    measurementUnit: 'percent',
    severity: 'high',
    description: 'Start packet does not contain all required information for service setup.',
    businessImpact: 'Delays onboarding, causes technician inefficiency, billing errors, and customer frustration.',
    recommendedAction: 'Sales rep to obtain missing information within 48 hours. Cannot schedule until complete.',
    owner: 'Sales Rep',
    escalateTo: 'Sales Manager',
    escalationTrigger: 'Incomplete after 5 days',
    kpisAffected: ['start_packet_quality', 'time_to_first_service', 'operational_efficiency'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  },
  {
    riskId: 'RISK_ONB_003',
    triggerName: 'First Service Failed/Missed',
    category: 'onboarding',
    condition: 'Initial service not completed on scheduled date',
    threshold: 'Service status = Failed or Missed',
    thresholdValue: 'incomplete',
    measurementUnit: 'status',
    severity: 'critical',
    description: 'Initial setup service was not completed as scheduled.',
    businessImpact: 'Critical customer experience failure. High risk of immediate cancellation.',
    recommendedAction: 'Branch Manager to personally call customer, reschedule for next available slot, offer compensation.',
    owner: 'Branch Manager',
    escalateTo: 'Region Director',
    escalationTrigger: 'Customer complains or threatens cancellation',
    kpisAffected: ['customer_satisfaction', 'early_churn_rate', 'net_promoter_score'],
    automatedAlert: true,
    alertFrequency: 'Immediate'
  },

  // =============================================================================
  // SERVICE DELIVERY AT-RISK DEFINITIONS
  // =============================================================================
  {
    riskId: 'RISK_SVC_001',
    triggerName: 'Missed Service Visit',
    category: 'service',
    condition: 'Scheduled service not completed',
    threshold: 'Service status = Missed',
    thresholdValue: 'missed',
    measurementUnit: 'status',
    severity: 'high',
    description: 'Scheduled recurring service was not performed.',
    businessImpact: 'Contract breach, customer dissatisfaction, potential cancellation.',
    recommendedAction: 'Reschedule within 48 hours. Customer should be notified proactively with apology.',
    owner: 'Operations Manager',
    escalateTo: 'Branch Manager',
    escalationTrigger: 'Second missed service in 90 days',
    kpisAffected: ['service_completion_rate', 'customer_satisfaction', 'sla_compliance'],
    automatedAlert: true,
    alertFrequency: 'Immediate'
  },
  {
    riskId: 'RISK_SVC_002',
    triggerName: 'Service Running Behind Schedule',
    category: 'service',
    condition: 'Service due but not scheduled within SLA window',
    threshold: '> 5 days past due',
    thresholdValue: 5,
    measurementUnit: 'days',
    severity: 'medium',
    description: 'Recurring service is past the due date based on frequency.',
    businessImpact: 'SLA breach risk, potential pest issues, customer complaints.',
    recommendedAction: 'Schedule service immediately. Review route capacity.',
    owner: 'Operations Manager',
    escalateTo: 'Branch Manager',
    escalationTrigger: '> 10 days past due',
    kpisAffected: ['on_time_service_rate', 'sla_compliance'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  },
  {
    riskId: 'RISK_SVC_003',
    triggerName: 'Multiple Callbacks',
    category: 'service',
    condition: 'Number of callback services in rolling 90 days',
    threshold: '> 2 callbacks',
    thresholdValue: 2,
    measurementUnit: 'count',
    severity: 'high',
    description: 'Account has required more than 2 callback services in past 90 days.',
    businessImpact: 'Service quality issue. Revenue erosion from free callbacks. Customer at churn risk.',
    recommendedAction: 'Branch Manager to review service history. Consider site assessment. May need service upgrade.',
    owner: 'Branch Manager',
    escalateTo: 'Region Director',
    escalationTrigger: '> 4 callbacks in 90 days',
    kpisAffected: ['callback_rate', 'customer_satisfaction', 'gross_margin'],
    automatedAlert: true,
    alertFrequency: 'Weekly'
  },
  {
    riskId: 'RISK_SVC_004',
    triggerName: 'Poor Service Rating',
    category: 'service',
    condition: 'Customer satisfaction score after service',
    threshold: '< 3 out of 5',
    thresholdValue: 3,
    measurementUnit: 'score',
    severity: 'high',
    description: 'Customer rated service below acceptable threshold.',
    businessImpact: 'Customer at high churn risk. Negative reviews possible.',
    recommendedAction: 'Customer Success to call within 24 hours. Understand issue, offer resolution.',
    owner: 'Customer Success',
    escalateTo: 'Branch Manager',
    escalationTrigger: 'Customer requests cancellation',
    kpisAffected: ['customer_satisfaction', 'net_promoter_score', 'churn_rate'],
    automatedAlert: true,
    alertFrequency: 'Immediate'
  },

  // =============================================================================
  // RENEWAL/RETENTION AT-RISK DEFINITIONS
  // =============================================================================
  {
    riskId: 'RISK_REN_001',
    triggerName: 'Upcoming Renewal No Engagement',
    category: 'renewal',
    condition: 'Contract renewal in < 60 days, no renewal activity logged',
    threshold: '< 60 days to renewal, no activity',
    thresholdValue: 60,
    measurementUnit: 'days to renewal',
    severity: 'high',
    description: 'Contract coming up for renewal with no proactive engagement.',
    businessImpact: 'Reactive renewals have lower retention. Missed upsell opportunities.',
    recommendedAction: 'Customer Success or Sales to initiate renewal conversation. Review account health.',
    owner: 'Customer Success',
    escalateTo: 'Sales Manager',
    escalationTrigger: '< 30 days to renewal without contact',
    kpisAffected: ['renewal_rate', 'customer_retention', 'expansion_revenue'],
    automatedAlert: true,
    alertFrequency: 'Weekly'
  },
  {
    riskId: 'RISK_REN_002',
    triggerName: 'Cancellation Request Received',
    category: 'renewal',
    condition: 'Customer submitted cancellation request',
    threshold: 'Cancellation request active',
    thresholdValue: 'active',
    measurementUnit: 'status',
    severity: 'critical',
    description: 'Customer has formally requested to cancel service.',
    businessImpact: 'Imminent revenue loss. CAC recovery at risk. Negative word of mouth.',
    recommendedAction: 'Customer Success Manager to call immediately. Understand reasons. Offer save plays.',
    owner: 'Customer Success',
    escalateTo: 'Branch Manager',
    escalationTrigger: 'High-value account (> $5K ACV)',
    kpisAffected: ['churn_rate', 'customer_retention', 'mrr_loss'],
    automatedAlert: true,
    alertFrequency: 'Immediate'
  },
  {
    riskId: 'RISK_REN_003',
    triggerName: 'Early Cancellation Risk',
    category: 'renewal',
    condition: 'Account < 6 months old with negative signals',
    threshold: 'Age < 6 months AND (missed service OR complaint OR callback)',
    thresholdValue: 6,
    measurementUnit: 'months',
    severity: 'critical',
    description: 'New account showing early warning signs of potential cancellation.',
    businessImpact: 'Early churn means negative CAC return. Indicates sales or onboarding issues.',
    recommendedAction: 'Branch Manager to review onboarding. Proactive outreach to address concerns.',
    owner: 'Branch Manager',
    escalateTo: 'Region Director',
    escalationTrigger: 'Multiple negative signals',
    kpisAffected: ['early_churn_rate', 'cac_payback', 'ltv'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  },

  // =============================================================================
  // COLLECTIONS AT-RISK DEFINITIONS
  // =============================================================================
  {
    riskId: 'RISK_COL_001',
    triggerName: 'Invoice Past Due',
    category: 'collection',
    condition: 'Invoice not paid within terms',
    threshold: '> 30 days past due',
    thresholdValue: 30,
    measurementUnit: 'days',
    severity: 'medium',
    description: 'Invoice has exceeded payment terms by more than 30 days.',
    businessImpact: 'Cash flow impact. Increased bad debt risk. Collection costs.',
    recommendedAction: 'Collections to send reminder. Account rep to assist if relationship issue.',
    owner: 'Collections',
    escalateTo: 'Branch Manager',
    escalationTrigger: '> 60 days past due',
    kpisAffected: ['dso', 'bad_debt_rate', 'cash_flow'],
    automatedAlert: true,
    alertFrequency: 'Weekly'
  },
  {
    riskId: 'RISK_COL_002',
    triggerName: 'Chronic Late Payer',
    category: 'collection',
    condition: 'Consecutive late payments',
    threshold: '> 3 late payments in 12 months',
    thresholdValue: 3,
    measurementUnit: 'count',
    severity: 'high',
    description: 'Account has pattern of late payments.',
    businessImpact: 'Ongoing cash flow drag. Higher collection effort. May indicate financial distress.',
    recommendedAction: 'Review payment terms. Consider requiring prepayment or shorter terms.',
    owner: 'Collections',
    escalateTo: 'Sales Manager',
    escalationTrigger: '> 5 late payments in 12 months',
    kpisAffected: ['dso', 'collection_efficiency', 'bad_debt_rate'],
    automatedAlert: true,
    alertFrequency: 'Monthly'
  },
  {
    riskId: 'RISK_COL_003',
    triggerName: 'Large Balance At Risk',
    category: 'collection',
    condition: 'Outstanding balance > $5000 AND days past due > 45',
    threshold: 'Balance > $5K AND > 45 days past due',
    thresholdValue: 5000,
    measurementUnit: 'currency',
    severity: 'critical',
    description: 'Large accounts receivable balance at elevated collection risk.',
    businessImpact: 'Significant bad debt exposure. May require write-off.',
    recommendedAction: 'Collections Manager to escalate. Consider service suspension. Legal review if needed.',
    owner: 'Collections',
    escalateTo: 'Region Director',
    escalationTrigger: '> 90 days past due',
    kpisAffected: ['bad_debt_rate', 'cash_flow', 'dso'],
    automatedAlert: true,
    alertFrequency: 'Daily'
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getRisksByCategory(category: AtRiskCategory): AtRiskDefinition[] {
  return AT_RISK_DEFINITIONS.filter(r => r.category === category);
}

export function getRisksBySeverity(severity: AtRiskSeverity): AtRiskDefinition[] {
  return AT_RISK_DEFINITIONS.filter(r => r.severity === severity);
}

export function getRisksByOwner(owner: AtRiskOwner): AtRiskDefinition[] {
  return AT_RISK_DEFINITIONS.filter(r => r.owner === owner);
}

export function getCriticalRisks(): AtRiskDefinition[] {
  return AT_RISK_DEFINITIONS.filter(r => r.severity === 'critical');
}

export function getAutomatedAlerts(): AtRiskDefinition[] {
  return AT_RISK_DEFINITIONS.filter(r => r.automatedAlert);
}

export function getCategoryDisplayName(category: AtRiskCategory): string {
  const names: Record<AtRiskCategory, string> = {
    opportunity: 'Sales Opportunities',
    account: 'Account Health',
    service: 'Service Delivery',
    onboarding: 'Customer Onboarding',
    renewal: 'Renewals & Retention',
    collection: 'Collections & AR'
  };
  return names[category];
}

export function getSeverityColor(severity: AtRiskSeverity): string {
  const colors: Record<AtRiskSeverity, string> = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'blue'
  };
  return colors[severity];
}

export function getAtRiskStats() {
  const total = AT_RISK_DEFINITIONS.length;
  const bySeverity = AT_RISK_DEFINITIONS.reduce((acc, r) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byCategory = AT_RISK_DEFINITIONS.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const automatedCount = AT_RISK_DEFINITIONS.filter(r => r.automatedAlert).length;

  return { total, bySeverity, byCategory, automatedCount };
}

export function getRiskById(riskId: string): AtRiskDefinition | undefined {
  return AT_RISK_DEFINITIONS.find(r => r.riskId === riskId);
}

export function getAllCategories(): AtRiskCategory[] {
  return ['opportunity', 'account', 'service', 'onboarding', 'renewal', 'collection'];
}
