/**
 * BigQuery Type Definitions
 *
 * Types for BigQuery client configuration, connection status,
 * and schema discovery.
 */

/**
 * BigQuery environment/project options
 */
export type BigQueryEnvironment = 'production' | 'staging' | 'dev'

/**
 * Project ID mapping for each environment
 */
export const BIGQUERY_PROJECTS: Record<BigQueryEnvironment, string> = {
  production: 'bidata-sharedus-production',
  staging: 'bidata-sharedus-staging',
  dev: 'bidata-sharedus-dev',
}

/**
 * BigQuery client configuration
 */
export interface BigQueryConfig {
  /**
   * Environment to use (production, staging, dev)
   * Determines which GCP project to connect to
   */
  environment: BigQueryEnvironment

  /**
   * GCP project ID (derived from environment if not specified)
   */
  projectId?: string

  /**
   * Default dataset to query from
   */
  dataset?: string

  /**
   * Location for dataset (default: US)
   */
  location?: string

  /**
   * Request timeout in milliseconds
   */
  timeout?: number

  /**
   * Path to service account key file (optional - uses ADC if not set)
   */
  keyFilename?: string
}

/**
 * BigQuery connection status
 */
export interface BigQueryConnectionStatus {
  connected: boolean
  lastChecked: string
  responseTime?: number
  projectId?: string
  environment?: BigQueryEnvironment
  error?: string
  datasets?: string[]
}

/**
 * BigQuery table schema column
 */
export interface BigQueryColumn {
  name: string
  type: string
  mode: 'NULLABLE' | 'REQUIRED' | 'REPEATED'
  description?: string
  fields?: BigQueryColumn[] // For RECORD types
}

/**
 * BigQuery table metadata
 */
export interface BigQueryTable {
  id: string
  name: string
  datasetId: string
  projectId: string
  type: 'TABLE' | 'VIEW' | 'MATERIALIZED_VIEW' | 'EXTERNAL'
  numRows?: string
  numBytes?: string
  creationTime: string
  lastModifiedTime: string
  description?: string
  schema?: BigQueryColumn[]
}

/**
 * BigQuery dataset metadata
 */
export interface BigQueryDataset {
  id: string
  projectId: string
  location: string
  creationTime: string
  lastModifiedTime: string
  description?: string
  tables?: BigQueryTable[]
}

/**
 * BigQuery query result
 */
export interface BigQueryQueryResult<T = Record<string, unknown>> {
  rows: T[]
  totalRows: number
  schema: BigQueryColumn[]
  jobId: string
  cacheHit?: boolean
  totalBytesProcessed?: string
  totalBytesBilled?: string
}

/**
 * BigQuery query options
 */
export interface BigQueryQueryOptions {
  /**
   * Maximum number of rows to return
   */
  maxResults?: number

  /**
   * Use query cache if available
   */
  useQueryCache?: boolean

  /**
   * Use legacy SQL syntax (default: false = Standard SQL)
   */
  useLegacySql?: boolean

  /**
   * Request timeout in milliseconds
   */
  timeout?: number

  /**
   * Dry run - validate query without executing
   */
  dryRun?: boolean

  /**
   * Query parameters for parameterized queries
   */
  params?: Record<string, unknown> | unknown[]
}

/**
 * BigQuery discovery result
 */
export interface BigQueryDiscoveryResult {
  projectId: string
  environment: BigQueryEnvironment
  datasets: BigQueryDataset[]
  timestamp: string
  error?: string
}

/**
 * BigQuery health check result
 */
export interface BigQueryHealthResult {
  status: 'ok' | 'warning' | 'error'
  message?: string
  projectId?: string
  environment?: BigQueryEnvironment
  datasets?: string[]
  responseTime?: number
  permissions?: {
    canQuery: boolean
    canListDatasets: boolean
    canListTables: boolean
  }
}

// =============================================================================
// KNOWN TABLES CONFIGURATION
// =============================================================================

/**
 * Known BigQuery tables from RTX Data Hub
 * These are documented tables we know exist - more will be discovered
 */
