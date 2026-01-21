/**
 * Data Lineage Tracking
 *
 * Maps data flow from source systems through transformations to final KPIs.
 * Used for governance, debugging, and understanding data provenance.
 */

import { SOURCE_SYSTEMS, LEAD_FLOWS, type SourceSystemId } from './source-systems'
import { TABLE_MAPPINGS } from './mappings'

// =============================================================================
// TYPES
// =============================================================================

export interface DataLineageNode {
  id: string
  name: string
  type: 'source_system' | 'bigquery_table' | 'transformation' | 'kpi' | 'dashboard'
  description?: string
  metadata?: Record<string, unknown>
}

export interface DataLineageEdge {
  from: string
  to: string
  transformationType?: 'raw' | 'aggregation' | 'join' | 'filter' | 'calculation'
  description?: string
}

export interface DataLineage {
  nodes: DataLineageNode[]
  edges: DataLineageEdge[]
}

export interface FieldLineage {
  kpiField: string
  kpiName: string
  sourceField: string
  sourceTable: string
  sourceSystem: SourceSystemId
  transformations: string[]
  refreshFrequency: string
  dataQualityScore?: number
}

// =============================================================================
// FIELD LINEAGE DEFINITIONS
// =============================================================================

/**
 * Complete field-level lineage for all KPIs
 */
export const FIELD_LINEAGE: FieldLineage[] = [
  // Revenue KPIs
  {
    kpiField: 'revenue_mtd',
    kpiName: 'Revenue MTD',
    sourceField: 'amount',
    sourceTable: 'SalesExecAPIExtract',
    sourceSystem: 'SALES_EXEC',
    transformations: ['SUM WHERE stage = Closed Won', 'Filter by close_date in current month'],
    refreshFrequency: 'Hourly',
  },
  {
    kpiField: 'revenue_forecast',
    kpiName: 'Revenue Forecast',
    sourceField: 'amount, probability',
    sourceTable: 'SalesExecAPIExtract',
    sourceSystem: 'SALES_EXEC',
    transformations: ['SUM(amount * probability / 100)', 'Filter by close_date in forecast period'],
    refreshFrequency: 'Daily',
  },

  // Lead KPIs
  {
    kpiField: 'total_leads',
    kpiName: 'Total Leads',
    sourceField: 'lead_id',
    sourceTable: 'LeadsExecAPIExtract_STG',
    sourceSystem: 'LEAD_EXEC',
    transformations: ['COUNT DISTINCT'],
    refreshFrequency: 'Hourly',
  },
  {
    kpiField: 'lead_conversion_rate',
    kpiName: 'Lead Conversion Rate',
    sourceField: 'disposition',
    sourceTable: 'LeadsExecAPIExtract_STG',
    sourceSystem: 'LEAD_EXEC',
    transformations: ['COUNT WHERE disposition = Converted / COUNT ALL', 'Percentage'],
    refreshFrequency: 'Daily',
  },
  {
    kpiField: 'mql_count',
    kpiName: 'MQL Count',
    sourceField: 'lead_stage',
    sourceTable: 'LeadsExecAPIExtract_STG',
    sourceSystem: 'LEAD_EXEC',
    transformations: ['COUNT WHERE lead_stage IN (MQL, Qualified)'],
    refreshFrequency: 'Hourly',
  },

  // Pipeline KPIs
  {
    kpiField: 'pipeline_value',
    kpiName: 'Pipeline Value',
    sourceField: 'amount',
    sourceTable: 'SalesExecAPIExtract',
    sourceSystem: 'SALES_EXEC',
    transformations: ['SUM WHERE stage NOT IN (Closed Won, Closed Lost)'],
    refreshFrequency: 'Hourly',
  },
  {
    kpiField: 'weighted_pipeline',
    kpiName: 'Weighted Pipeline',
    sourceField: 'amount, probability',
    sourceTable: 'SalesExecAPIExtract',
    sourceSystem: 'SALES_EXEC',
    transformations: ['SUM(amount * probability / 100) WHERE stage NOT IN (Closed Won, Closed Lost)'],
    refreshFrequency: 'Daily',
  },
  {
    kpiField: 'win_rate',
    kpiName: 'Win Rate',
    sourceField: 'stage',
    sourceTable: 'SalesExecAPIExtract',
    sourceSystem: 'SALES_EXEC',
    transformations: ['COUNT Closed Won / COUNT (Closed Won + Closed Lost)', 'Percentage'],
    refreshFrequency: 'Daily',
  },

  // Traceability KPIs
  {
    kpiField: 'overall_match_rate',
    kpiName: 'Overall Match Rate',
    sourceField: 'lead_id',
    sourceTable: 'LeadsExecAPIExtract_STG, SalesExecAPIExtract',
    sourceSystem: 'LEAD_EXEC',
    transformations: ['JOIN on lead_id', 'COUNT matched / COUNT total', 'Percentage'],
    refreshFrequency: 'Daily',
  },
  {
    kpiField: 'flow_4_match_rate',
    kpiName: 'Flow 4 Match Rate (Res Outbound Direct)',
    sourceField: 'lead_id, source',
    sourceTable: 'LeadsExecAPIExtract_STG, SalesExecAPIExtract',
    sourceSystem: 'LEAD_EXEC',
    transformations: ['Filter source LIKE outbound', 'JOIN Five9 → Sales Exec', 'COUNT matched / COUNT total'],
    refreshFrequency: 'Daily',
  },

  // Operations KPIs
  {
    kpiField: 'speed_to_install',
    kpiName: 'Speed to Install',
    sourceField: 'close_date, install_date',
    sourceTable: 'SalesExecAPIExtract',
    sourceSystem: 'SALES_EXEC',
    transformations: ['AVG(install_date - close_date)', 'Days'],
    refreshFrequency: 'Daily',
  },
  {
    kpiField: 'cancel_rate',
    kpiName: 'Cancel Rate',
    sourceField: 'stage',
    sourceTable: 'SalesExecAPIExtract',
    sourceSystem: 'SALES_EXEC',
    transformations: ['COUNT Canceled / COUNT Closed Won', 'Percentage'],
    refreshFrequency: 'Daily',
  },
]

