"use client"

import Link from 'next/link'
import {
  INTEGRATION_SOURCES,
  FIELD_MAPPINGS,
  IntegrationSource
} from '@/lib/lead-engine-data'
import { DataFlowDiagram, IntegrationStatusCards } from '@/components/lead-engine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  ArrowLeft, Database, Cloud, FileText, Table2, CheckCircle, Clock,
  AlertTriangle, Loader2, ArrowRight, Info
} from 'lucide-react'

export default function IntegrationPage() {
  const activeIntegrations = INTEGRATION_SOURCES.filter(s =>
    s.status === 'active' || s.status === 'ready'
  ).length

  const pendingIntegrations = INTEGRATION_SOURCES.filter(s =>
    s.status === 'pending_access' || s.status === 'access_requested'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/lead-service-engine">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Database className="h-7 w-7 text-purple-500" />
            Data Integration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            System connections and field mappings for the Lead Service Engine
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Integration Framework Ready</strong> — The data model and field mappings are defined.
          Salesforce access is pending verification. Demo data is currently powering the dashboard.
        </AlertDescription>
      </Alert>

      {/* Integration Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {INTEGRATION_SOURCES.length}
            </div>
            <div className="text-sm text-gray-500">Planned Sources</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-700">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {activeIntegrations}
            </div>
            <div className="text-sm text-gray-500">Active/Ready</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-700">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {pendingIntegrations}
            </div>
            <div className="text-sm text-gray-500">Pending Access</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-gray-600">
              {FIELD_MAPPINGS.length}
            </div>
            <div className="text-sm text-gray-500">Field Mappings</div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Sources</CardTitle>
          <CardDescription>Status of each data source connection</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationStatusCards />
        </CardContent>
      </Card>

      {/* Data Flow Diagram */}
      <DataFlowDiagram />

      {/* Field Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle>Field Mapping Reference</CardTitle>
          <CardDescription>
            How source system fields map to Lead Service Engine data model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Source System</TableHead>
                <TableHead>Source Field</TableHead>
                <TableHead>Target Field</TableHead>
                <TableHead>Transform</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FIELD_MAPPINGS.map(mapping => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-mono text-xs">{mapping.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{mapping.sourceSystem}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-400">
                    {mapping.sourceField}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {mapping.targetField}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {mapping.transform || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      mapping.status === 'mapped' ? 'success' :
                      mapping.status === 'pending' ? 'warning' : 'outline'
                    }>
                      {mapping.status === 'mapped' ? 'Mapped' :
                       mapping.status === 'pending' ? 'Pending' : 'TBD'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
            <h4 className="font-medium mb-2">Mapping Status Legend</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="success">Mapped</Badge>
                <span className="text-gray-600 dark:text-gray-400">Field mapping verified and active</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning">Pending</Badge>
                <span className="text-gray-600 dark:text-gray-400">Mapping defined, awaiting source access</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">TBD</Badge>
                <span className="text-gray-600 dark:text-gray-400">Mapping requires additional specification</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Requirements</CardTitle>
          <CardDescription>Prerequisites for full integration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-500" />
                Salesforce Integration
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  API access credentials (pending)
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Read access to Lead, Opportunity, Account objects
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Field mapping specification complete
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Sync frequency: Real-time webhooks or 15-min polling
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                RTX Data Hub
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-500" />
                  Access request submitted
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Read access to Customer Master, Service History
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Field mapping pending source access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Sync frequency: Daily batch or on-demand
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-3">Next Steps</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Badge>1</Badge>
                <span className="font-medium">Obtain Salesforce Access</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Work with IT to provision API credentials for CRM integration
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Badge>2</Badge>
                <span className="font-medium">Validate Field Mappings</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Confirm mapping specifications match actual Salesforce schema
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Badge>3</Badge>
                <span className="font-medium">Pilot Integration</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test with subset of data before full deployment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
