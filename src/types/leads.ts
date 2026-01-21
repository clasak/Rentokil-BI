// RTX Power BI Lead Types

export type LeadSource =
  | 'inbound_call'
  | 'web_form'
  | 'referral'
  | 'canvass'
  | 'door_knock'
  | 'trade_show'
  | 'partner'
  | 'reactivation'
  | 'cross_sell'
  | 'upsell'

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'negotiating'
  | 'won'
  | 'lost'
  | 'disqualified'

export type LeadQuality = 'hot' | 'warm' | 'cold'

export type LeadChannel = 'phone' | 'email' | 'web' | 'in_person' | 'chat'

export interface Lead {
  id: string
  createdAt: Date
  source: LeadSource
  channel: LeadChannel
  status: LeadStatus
  quality: LeadQuality

  // Contact info
  contactName: string
  contactPhone: string
  contactEmail: string
  companyName?: string

  // Location
  address: string
  city: string
  state: string
  zipCode: string
  branchId: string
  regionId: string

  // Service interest
  serviceType: string
  estimatedValue: number
  urgency: 'immediate' | 'soon' | 'researching'

  // Assignment
  assignedRepId?: string
  assignedRepName?: string

  // Tracking
  firstContactDate?: Date
  lastContactDate?: Date
  nextFollowUpDate?: Date
  contactAttempts: number

  // Outcome
  convertedOpportunityId?: string
  lostReason?: string
  notes: string
}

export interface LeadMetrics {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  qualifiedLeads: number
  convertedLeads: number
  lostLeads: number

  conversionRate: number
  avgTimeToContact: number // hours
  avgTimeToConvert: number // days
  avgLeadValue: number

  bySource: Record<LeadSource, number>
  byChannel: Record<LeadChannel, number>
  byQuality: Record<LeadQuality, number>
}

export interface LeadTrend {
  date: Date
  leadsCreated: number
  leadsContacted: number
  leadsConverted: number
  leadsLost: number
  conversionRate: number
}

export interface LeadFunnel {
  stage: LeadStatus
  count: number
  value: number
  avgAge: number
  conversionRate: number
}

export interface LeadPerformance {
  repId: string
  repName: string
  leadsAssigned: number
  leadsContacted: number
  leadsConverted: number
  avgResponseTime: number
  conversionRate: number
  totalValue: number
}

export interface LeadSourceAnalysis {
  source: LeadSource
  leads: number
  conversions: number
  conversionRate: number
  avgValue: number
  totalValue: number
  costPerLead?: number
  roi?: number
}

export interface LeadDashboard {
  period: string
  metrics: LeadMetrics
  trend: LeadTrend[]
  funnel: LeadFunnel[]
  topPerformers: LeadPerformance[]
  sourceAnalysis: LeadSourceAnalysis[]
}
