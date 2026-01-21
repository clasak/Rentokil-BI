/**
 * BigQuery Schema Discovery API
 *
 * Endpoints for discovering BigQuery datasets, tables, and schemas.
 * Used to map BigQuery tables to internal application types.
 *
 * GET /api/bigquery/discover
 *   Query params:
 *     - action: 'datasets' | 'tables' | 'schema' | 'test'
 *     - dataset: dataset name (for tables/schema)
 *     - table: table name (for schema)
 *
 * Examples:
 *   GET /api/bigquery/discover?action=test
 *   GET /api/bigquery/discover?action=datasets
 *   GET /api/bigquery/discover?action=tables&dataset=rtx_data
 *   GET /api/bigquery/discover?action=schema&dataset=rtx_data&table=fact_leads
 */

import { NextRequest, NextResponse } from 'next/server'
import { bigQueryClient, isBigQueryConfigured } from '@/services/bigquery'

export async function GET(request: NextRequest) {
  // Check if BigQuery is configured
  if (!isBigQueryConfigured()) {
    return NextResponse.json(
      {
        error: 'BigQuery not configured',
        message: 'Run: gcloud auth application-default login',
        help: [
          '1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install',
          '2. Run: gcloud auth application-default login',
          '3. Set NEXT_PUBLIC_BIGQUERY_PROJECT in .env.local'
        ]
      },
      { status: 503 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action') || 'test'
  const dataset = searchParams.get('dataset')
  const table = searchParams.get('table')

  try {
    switch (action) {
      case 'test': {
        const result = await bigQueryClient.testConnection()
        return NextResponse.json({
          success: result.connected,
          ...result
        })
      }

      case 'datasets': {
        const datasets = await bigQueryClient.getDatasets()
        return NextResponse.json({
          success: true,
          datasets,
          count: datasets.length
        })
      }

      case 'tables': {
        if (!dataset) {
          return NextResponse.json(
            { error: 'Missing dataset parameter' },
            { status: 400 }
          )
        }
        const tables = await bigQueryClient.getTables(dataset)
        return NextResponse.json({
          success: true,
          dataset,
          tables,
          count: tables.length
        })
      }

      case 'schema': {
        if (!dataset || !table) {
          return NextResponse.json(
            { error: 'Missing dataset or table parameter' },
            { status: 400 }
          )
        }
        const schema = await bigQueryClient.getTableSchema(table, dataset)
        return NextResponse.json({
          success: true,
          dataset,
          table,
          schema,
          columnCount: schema.length
        })
      }

      case 'sample': {
        if (!dataset || !table) {
          return NextResponse.json(
            { error: 'Missing dataset or table parameter' },
            { status: 400 }
          )
        }
        // Validate table name to prevent SQL injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
          return NextResponse.json(
            { error: 'Invalid table name' },
            { status: 400 }
          )
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dataset)) {
          return NextResponse.json(
            { error: 'Invalid dataset name' },
            { status: 400 }
          )
        }
        const tableName = bigQueryClient.getTableName(table)
        const rows = await bigQueryClient.query(
          `SELECT * FROM ${tableName} LIMIT 5`
        )
        return NextResponse.json({
          success: true,
          dataset,
          table,
          sampleRows: rows,
          rowCount: rows.length
        })
      }

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            validActions: ['test', 'datasets', 'tables', 'schema', 'sample']
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[BigQuery Discovery Error]', error)
    return NextResponse.json(
      {
        error: 'BigQuery query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Make sure you have authenticated with: gcloud auth application-default login'
      },
      { status: 500 }
    )
  }
}
