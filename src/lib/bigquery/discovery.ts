/**
 * BigQuery Schema Discovery
 *
 * Tools for discovering and exploring BigQuery schema.
 * Used by the RTX Discovery dashboard.
 */

import type { BigQueryClient } from './client'
import { SOURCE_SYSTEMS, type SourceSystemId } from './source-systems'
import { TABLE_MAPPINGS, getMappingByTable } from './mappings'

// =============================================================================
// TYPES
// =============================================================================

export interface DiscoveredTable {
  datasetId: string
  tableId: string
  fullName: string
  description?: string
  rowCount?: number
  sizeBytes?: number
  lastModified?: Date
  columns: DiscoveredColumn[]
  sourceSystem?: SourceSystemId
  hasMapping: boolean
}

export interface DiscoveredColumn {
  name: string
  type: string
  mode: 'NULLABLE' | 'REQUIRED' | 'REPEATED'
  description?: string
  sampleValues?: unknown[]
  nullPercentage?: number
}

export interface DiscoveryResult {
  timestamp: Date
  projectId: string
  datasets: DiscoveredDataset[]
  totalTables: number
  mappedTables: number
  unmappedTables: number
  recommendations: DiscoveryRecommendation[]
}

export interface DiscoveredDataset {
  id: string
  location?: string
  tables: DiscoveredTable[]
}

export interface DiscoveryRecommendation {
  type: 'missing_mapping' | 'schema_mismatch' | 'stale_data' | 'potential_source'
  severity: 'info' | 'warning' | 'critical'
  table: string
  message: string
  suggestedAction?: string
}

// =============================================================================
// DISCOVERY FUNCTIONS
// =============================================================================

/**
 * Discover all tables in the project
 */
export async function discoverSchema(
  client: BigQueryClient,
  options: {
    includeRowCounts?: boolean
    includeSamples?: boolean
    sampleSize?: number
  } = {}
): Promise<DiscoveryResult> {
  const { includeRowCounts = false, includeSamples = false, sampleSize = 5 } = options

  const projectId = client.getProjectId() || 'unknown'
  const datasets = await client.listDatasets()

  const discoveredDatasets: DiscoveredDataset[] = []
  const recommendations: DiscoveryRecommendation[] = []
  let totalTables = 0
  let mappedTables = 0

  for (const dataset of datasets) {
    const tables = await client.listTables(dataset.id)
    const discoveredTables: DiscoveredTable[] = []

    for (const table of tables) {
      totalTables++
      const columns = await client.getTableSchema(dataset.id, table.name)

      const mapping = getMappingByTable(table.name)
      if (mapping) {
        mappedTables++
      }

      // Detect potential source system
      const sourceSystem = detectSourceSystem(table.name, columns.map(c => c.name))

      const discoveredTable: DiscoveredTable = {
        datasetId: dataset.id,
        tableId: table.name,
        fullName: `${dataset.id}.${table.name}`,
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          mode: col.mode as 'NULLABLE' | 'REQUIRED' | 'REPEATED',
          description: col.description,
        })),
        sourceSystem,
        hasMapping: !!mapping,
      }

      // Get row count if requested
      if (includeRowCounts) {
        try {
          const countResult = await client.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM \`${projectId}.${dataset.id}.${table.name}\``
          )
          discoveredTable.rowCount = countResult.rows[0]?.count || 0
        } catch {
          // Table might not be accessible
        }
      }

      // Get sample values if requested
      if (includeSamples && discoveredTable.columns.length > 0) {
        try {
          const sampleCols = discoveredTable.columns.slice(0, 5).map(c => c.name).join(', ')
          const sampleResult = await client.query(
            `SELECT ${sampleCols} FROM \`${projectId}.${dataset.id}.${table.name}\` LIMIT ${sampleSize}`
          )
          // Attach samples to columns
          for (const col of discoveredTable.columns.slice(0, 5)) {
            col.sampleValues = sampleResult.rows.map(row => row[col.name])
          }
        } catch {
          // Sampling might fail for some tables
        }
      }

      // Generate recommendations
      if (!mapping && sourceSystem) {
        recommendations.push({
          type: 'missing_mapping',
          severity: 'warning',
          table: discoveredTable.fullName,
          message: `Table appears to be from ${SOURCE_SYSTEMS[sourceSystem].name} but has no mapping`,
          suggestedAction: `Add mapping for ${table.name} in src/lib/bigquery/mappings.ts`,
        })
      }

      if (!sourceSystem && !mapping) {
        recommendations.push({
          type: 'potential_source',
          severity: 'info',
          table: discoveredTable.fullName,
          message: `Unable to determine source system for this table`,
          suggestedAction: 'Review table contents to identify data source',
        })
      }

      discoveredTables.push(discoveredTable)
    }

    discoveredDatasets.push({
      id: dataset.id,
      tables: discoveredTables,
    })
  }

  return {
    timestamp: new Date(),
    projectId,
    datasets: discoveredDatasets,
    totalTables,
    mappedTables,
    unmappedTables: totalTables - mappedTables,
    recommendations,
  }
}