// =============================================================================
// LINEAGE GRAPH BUILDERS
// =============================================================================

/**
 * Build complete data lineage graph
 */
export function buildDataLineageGraph(): DataLineage {
  const nodes: DataLineageNode[] = []
  const edges: DataLineageEdge[] = []

  // Add source system nodes
  Object.entries(SOURCE_SYSTEMS).forEach(([id, system]) => {
    nodes.push({
      id: `source_${id}`,
      name: system.name,
      type: 'source_system',
      description: system.description,
      metadata: {
        integrationStatus: system.integrationStatus,
        dataTypes: system.dataTypes,
      },
    })
  })

  // Add BigQuery table nodes
  Object.entries(TABLE_MAPPINGS).forEach(([key, mapping]) => {
    const tableId = `table_${key}`
    nodes.push({
      id: tableId,
      name: mapping.bigQueryTable,
      type: 'bigquery_table',
      description: mapping.description,
      metadata: {
        columnCount: mapping.columns.length,
        primaryKey: mapping.primaryKey,
      },
    })

    // Edge from source system to table
    edges.push({
      from: `source_${mapping.sourceSystem}`,
      to: tableId,
      transformationType: 'raw',
      description: 'Raw data ingestion',
    })
  })

  // Add KPI nodes
  const kpis = [
    { id: 'kpi_revenue', name: 'Revenue KPIs', tables: ['table_salesExec'] },
    { id: 'kpi_leads', name: 'Lead KPIs', tables: ['table_leadExec'] },
    { id: 'kpi_pipeline', name: 'Pipeline KPIs', tables: ['table_salesExec'] },
    { id: 'kpi_traceability', name: 'Traceability KPIs', tables: ['table_leadExec', 'table_salesExec'] },
    { id: 'kpi_operations', name: 'Operations KPIs', tables: ['table_salesExec'] },
  ]

  kpis.forEach(kpi => {
    nodes.push({
      id: kpi.id,
      name: kpi.name,
      type: 'kpi',
    })

    kpi.tables.forEach(table => {
      edges.push({
        from: table,
        to: kpi.id,
        transformationType: 'calculation',
        description: 'KPI calculation',
      })
    })
  })

  // Add dashboard nodes
  const dashboards = [
    { id: 'dash_command', name: 'Command Center', kpis: ['kpi_revenue', 'kpi_leads', 'kpi_pipeline'] },
    { id: 'dash_sales', name: 'Sales Dashboard', kpis: ['kpi_revenue', 'kpi_pipeline'] },
    { id: 'dash_leads', name: 'Leads Dashboard', kpis: ['kpi_leads', 'kpi_traceability'] },
    { id: 'dash_ops', name: 'Operations Dashboard', kpis: ['kpi_operations'] },
    { id: 'dash_lse', name: 'Lead Service Engine', kpis: ['kpi_leads', 'kpi_traceability'] },
  ]

  dashboards.forEach(dash => {
    nodes.push({
      id: dash.id,
      name: dash.name,
      type: 'dashboard',
    })

    dash.kpis.forEach(kpi => {
      edges.push({
        from: kpi,
        to: dash.id,
        description: 'Dashboard display',
      })
    })
  })

  return { nodes, edges }
}

/**
 * Get lineage for a specific KPI
 */
