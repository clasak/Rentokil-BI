'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import {
  ArrowLeft,
  Download,
  FileText,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Code,
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { DataQualityScorecardDimension } from '@/lib/bigquery/queries/data-quality'
import { useState } from 'react'

interface AffectedRecord {
  id: string
  issue_type: string
  field_name?: string
  current_value?: string
  expected_value?: string
  created_date?: string
  [key: string]: any
}

const dimensionInfo: Record<
  string,
  {
    description: string
    whatItMeasures: string
    target: number
    remediation: string[]
  }
> = {
  Accuracy: {
    description: 'Data correctly represents the real-world entity it describes',
    whatItMeasures: 'Cross-system record matching and name validation',
    target: 95,
    remediation: [
      'Review account name standardization rules',
      'Implement cross-system validation',
      'Add data quality checks in ETL pipeline',
      'Create master data management process',
    ],
  },
  Completeness: {
    description: 'All required data fields are populated',
    whatItMeasures: 'Percentage of required fields with non-null values',
    target: 90,
    remediation: [
      'Add field validation to lead capture forms',
      'Require minimum contact information',
      'Implement progressive data enrichment',
      'Enable auto-fill suggestions',
    ],
  },
  Consistency: {
    description: 'Data values are consistent across different systems',
    whatItMeasures: 'Date format standardization and field naming consistency',
    target: 90,
    remediation: [
      'Standardize date formats to ISO 8601',
      'Create data format guidelines',
      'Implement field mapping transformations',
      'Add consistency checks in sync process',
    ],
  },
  Timeliness: {
    description: 'Data is available within expected time frames',
    whatItMeasures: 'Data freshness compared to SLA thresholds',
    target: 95,
    remediation: [
      'Review ETL pipeline scheduling',
      'Optimize sync frequency',
      'Add real-time data streaming',
      'Monitor data pipeline latency',
    ],
  },
  Validity: {
    description: 'Data conforms to defined formats and business rules',
    whatItMeasures: 'Phone number and email format compliance',
    target: 85,
    remediation: [
      'Implement client-side format validation',
      'Add regex pattern validation',
      'Create data cleansing rules',
      'Provide format examples in forms',
    ],
  },
  Uniqueness: {
    description: 'No duplicate records exist in the dataset',
    whatItMeasures: 'Duplicate detection by primary key',
    target: 98,
    remediation: [
      'Implement deduplication logic in ETL',
      'Add MERGE statements instead of INSERT',
      'Create master record resolution process',
      'Enable duplicate detection in CRM',
    ],
  },
}

export default function DataQualityDimensionPage() {
  const params = useParams()
  const router = useRouter()
  const dimension = params.dimension as string
  const [showSQL, setShowSQL] = useState(false)

  // Fetch dimension score
  const {
    data: dimensions,
    isLoading: isLoadingScore,
    dataSource,
    responseTime,
  } = useBigQueryData<DataQualityScorecardDimension[], DataQualityScorecardDimension[]>({
    queryName: 'data-quality-scorecard-dimensions',
    defaultData: [],
    transformBigQueryData: (data) => data,
  })

  // Fetch affected records
  const {
    data: affectedRecords,
    isLoading: isLoadingRecords,
    error: recordsError,
    refetch: refetchRecords,
  } = useBigQueryData<AffectedRecord[], AffectedRecord[]>({
    queryName: 'data-quality-details',
    filters: { dimension },
    defaultData: [],
    transformBigQueryData: (data) => data,
  })

  const dimensionData = dimensions.find((d) => d.dimension === dimension)
  const info = dimensionInfo[dimension]

  const isLoading = isLoadingScore || isLoadingRecords

  // Export to CSV
  const handleExportCSV = () => {
    if (affectedRecords.length === 0) return

    // Get headers from first record
    const headers = Object.keys(affectedRecords[0])
    const csvHeaders = headers.join(',')

    // Convert records to CSV rows
    const csvRows = affectedRecords.map((record) =>
      headers.map((header) => {
        const value = record[header]
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? '')
        return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
      }).join(',')
    )

    const csv = [csvHeaders, ...csvRows].join('\n')

    // Download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-quality-${dimension.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Sample SQL query (would come from the actual query module in production)
  const sampleSQL = `-- Data Quality Check: ${dimension}
-- This query identifies records that fail ${dimension.toLowerCase()} validation

SELECT
  id,
  issue_type,
  field_name,
  current_value,
  created_date
FROM \`bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Snp\`
WHERE
  -- Add specific ${dimension.toLowerCase()} validation logic here
  created_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
LIMIT 100`

  if (!info) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Dimension Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The dimension &quot;{dimension}&quot; does not exist.
              </p>
              <Button onClick={() => router.push('/governance/data-quality')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Data Quality
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/governance/data-quality')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{dimension} Details</h1>
            <p className="text-gray-600 dark:text-gray-400">{info.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button onClick={handleExportCSV} disabled={affectedRecords.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Score Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Score</CardTitle>
        </CardHeader>
        <CardContent>
          {dimensionData ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Score</div>
                <div className="text-3xl font-bold">{dimensionData.currentScore}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Target</div>
                <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">
                  {dimensionData.target}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</div>
                <Badge
                  variant={dimensionData.currentScore >= dimensionData.target ? 'default' : 'destructive'}
                  className={
                    dimensionData.currentScore >= dimensionData.target
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : ''
                  }
                >
                  {dimensionData.currentScore >= dimensionData.target ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Target Met
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Below Target
                    </>
                  )}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Affected Records</div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {dimensionData.affectedRecords.toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading score...
            </div>
          )}
        </CardContent>
      </Card>

      {/* What It Measures */}
      <Card>
        <CardHeader>
          <CardTitle>What This Dimension Measures</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">{info.whatItMeasures}</p>
        </CardContent>
      </Card>

      {/* Affected Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Affected Records ({affectedRecords.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetchRecords()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading affected records...
            </div>
          ) : recordsError ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Unable to load affected records</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-300">
                {recordsError || 'An error occurred while fetching records'}
              </p>
            </div>
          ) : affectedRecords.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Checks Passed!</h3>
              <p className="text-gray-600 dark:text-gray-400">
                No records found with {dimension.toLowerCase()} issues.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {Object.keys(affectedRecords[0]).slice(0, 6).map((key) => (
                      <th
                        key={key}
                        className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {affectedRecords.slice(0, 50).map((record, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {Object.values(record).slice(0, 6).map((value, cellIdx) => (
                        <td key={cellIdx} className="p-3 text-sm text-gray-600 dark:text-gray-400">
                          {String(value ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {affectedRecords.length > 50 && (
                <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                  Showing 50 of {affectedRecords.length.toLocaleString()} records. Export to CSV to view all.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remediation Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Remediation Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {info.remediation.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {idx + 1}
                </div>
                <p className="text-gray-700 dark:text-gray-300 pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SQL Query */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              SQL Query
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowSQL(!showSQL)}>
              {showSQL ? 'Hide' : 'Show'} Query
            </Button>
          </div>
        </CardHeader>
        {showSQL && (
          <CardContent>
            <pre className="p-4 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg overflow-x-auto text-sm">
              {sampleSQL}
            </pre>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Copy this query to BigQuery Console to reproduce results or investigate further.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