/**
 * Detect source system based on table name and columns
 */
function detectSourceSystem(tableName: string, columns: string[]): SourceSystemId | undefined {
  const tableNameLower = tableName.toLowerCase()
  const columnSet = new Set(columns.map(c => c.toLowerCase()))

  // Lead Exec patterns
  if (
    tableNameLower.includes('leadexec') ||
    tableNameLower.includes('leads_exec') ||
    tableNameLower.includes('leadsexecapi')
  ) {
    return 'LEAD_EXEC'
  }

  // Sales Exec patterns
  if (
    tableNameLower.includes('salesexec') ||
    tableNameLower.includes('sales_exec') ||
    tableNameLower.includes('salesexecapi')
  ) {
    return 'SALES_EXEC'
  }

  // Five9 patterns
  if (
    tableNameLower.includes('five9') ||
    (columnSet.has('call_id') && columnSet.has('disposition'))
  ) {
    return 'FIVE9'
  }

  // Invoca patterns
  if (
    tableNameLower.includes('invoca') ||
    (columnSet.has('call_id') && columnSet.has('tracking_number'))
  ) {
    return 'INVOCA'
  }

  // PestPac patterns
  if (
    tableNameLower.includes('pestpac') ||
    tableNameLower.includes('service_order') ||
    (columnSet.has('technician_id') && columnSet.has('service_type'))
  ) {
    return 'PESTPAC'
  }

  // Salesforce patterns
  if (
    tableNameLower.includes('salesforce') ||
    tableNameLower.includes('sfdc') ||
    columnSet.has('salesforce_id')
  ) {
    return 'SALESFORCE'
  }

  // Winning Formula patterns
  if (
    tableNameLower.includes('winning_formula') ||
    tableNameLower.includes('field_sales')
  ) {
    return 'WINNING_FORMULA'
  }

  return undefined
}

/**
 * Compare discovered schema with existing mappings
 */
export function compareSchemaWithMappings(discoveryResult: DiscoveryResult): {
  matches: string[]
  mismatches: Array<{
    table: string
    issue: string
    details: string
  }>
} {
  const matches: string[] = []
  const mismatches: Array<{ table: string; issue: string; details: string }> = []

  for (const dataset of discoveryResult.datasets) {
    for (const table of dataset.tables) {
      const mapping = getMappingByTable(table.tableId)

      if (!mapping) continue

      // Check if all mapped columns exist
      const discoveredColNames = new Set(table.columns.map(c => c.name.toLowerCase()))

      for (const mappedCol of mapping.columns) {
        if (!discoveredColNames.has(mappedCol.bigQueryColumn.toLowerCase())) {
          mismatches.push({
            table: table.fullName,
            issue: 'missing_column',
            details: `Mapped column "${mappedCol.bigQueryColumn}" not found in BigQuery table`,
          })
        }
      }

      // Check for unmapped columns
      const mappedColNames = new Set(mapping.columns.map(c => c.bigQueryColumn.toLowerCase()))
      const unmappedCols = table.columns.filter(
        c => !mappedColNames.has(c.name.toLowerCase())
      )

      if (unmappedCols.length > 0) {
        mismatches.push({
          table: table.fullName,
          issue: 'unmapped_columns',
          details: `${unmappedCols.length} columns in BigQuery not in mapping: ${unmappedCols.slice(0, 5).map(c => c.name).join(', ')}${unmappedCols.length > 5 ? '...' : ''}`,
        })
      }

      if (mismatches.filter(m => m.table === table.fullName).length === 0) {
        matches.push(table.fullName)
      }
    }
  }

  return { matches, mismatches }
}

