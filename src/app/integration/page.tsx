"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Database, Cloud, ArrowRight, Check, Clock, AlertTriangle,
  FileSpreadsheet, Zap, Server, Layers, RefreshCw, Lock,
  ExternalLink, ChevronDown, ChevronRight
} from 'lucide-react'

// Data source definitions
const DATA_SOURCES = [
  {
    id: 'rtx',
    name: 'RTX Data Hub',
    description: 'Enterprise data warehouse - primary source for production data',
    status: 'pending_access' as const,
    statusLabel: 'Access Pending',
    priority: 'critical',
    dataTypes: ['Accounts', 'Invoices', 'Service Events', 'Revenue', 'AR Aging'],
    refreshFrequency: 'Daily',
    estimatedRecords: '2.5M+',
    owner: 'Enterprise Data Team',
    notes: 'Access request submitted. ETL pipelines ready to deploy once approved.'
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM system for opportunities, leads, and customer relationships',
    status: 'ready' as const,
    statusLabel: 'Ready to Connect',
    priority: 'high',
    dataTypes: ['Leads', 'Opportunities', 'Accounts', 'Contacts', 'Activities'],
    refreshFrequency: 'Real-time webhooks',
    estimatedRecords: '500K+',
    owner: 'Sales Operations',
    notes: 'API credentials configured. Field mappings documented.'
  },
  {
    id: 'service_track',
    name: 'Service Track',
    description: 'Field service management system for routes and technician data',
    status: 'planned' as const,
    statusLabel: 'Planned',
    priority: 'high',
    dataTypes: ['Routes', 'Service Tickets', 'Technician Schedules', 'Callbacks'],
    refreshFrequency: 'Hourly',
    estimatedRecords: '1M+',
    owner: 'Operations Technology',
    notes: 'Integration scheduled for Phase 2.'
  },
  {
    id: 'winning_formula',
    name: 'Winning Formula',
    description: 'Marketing automation platform for campaign leads',
    status: 'planned' as const,
    statusLabel: 'Planned',
    priority: 'medium',
    dataTypes: ['Marketing Leads', 'Campaign Attribution', 'Lead Scores'],
    refreshFrequency: 'Daily',
    estimatedRecords: '100K+',
    owner: 'Marketing Technology',
    notes: 'API documentation received. Awaiting prioritization.'
  },
  {
    id: 'branch_sheets',
    name: 'Branch Google Sheets',
    description: 'Branch-level tracking spreadsheets for local metrics',
    status: 'active' as const,
    statusLabel: 'Active',
    priority: 'medium',
    dataTypes: ['Daily Sales Cadence', 'WIG Scorecards', 'New Start Logs'],
    refreshFrequency: 'On-demand',
    estimatedRecords: '50K+',
    owner: 'Branch Managers',
    notes: 'Currently imported via CSV. Apps Script integration planned.'
  },
  {
    id: 'simulation',
    name: 'Simulation Mode',
    description: 'Synthetic demo data for development and demonstrations',
    status: 'active' as const,
    statusLabel: 'Active (Current)',
    priority: 'demo',
    dataTypes: ['All entity types', 'Deterministic seeding', 'Realistic distributions'],
    refreshFrequency: 'On refresh',
    estimatedRecords: '10K+',
    owner: 'BI Development',
    notes: 'Default mode. Mirrors production schema for seamless transition.'
  }
]

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/accounts', description: 'List accounts with filtering', status: 'ready' },
  { method: 'GET', path: '/api/accounts/:id', description: 'Account details with related data', status: 'ready' },
  { method: 'GET', path: '/api/opportunities', description: 'Pipeline opportunities', status: 'ready' },
  { method: 'GET', path: '/api/invoices', description: 'AR aging and invoice data', status: 'ready' },
  { method: 'GET', path: '/api/leads', description: 'Lead Service Engine data', status: 'ready' },
  { method: 'GET', path: '/api/kpis/:slug', description: 'KPI values and trends', status: 'ready' },
  { method: 'POST', path: '/api/sync/rtx', description: 'Trigger RTX data sync', status: 'pending' },
  { method: 'POST', path: '/api/sync/salesforce', description: 'Trigger Salesforce sync', status: 'pending' },
]

