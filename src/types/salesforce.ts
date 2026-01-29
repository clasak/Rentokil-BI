/**
 * TypeScript Types for Salesforce Data (Phase 2A - Tier 1)
 *
 * These types match the Salesforce RTXSF tables in BigQuery:
 * - Raw_RTXSF_Account_Daily
 * - Raw_RTXSF_Contact_Daily
 * - Raw_RTXSF_OpportunityHistory_Daily
 * - Raw_RTXSF_Employee__c_Daily
 */

// Import and re-export query types from salesforce.ts
import type {
  SalesforceQueryOptions,
  SalesforceAccount,
  SalesforceAccountDetail,
  SalesforceContact,
  SalesforceOpportunityHistory,
  SalesforceEmployee,
} from '@/lib/bigquery/queries/salesforce'

export type {
  SalesforceQueryOptions,
  SalesforceAccount,
  SalesforceAccountDetail,
  SalesforceContact,
  SalesforceOpportunityHistory,
  SalesforceEmployee,
}

// UI Display Types

export interface AccountCardProps {
  account: SalesforceAccountSummary
  onClick?: () => void
}

export interface SalesforceAccountSummary {
  accountId: string
  accountName: string
  industry: string
  city: string
  state: string
  opportunityCount: number
  lastActivityDate: string
  isPestPacLinked: boolean
  isStrategicAccount: boolean
}

export interface ContactListProps {
  contacts: SalesforceContact[]
  isLoading: boolean
}

export interface OpportunityTimelineProps{
  history: SalesforceStageHistory[]
  isLoading: boolean
}

export interface SalesforceStageHistory {
  stageName: string
  createdDate: string
  daysInStage: number
  createdByName: string
}