/**
 * Generate SQL to get data quality metrics for a table
 */
export function generateDataQualityQuery(
  projectId: string,
  datasetId: string,
  tableId: string,
  columns: DiscoveredColumn[]
): string {
  const nullChecks = columns
    .slice(0, 10) // Limit to first 10 columns for performance
    .map(col => `COUNTIF(${col.name} IS NULL) as ${col.name}_nulls`)
    .join(',\n    ')

  return `
    SELECT
      COUNT(*) as total_rows,
      ${nullChecks}
    FROM \`${projectId}.${datasetId}.${tableId}\`
  `
}

/**
 * Suggest column mappings based on column names
 */
export function suggestColumnMappings(
  columns: DiscoveredColumn[]
): Array<{ column: string; suggestedField: string; confidence: 'high' | 'medium' | 'low' }> {
  const suggestions: Array<{ column: string; suggestedField: string; confidence: 'high' | 'medium' | 'low' }> = []

  const commonMappings: Record<string, { suggestedField: string; confidence: 'high' | 'medium' | 'low' }> = {
    // ID fields
    lead_id: { suggestedField: 'leadId', confidence: 'high' },
    opportunity_id: { suggestedField: 'opportunityId', confidence: 'high' },
    account_id: { suggestedField: 'accountId', confidence: 'high' },
    customer_id: { suggestedField: 'customerId', confidence: 'high' },
    id: { suggestedField: 'id', confidence: 'high' },

    // Date fields
    created_date: { suggestedField: 'createdAt', confidence: 'high' },
    created_at: { suggestedField: 'createdAt', confidence: 'high' },
    modified_date: { suggestedField: 'updatedAt', confidence: 'high' },
    updated_at: { suggestedField: 'updatedAt', confidence: 'high' },
    last_modified_date: { suggestedField: 'updatedAt', confidence: 'high' },
    close_date: { suggestedField: 'closeDate', confidence: 'high' },

    // Common fields
    stage: { suggestedField: 'stage', confidence: 'high' },
    status: { suggestedField: 'status', confidence: 'high' },
    amount: { suggestedField: 'amount', confidence: 'high' },
    value: { suggestedField: 'value', confidence: 'medium' },
    owner_id: { suggestedField: 'ownerId', confidence: 'high' },
    assigned_to: { suggestedField: 'assignedTo', confidence: 'high' },
    source: { suggestedField: 'source', confidence: 'medium' },
    lead_source: { suggestedField: 'source', confidence: 'high' },

    // Contact fields
    first_name: { suggestedField: 'firstName', confidence: 'high' },
    last_name: { suggestedField: 'lastName', confidence: 'high' },
    email: { suggestedField: 'email', confidence: 'high' },
    phone: { suggestedField: 'phone', confidence: 'high' },

    // Location fields
    market: { suggestedField: 'market', confidence: 'high' },
    region: { suggestedField: 'region', confidence: 'high' },
    branch: { suggestedField: 'branch', confidence: 'high' },
    city: { suggestedField: 'city', confidence: 'high' },
    state: { suggestedField: 'state', confidence: 'high' },
    zip: { suggestedField: 'zip', confidence: 'high' },
    address: { suggestedField: 'address', confidence: 'high' },
  }

  for (const col of columns) {
    const colLower = col.name.toLowerCase()

    if (commonMappings[colLower]) {
      suggestions.push({
        column: col.name,
        ...commonMappings[colLower],
      })
    } else {
      // Try to infer from patterns
      if (colLower.endsWith('_id')) {
        suggestions.push({
          column: col.name,
          suggestedField: colLower.replace(/_id$/, 'Id').replace(/_/g, ''),
          confidence: 'medium',
        })
      } else if (colLower.endsWith('_date') || colLower.endsWith('_at')) {
        const base = colLower.replace(/(_date|_at)$/, '')
        suggestions.push({
          column: col.name,
          suggestedField: base.replace(/_/g, '') + 'At',
          confidence: 'medium',
        })
      }
    }
  }

  return suggestions
}
