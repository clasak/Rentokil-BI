import { NextRequest, NextResponse } from 'next/server'
import { bigQueryClient } from '@/lib/bigquery'
import type { BigQueryDiscoveryResult, BigQueryDataset, BigQueryTable } from '@/lib/bigquery'

interface DiscoverResponse extends BigQueryDiscoveryResult {
  summary: {
    totalDatasets: number
    totalTables: number
    totalViews: number
    datasetNames: string[]
  }
}

interface DatasetDetailResponse {
  datasetId: string
  projectId: string
  tables: BigQueryTable[]
  summary: {
    totalTables: number
    totalViews: number
    tableNames: string[]
  }
}

interface TableSchemaResponse {
  datasetId: string
  tableId: string
  projectId: string
  schema: Array<{
    name: string
    type: string
    mode: string
    description?: string
  }>
  sampleData?: Record<string, unknown>[]
}

/**
 * GET /api/bigquery/discover
 *
 * Discover all datasets and tables in the BigQuery project.
 * Use this to understand what data is available before writing queries.
 *
 * Query Parameters:
 * - dataset: (optional) Get details for a specific dataset
 * - table: (optional) Get schema for a specific table (requires dataset)
 * - sample: (optional) Include sample data rows (default: false)
 * - limit: (optional) Sample data row limit (default: 5)
 *
 * Examples:
 * - GET /api/bigquery/discover - List all datasets and tables
 * - GET /api/bigquery/discover?dataset=rtx_data - List tables in rtx_data dataset
 * - GET /api/bigquery/discover?dataset=rtx_data&table=accounts - Get accounts table schema
 * - GET /api/bigquery/discover?dataset=rtx_data&table=accounts&sample=true - Include sample rows
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const datasetId = searchParams.get('dataset')
  const tableId = searchParams.get('table')
  const includeSample = searchParams.get('sample') === 'true'
  const sampleLimit = parseInt(searchParams.get('limit') || '5', 10)

  try {
    // If table is specified, return table schema
    if (datasetId && tableId) {
      const schema = await bigQueryClient.getTableSchema(datasetId, tableId)

      const response: TableSchemaResponse = {
        datasetId,
        tableId,
        projectId: bigQueryClient.getProjectId() || '',
        schema: schema.map((col) => ({
          name: col.name,
          type: col.type,
          mode: col.mode,
          description: col.description,
        })),
      }

      // Include sample data if requested
      if (includeSample) {
        try {
          response.sampleData = await bigQueryClient.sampleTable(
            datasetId,
            tableId,
            Math.min(sampleLimit, 10) // Cap at 10 rows
          )
        } catch (error) {
          // Sample data is optional, don't fail if it errors
          console.warn(
            `[BigQuery] Could not fetch sample data for ${datasetId}.${tableId}:`,
            error instanceof Error ? error.message : error
          )
        }
      }

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        },
      })
    }

    // If dataset is specified, return dataset details with tables
    if (datasetId) {
      const tables = await bigQueryClient.listTables(datasetId)

      const tableCount = tables.filter((t) => t.type === 'TABLE').length
      const viewCount = tables.filter((t) => t.type === 'VIEW' || t.type === 'MATERIALIZED_VIEW').length

      const response: DatasetDetailResponse = {
        datasetId,
        projectId: bigQueryClient.getProjectId() || '',
        tables,
        summary: {
          totalTables: tableCount,
          totalViews: viewCount,
          tableNames: tables.map((t) => t.name),
        },
      }

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      })
    }

    // Otherwise, return full discovery
    const discovery = await bigQueryClient.discover()

    // Calculate summary
    const totalTables = discovery.datasets.reduce(
      (sum, ds) => sum + (ds.tables?.filter((t) => t.type === 'TABLE').length || 0),
      0
    )
    const totalViews = discovery.datasets.reduce(
      (sum, ds) =>
        sum +
        (ds.tables?.filter((t) => t.type === 'VIEW' || t.type === 'MATERIALIZED_VIEW').length || 0),
      0
    )

    const response: DiscoverResponse = {
      ...discovery,
      summary: {
        totalDatasets: discovery.datasets.length,
        totalTables,
        totalViews,
        datasetNames: discovery.datasets.map((ds) => ds.id),
      },
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Discovery failed'

    return NextResponse.json(
      {
        error: errorMessage,
        projectId: bigQueryClient.getProjectId(),
        environment: bigQueryClient.getEnvironment(),
        timestamp: new Date().toISOString(),
        help: [
          'Make sure you have authenticated:',
          '  gcloud auth application-default login',
          '',
          'Make sure you have access to the project:',
          `  gcloud projects get-iam-policy ${bigQueryClient.getProjectId()}`,
          '',
          'Required roles:',
          '  - roles/bigquery.dataViewer (to query data)',
          '  - roles/bigquery.metadataViewer (to list datasets/tables)',
        ],
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
