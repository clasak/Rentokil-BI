"use client"

import { useState } from 'react'
import Link from 'next/link'
import { STAGE_ORDER, STAGE_CONFIG, AUTOMATION_RULES, StageDefinition } from '@/lib/lead-engine-data'
import { StageDefinitionCard } from '@/components/lead-engine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  ArrowLeft, Workflow, Info, Clock, AlertTriangle, Zap, Settings,
  CheckCircle, XCircle
} from 'lucide-react'

export default function StagesPage() {
  const [expandAll, setExpandAll] = useState(false)

  const stages = STAGE_ORDER.map(stageId => STAGE_CONFIG[stageId])

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Workflow className="h-7 w-7 text-blue-500" />
            Stage Definitions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Process stages, ownership, criteria, and SLA thresholds
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setExpandAll(!expandAll)}
        >
          {expandAll ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {/* Info Banner */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Data Standards Framework</strong> — These stage definitions establish the &ldquo;level of detail&rdquo;
          required at each step of the lead-to-service pipeline. Entry/exit criteria ensure data quality
          and process compliance.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="stages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stages" className="gap-2">
            <Workflow className="h-4 w-4" />
            Stage Definitions
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Zap className="h-4 w-4" />
            Automation Rules
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-2">
            <Clock className="h-4 w-4" />
            SLA Summary
          </TabsTrigger>
        </TabsList>

        {/* Stage Definitions Tab */}
        <TabsContent value="stages" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {stages.map(stage => (
              <StageDefinitionCard
                key={stage.id}
                definition={stage}
                defaultExpanded={expandAll}
              />
            ))}
          </div>
        </TabsContent>

        {/* Automation Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Automation Rules Engine
              </CardTitle>
              <CardDescription>
                Planned automation triggers for proactive pipeline management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                <Settings className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  These rules are planned for implementation. Once active, they will automatically
                  monitor the pipeline and trigger alerts/actions based on defined conditions.
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Rule ID</TableHead>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AUTOMATION_RULES.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono text-sm">{rule.id}</TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {rule.trigger}
                      </TableCell>
                      <TableCell className="text-sm">
                        <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                          {rule.condition}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {rule.action}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.status === 'active' ? 'success' : 'outline'}>
                          {rule.status === 'active' ? 'Active' : 'Planned'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Example Rule Flow */}
          <Card>
            <CardHeader>
              <CardTitle>Rule Execution Example</CardTitle>
              <CardDescription>How the handoff SLA alert rule would work</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 overflow-x-auto pb-4">
                <div className="flex-shrink-0 p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-center min-w-[150px]">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-sm font-medium">Trigger</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Lead enters Sales Handoff
                  </div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-shrink-0 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-center min-w-[150px]">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                  <div className="text-sm font-medium">Monitor</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Track time in stage
                  </div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-shrink-0 p-4 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-center min-w-[150px]">
                  <XCircle className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <div className="text-sm font-medium">Condition</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Time {'>'} 18 hours
                  </div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-shrink-0 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-center min-w-[150px]">
                  <Zap className="h-6 w-6 mx-auto mb-2 text-red-600" />
                  <div className="text-sm font-medium">Action</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Alert Sales Manager
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Summary Tab */}
        <TabsContent value="sla" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                SLA Thresholds Summary
              </CardTitle>
              <CardDescription>
                Time thresholds for each stage. These values are configurable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Target
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        At-Risk
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Critical
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map(stage => {
                    const formatTime = (hours: number) => {
                      if (hours >= 24) {
                        const days = hours / 24
                        return `${days}d`
                      }
                      return `${hours}h`
                    }

                    return (
                      <TableRow
                        key={stage.id}
                        className={stage.isHandoffStage ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}
                      >
                        <TableCell className="font-medium">{stage.name}</TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {stage.owner}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 border-green-300">
                            {formatTime(stage.targetHours)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300">
                            {formatTime(stage.atRiskThresholdHours)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 border-red-300">
                            {formatTime(stage.criticalThresholdHours)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {stage.isHandoffStage ? (
                            <Badge variant="warning">Handoff</Badge>
                          ) : (
                            <Badge variant="outline">Process</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium mb-2">SLA Configuration Notes</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <strong>Target:</strong> Expected time to complete stage under normal conditions</li>
                  <li>• <strong>At-Risk:</strong> Warning threshold - lead is approaching SLA breach</li>
                  <li>• <strong>Critical:</strong> SLA breach - immediate action required</li>
                  <li>• Handoff stages have tighter SLAs (24h) due to manual email bottlenecks</li>
                  <li>• All thresholds are configurable in the system configuration</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