const INTEGRATION_PHASES = [
  {
    phase: 1,
    name: 'Foundation',
    status: 'complete',
    items: [
      'Service abstraction layer implemented',
      'Mock data provider with realistic generation',
      'API route structure defined',
      'Type definitions for all entities'
    ]
  },
  {
    phase: 2,
    name: 'RTX Integration',
    status: 'in_progress',
    items: [
      'RTX Data Hub access requested',
      'ETL pipeline architecture designed',
      'Field mappings documented',
      'Connection pooling configured'
    ]
  },
  {
    phase: 3,
    name: 'Multi-Source',
    status: 'planned',
    items: [
      'Salesforce real-time webhooks',
      'Service Track hourly sync',
      'Winning Formula daily import',
      'Data reconciliation logic'
    ]
  },
  {
    phase: 4,
    name: 'Production',
    status: 'planned',
    items: [
      'Data quality monitoring',
      'Automated anomaly detection',
      'Self-service data source toggle',
      'Full audit trail'
    ]
  }
]

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active': return 'success'
    case 'ready': return 'default'
    case 'pending_access': return 'warning'
    case 'planned': return 'secondary'
    default: return 'default'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active': return <Check className="h-4 w-4" />
    case 'ready': return <Zap className="h-4 w-4" />
    case 'pending_access': return <Clock className="h-4 w-4" />
    case 'planned': return <Clock className="h-4 w-4" />
    default: return null
  }
}