export const KNOWN_TABLES = {
  // Sales Exec API Extract
  salesExecExtract: {
    fullName: 'SalesExecAPIExtract',
    dataset: null as string | null, // To be discovered
    description: 'Sales Exec API data - SQLs, opportunities, proposals, sales',
    sourceSystem: 'SALES_EXEC',
    keyFields: ['lead_id', 'opportunity_id', 'stage', 'close_date', 'amount'],
  },
  // Lead Exec API Extract (Staging)
  leadsExecExtract: {
    fullName: 'LeadsExecAPIExtract_STG',
    dataset: null as string | null,
    description: 'Lead Exec API staging data - MQLs, lead routing, assignments',
    sourceSystem: 'LEAD_EXEC',
    keyFields: ['lead_id', 'lead_source', 'lead_stage', 'assigned_to', 'received_date'],
  },
  // Prospect Pipeline View
  prospectPipeline: {
    fullName: 'S3_iCABS.vw_ProspectPipelineNA9',
    dataset: 'S3_iCABS',
    description: 'Prospect pipeline view from iCABS',
    sourceSystem: 'ICABS',
    keyFields: ['prospect_id', 'pipeline_stage', 'expected_value'],
  },
  // Contract View
  contracts: {
    fullName: 'S0_TMX.vw_rp_p_stage2_Contract',
    dataset: 'S0_TMX',
    description: 'Contract data from TMX',
    sourceSystem: 'TMX',
    keyFields: ['contract_id', 'account_id', 'contract_value', 'start_date'],
  },
} as const

/**
 * Known dataset prefixes for pattern matching
 */
export const DATASET_PATTERNS = {
  S0_TMX: 'TMX ERP data',
  S3_iCABS: 'iCABS field service data',
  S1_: 'Source system 1 data',
  S2_: 'Source system 2 data',
  lead: 'Lead management data',
  sales: 'Sales pipeline data',
  pest: 'PestPac service data',
} as const

// =============================================================================
// LEAD TRACEABILITY TYPES
// =============================================================================

/**
 * A single lead trace event showing where the lead was at a point in time
 */
export interface LeadTraceEvent {
  system: string
  enteredAt: Date
  exitedAt?: Date
  durationMinutes?: number
  stage?: string
  assignedTo?: string
  notes?: string
}

/**
 * Complete lead trace across all systems
 */
export interface LeadTrace {
  leadId: string
  currentSystem: string
  currentStage: string
  flowId: number // Which lead flow (1-15)

  // Journey through systems
  journey: LeadTraceEvent[]

  // Traceability status
  isTraceable: boolean
  matchConfidence: 'high' | 'medium' | 'low' | 'none'
  lastKnownSystem: string
  lostAtHandoff?: {
    fromSystem: string
    toSystem: string
    expectedAt: Date
  }

  // Source info
  originalSource: string
  sourceChannel?: string
  utmParameters?: Record<string, string>

  // Outcome
  outcome?: 'sold' | 'lost' | 'cancelled' | 'pending' | 'unknown'
  value?: number
  closeDate?: Date

  // Timestamps
  firstSeen: Date
  lastSeen: Date
  totalJourneyDays: number
}

/**
 * Traceability metrics for a specific lead flow
 */
export interface FlowTraceabilityMetrics {
  flowId: number
  flowName: string
  totalLeads: number
  traceableLeads: number
  matchRate: number
  avgJourneyDays: number

  // Breakpoints where leads are lost
  breakpoints: {
    fromSystem: string
    toSystem: string
    leadsLost: number
    percentLost: number
  }[]

  // Outcomes
  outcomes: {
    sold: number
    lost: number
    cancelled: number
    pending: number
    unknown: number
  }

  // Value metrics
  totalValue: number
  avgValue: number
  atRiskValue: number
}

/**
 * Overall traceability report across all flows
 */
export interface TraceabilityReport {
  generatedAt: Date
  dateRange: {
    start: Date
    end: Date
  }

  // Summary metrics
  summary: {
    totalLeads: number
    traceableLeads: number
    overallMatchRate: number
    criticalFlowCount: number
    improvementOpportunity: number // Value at risk from low traceability
  }

  // By flow
  byFlow: FlowTraceabilityMetrics[]

  // By source system
  bySystem: {
    system: string
    leadsEntered: number
    leadsExited: number
    leadsLost: number
    avgTimeInSystem: number
  }[]

  // Top breakpoints
  topBreakpoints: {
    fromSystem: string
    toSystem: string
    leadsLost: number
    percentOfTotal: number
    estimatedValueLost: number
  }[]
}

/**
 * Lead filter state for UI
 */
export interface LeadFilterState {
  dateRange?: {
    start: Date
    end: Date
  }
  flowIds?: number[]
  systems?: string[]
  stages?: string[]
  traceabilityStatus?: ('traceable' | 'lost' | 'all')
  outcome?: ('sold' | 'lost' | 'cancelled' | 'pending' | 'all')
  matchConfidence?: ('high' | 'medium' | 'low' | 'all')
  market?: string
  region?: string
  branch?: string
}

/**
 * Discovered schema from BigQuery
 */
export interface DiscoveredSchema {
  project: string
  discoveredAt: Date
  datasets: {
    name: string
    tables: {
      name: string
      rowCount?: number
      lastModified?: Date
      columns: BigQueryColumn[]
      likelySourceSystem?: string
    }[]
    likelySourceSystem?: string
  }[]
  tableCount: number
  unmappedTables: string[]
}
