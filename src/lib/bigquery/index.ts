/**
 * BigQuery Module
 *
 * Exports BigQuery client, types, and source systems for the Master Lead Service Engine.
 *
 * Usage:
 * ```typescript
 * import { bigQueryClient, createBigQueryClient, LEAD_FLOWS, SOURCE_SYSTEMS } from '@/lib/bigquery'
 *
 * // Test connection
 * const status = await bigQueryClient.testConnection()
 *
 * // Discover schema
 * const discovery = await bigQueryClient.discover()
 *
 * // Run a query
 * const results = await bigQueryClient.query('SELECT * FROM dataset.table LIMIT 10')
 *
 * // Get lead flows
 * const criticalFlows = getCriticalFlows()
 * ```
 */

// Client exports
export {
  bigQueryClient,
  createBigQueryClient,
  BigQueryClient,
  BigQueryApiError,
} from './client'

// Type constants
export {
  BIGQUERY_PROJECTS,
  KNOWN_TABLES,
  DATASET_PATTERNS,
} from './types'

// Source systems and lead flows
export {
  SOURCE_SYSTEMS,
  LEAD_FLOWS,
  getFlowsByPriority,
  getFlowsByStatus,
  getFlowsByCategory,
  getCriticalFlows,
  getPrioritizedFlows,
  calculateOverallTraceability,
  getStatusColor,
  getStatusBadgeVariant,
  getMatchRateStatus,
} from './source-systems'

// Type exports
export type {
  BigQueryEnvironment,
  BigQueryConfig,
  BigQueryConnectionStatus,
  BigQueryColumn,
  BigQueryTable,
  BigQueryDataset,
  BigQueryQueryResult,
  BigQueryQueryOptions,
  BigQueryDiscoveryResult,
  BigQueryHealthResult,
  // Lead traceability types
  LeadTraceEvent,
  LeadTrace,
  FlowTraceabilityMetrics,
  TraceabilityReport,
  LeadFilterState,
  DiscoveredSchema,
} from './types'

// Source system types
export type {
  SourceSystemId,
  SourceSystemType,
  TraceabilityStatus,
  SourceSystemConfig,
  LeadFlowDefinition,
} from './source-systems'