export function getKPILineage(kpiSlug: string): {
  fields: FieldLineage[]
  sourceSystems: SourceSystemId[]
  tables: string[]
  transformationSteps: string[]
} {
  const fields = FIELD_LINEAGE.filter(f =>
    f.kpiField.includes(kpiSlug) || f.kpiName.toLowerCase().includes(kpiSlug.toLowerCase())
  )

  const sourceSystems = [...new Set(fields.map(f => f.sourceSystem))]
  const tables = [...new Set(fields.map(f => f.sourceTable))]
  const transformationSteps = fields.flatMap(f => f.transformations)

  return {
    fields,
    sourceSystems,
    tables,
    transformationSteps: [...new Set(transformationSteps)],
  }
}

/**
 * Get lineage for a specific lead flow
 */
export function getFlowLineage(flowId: number): {
  flow: typeof LEAD_FLOWS[keyof typeof LEAD_FLOWS] | undefined
  systemNodes: Array<{ system: SourceSystemId; name: string; hasTable: boolean }>
  handoffs: Array<{ from: SourceSystemId; to: SourceSystemId; matchRate: number }>
} {
  const flow = Object.values(LEAD_FLOWS).find(f => f.id === flowId)

  if (!flow) {
    return { flow: undefined, systemNodes: [], handoffs: [] }
  }

  const systemNodes = flow.systems.map(systemId => {
    const system = SOURCE_SYSTEMS[systemId]
    const hasTable = system?.bigQueryTable !== null
    return {
      system: systemId,
      name: system?.name || systemId,
      hasTable,
    }
  })

  const handoffs: Array<{ from: SourceSystemId; to: SourceSystemId; matchRate: number }> = []
  for (let i = 0; i < flow.systems.length - 1; i++) {
    handoffs.push({
      from: flow.systems[i],
      to: flow.systems[i + 1],
      matchRate: flow.matchRate, // Simplified - in reality would be per-handoff
    })
  }

  return { flow, systemNodes, handoffs }
}

/**
 * Get all fields affected by a source system change
 */
export function getImpactedFields(sourceSystem: SourceSystemId): FieldLineage[] {
  return FIELD_LINEAGE.filter(f => f.sourceSystem === sourceSystem)
}

/**
 * Get data freshness requirements
 */
export function getRefreshRequirements(): Array<{
  sourceSystem: SourceSystemId
  refreshFrequency: string
  impactedKPIs: string[]
}> {
  const requirements: Map<SourceSystemId, { frequencies: Set<string>; kpis: Set<string> }> = new Map()

  FIELD_LINEAGE.forEach(field => {
    if (!requirements.has(field.sourceSystem)) {
      requirements.set(field.sourceSystem, { frequencies: new Set(), kpis: new Set() })
    }
    const req = requirements.get(field.sourceSystem)!
    req.frequencies.add(field.refreshFrequency)
    req.kpis.add(field.kpiName)
  })

  return Array.from(requirements.entries()).map(([system, data]) => ({
    sourceSystem: system,
    refreshFrequency: getMostFrequent(data.frequencies),
    impactedKPIs: Array.from(data.kpis),
  }))
}

function getMostFrequent(frequencies: Set<string>): string {
  const priority = ['Real-time', 'Hourly', 'Daily', 'Weekly', 'Monthly']
  for (const freq of priority) {
    if (frequencies.has(freq)) return freq
  }
  return Array.from(frequencies)[0] || 'Unknown'
}

/**
 * Export lineage as DOT format for visualization
 */
export function exportLineageAsDOT(lineage: DataLineage): string {
  let dot = 'digraph DataLineage {\n'
  dot += '  rankdir=LR;\n'
  dot += '  node [shape=box];\n\n'

  // Group nodes by type
  const nodesByType: Record<string, DataLineageNode[]> = {}
  lineage.nodes.forEach(node => {
    if (!nodesByType[node.type]) nodesByType[node.type] = []
    nodesByType[node.type].push(node)
  })

  // Add subgraphs for each type
  const typeColors: Record<string, string> = {
    source_system: '#E3F2FD',
    bigquery_table: '#FFF3E0',
    transformation: '#F3E5F5',
    kpi: '#E8F5E9',
    dashboard: '#FCE4EC',
  }

  Object.entries(nodesByType).forEach(([type, nodes]) => {
    dot += `  subgraph cluster_${type} {\n`
    dot += `    label="${type.replace('_', ' ').toUpperCase()}";\n`
    dot += `    style=filled;\n`
    dot += `    color="${typeColors[type] || '#F5F5F5'}";\n`
    nodes.forEach(node => {
      dot += `    "${node.id}" [label="${node.name}"];\n`
    })
    dot += '  }\n\n'
  })

  // Add edges
  lineage.edges.forEach(edge => {
    const label = edge.description ? ` [label="${edge.description}"]` : ''
    dot += `  "${edge.from}" -> "${edge.to}"${label};\n`
  })

  dot += '}\n'
  return dot
}