export default function IntegrationRoadmapPage() {
  const [expandedSource, setExpandedSource] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Database className="h-7 w-7 text-rentokil-red" />
            Integration Roadmap
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Data source connectivity and production migration path
          </p>
        </div>
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          Simulation Mode Active
        </Badge>
      </div>

      {/* Current State Alert */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Cloud className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Integration Ready Architecture</strong> — This dashboard is built with a service abstraction layer
          that allows seamless switching between simulation data and production sources. Once RTX access is approved,
          production data can be enabled with a single configuration change.
        </AlertDescription>
      </Alert>

      {/* Architecture Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            Data Architecture
          </CardTitle>
          <CardDescription>
            How data flows from source systems to the BI dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            {/* Source Systems Row */}
            <div className="flex flex-wrap justify-center gap-4">
              {['RTX Data Hub', 'Salesforce', 'Service Track', 'Winning Formula', 'Branch Sheets'].map((source) => (
                <div key={source} className="flex flex-col items-center gap-1">
                  <div className="w-28 h-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    {source}
                  </div>
                </div>
              ))}
            </div>

            {/* Arrow Down */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />
              <span className="text-xs text-gray-500">ETL / API</span>
            </div>

            {/* Service Layer */}
            <div className="w-full max-w-md">
              <div className="rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                <Server className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="font-semibold text-blue-800 dark:text-blue-200">Service Abstraction Layer</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Unified API • Data Validation • Caching
                </div>
              </div>
            </div>

            {/* Arrow Down */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />
              <span className="text-xs text-gray-500">Typed Responses</span>
            </div>

            {/* BI Dashboard */}
            <div className="w-full max-w-lg">
              <div className="rounded-lg border-2 border-rentokil-red bg-red-50 dark:bg-red-900/20 p-4 text-center">
                <div className="font-semibold text-rentokil-red">BI Leadership Dashboard</div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  KPIs • Command Center • Lead Engine • Governance
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>
                Status of all data source integrations
              </CardDescription>
            </div>
            <Link href="/settings/data-sources">
              <Button variant="outline" size="sm">
                Configure Sources <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DATA_SOURCES.map((source) => (
              <div
                key={source.id}
                className={`rounded-lg border transition-all ${
                  source.status === 'active'
                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                    : source.status === 'pending_access'
                    ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSource === source.id ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {source.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {source.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusBadgeVariant(source.status)} className="gap-1">
                        {getStatusIcon(source.status)}
                        {source.statusLabel}
                      </Badge>
                    </div>
                  </div>
                </button>

                {expandedSource === source.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800 mt-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Data Types</div>
                        <div className="mt-1 text-sm">
                          {source.dataTypes.slice(0, 3).join(', ')}
                          {source.dataTypes.length > 3 && ` +${source.dataTypes.length - 3} more`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Refresh</div>
                        <div className="mt-1 text-sm">{source.refreshFrequency}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Est. Records</div>
                        <div className="mt-1 text-sm">{source.estimatedRecords}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Owner</div>
                        <div className="mt-1 text-sm">{source.owner}</div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-600 dark:text-gray-400">
                      <strong>Notes:</strong> {source.notes}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Phases */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Phases</CardTitle>
          <CardDescription>
            Roadmap from simulation to production data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {INTEGRATION_PHASES.map((phase) => (
              <div
                key={phase.phase}
                className={`rounded-lg border p-4 ${
                  phase.status === 'complete'
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : phase.status === 'in_progress'
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">Phase {phase.phase}</div>
                  <Badge
                    variant={
                      phase.status === 'complete' ? 'success' :
                      phase.status === 'in_progress' ? 'default' : 'secondary'
                    }
                  >
                    {phase.status === 'complete' ? 'Complete' :
                     phase.status === 'in_progress' ? 'In Progress' : 'Planned'}
                  </Badge>
                </div>
                <div className="text-sm font-medium mb-2">{phase.name}</div>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {phase.status === 'complete' ? (
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 shrink-0 mt-0.5" />
                      )}
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            API Endpoints
          </CardTitle>
          <CardDescription>
            Available endpoints for data access (ready for production switching)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Method</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {API_ENDPOINTS.map((endpoint) => (
                <TableRow key={endpoint.path}>
                  <TableCell>
                    <Badge variant={endpoint.method === 'GET' ? 'default' : 'warning'}>
                      {endpoint.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{endpoint.path}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {endpoint.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={endpoint.status === 'ready' ? 'success' : 'secondary'}>
                      {endpoint.status === 'ready' ? 'Ready' : 'Pending'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* What's Different Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-purple-500" />
            What Changes with Production Data?
          </CardTitle>
          <CardDescription>
            Comparison between simulation and production modes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aspect</TableHead>
                <TableHead>Simulation Mode (Current)</TableHead>
                <TableHead>Production Mode (RTX)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Data Source</TableCell>
                <TableCell>Synthetic deterministic data</TableCell>
                <TableCell>RTX Data Hub + live integrations</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Refresh Rate</TableCell>
                <TableCell>On-demand (click to refresh)</TableCell>
                <TableCell>Daily automated sync + real-time for critical KPIs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Data Volume</TableCell>
                <TableCell>~10K records (representative sample)</TableCell>
                <TableCell>~2.5M+ records (full production)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Accounts</TableCell>
                <TableCell>1,500 synthetic accounts</TableCell>
                <TableCell>Full customer database</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Historical Data</TableCell>
                <TableCell>12 months simulated</TableCell>
                <TableCell>Full historical archive</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">User Actions</TableCell>
                <TableCell>Demo-only (no persistence)</TableCell>
                <TableCell>Writes back to source systems</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Alert className="border-gray-200 dark:border-gray-700">
        <Lock className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-700 dark:text-gray-300">
          <strong>Security Note:</strong> Production data access requires proper authentication and role-based
          permissions. All data transfers are encrypted and logged. Contact the Enterprise Data Team for access requests.
        </AlertDescription>
      </Alert>
    </div>
  )
}
