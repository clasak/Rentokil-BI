"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getHandoffLeads,
  getHandoffMetrics,
  HandoffMetrics,
  Lead,
  STAGE_CONFIG
} from '@/lib/lead-engine-data'
import { HandoffCard, StageBadge, LeadTable } from '@/components/lead-engine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Mail, AlertTriangle, Clock, ArrowLeft, TrendingUp, TrendingDown, CheckCircle,
  FileText, User
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine
} from 'recharts'

export default function HandoffsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [handoffMetrics, setHandoffMetrics] = useState<HandoffMetrics[]>([])
  const [bdToSalesLeads, setBdToSalesLeads] = useState<Lead[]>([])
  const [salesToOpsLeads, setSalesToOpsLeads] = useState<Lead[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setHandoffMetrics(getHandoffMetrics())
      setBdToSalesLeads(getHandoffLeads('bd_to_sales'))
      setSalesToOpsLeads(getHandoffLeads('sales_to_ops'))
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  const bdMetrics = handoffMetrics.find(m => m.type === 'bd_to_sales')
  const opsMetrics = handoffMetrics.find(m => m.type === 'sales_to_ops')

  const hasDelays = (bdMetrics?.delayedCount || 0) > 0 || (opsMetrics?.delayedCount || 0) > 0

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
            <Mail className="h-7 w-7 text-orange-500" />
            Handoff Monitoring
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track manual email handoff bottlenecks between BD→Sales and Sales→Ops
          </p>
        </div>
      </div>

      {/* Critical Alert */}
      {hasDelays && (
        <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>Handoff delays detected!</strong> {bdMetrics?.delayedCount || 0} leads delayed at BD→Sales,{' '}
            {opsMetrics?.delayedCount || 0} at Sales→Ops. These manual email handoffs are key automation opportunities.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {(bdMetrics?.pending || 0) + (opsMetrics?.pending || 0)}
            </div>
            <div className="text-sm text-gray-500">Total Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {(bdMetrics?.delayedCount || 0) + (opsMetrics?.delayedCount || 0)}
            </div>
            <div className="text-sm text-gray-500">Delayed ({'>'}24h)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">
              {Math.round(((bdMetrics?.avgWaitHours || 0) + (opsMetrics?.avgWaitHours || 0)) / 2)}h
            </div>
            <div className="text-sm text-gray-500">Avg Wait Time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className={`text-3xl font-bold ${
              Math.min(bdMetrics?.slaCompliance || 100, opsMetrics?.slaCompliance || 100) >= 90
                ? 'text-green-600'
                : Math.min(bdMetrics?.slaCompliance || 100, opsMetrics?.slaCompliance || 100) >= 70
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}>
              {Math.round(((bdMetrics?.slaCompliance ?? 100) + (opsMetrics?.slaCompliance ?? 100)) / 2)}%
            </div>
            <div className="text-sm text-gray-500">Avg SLA Compliance</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed View for Each Handoff */}
      <Tabs defaultValue="bd_to_sales" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bd_to_sales" className="gap-2">
            BD → Sales
            {(bdMetrics?.delayedCount || 0) > 0 && (
              <Badge variant="danger" className="ml-1">{bdMetrics?.delayedCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sales_to_ops" className="gap-2">
            Sales → Ops
            {(opsMetrics?.delayedCount || 0) > 0 && (
              <Badge variant="danger" className="ml-1">{opsMetrics?.delayedCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* BD → Sales Tab */}
        <TabsContent value="bd_to_sales" className="space-y-6">
          {bdMetrics && <HandoffCard metrics={bdMetrics} />}

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Wait Time Trend (14 Days)</CardTitle>
              <CardDescription>Average handoff wait time with 24-hour SLA target</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bdMetrics?.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${v}h`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border text-sm">
                              <div className="font-medium">{payload[0].payload.day}</div>
                              <div className="text-orange-600">{payload[0].value} hours</div>
                              <div className="text-gray-500">{payload[0].payload.count} leads</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <ReferenceLine y={24} stroke="#9ca3af" strokeDasharray="5 5" label="SLA" />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#f97316"
                      fill="#fed7aa"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pending Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pending BD → Sales Handoffs</CardTitle>
              <CardDescription>
                {bdToSalesLeads.length} leads waiting for AE assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>BD Rep</TableHead>
                    <TableHead>Assigned AE</TableHead>
                    <TableHead className="text-right">Wait Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bdToSalesLeads.map(lead => (
                    <TableRow
                      key={lead.id}
                      className={
                        lead.healthStatus === 'critical' ? 'bg-red-50 dark:bg-red-900/10' :
                        lead.healthStatus === 'at_risk' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      }
                    >
                      <TableCell className="font-mono text-sm">{lead.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{lead.companyName}</div>
                        <div className="text-xs text-gray-500">{lead.contactName}</div>
                      </TableCell>
                      <TableCell>{lead.assignedBD || '-'}</TableCell>
                      <TableCell>{lead.assignedAE || <span className="text-gray-400">Unassigned</span>}</TableCell>
                      <TableCell className="text-right">
                        <span className={
                          lead.hoursInStage > 24 ? 'text-red-600 font-medium' :
                          lead.hoursInStage > 18 ? 'text-yellow-600 font-medium' : ''
                        }>
                          {Math.round(lead.hoursInStage)}h
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          lead.handoffStatus === 'delayed' ? 'danger' :
                          lead.handoffStatus === 'pending' ? 'warning' : 'success'
                        }>
                          {lead.handoffStatus || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StageBadge status={lead.healthStatus} size="sm" showLabel={false} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales → Ops Tab */}
        <TabsContent value="sales_to_ops" className="space-y-6">
          {opsMetrics && <HandoffCard metrics={opsMetrics} />}

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Wait Time Trend (14 Days)</CardTitle>
              <CardDescription>Average handoff wait time with 24-hour SLA target</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={opsMetrics?.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${v}h`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border text-sm">
                              <div className="font-medium">{payload[0].payload.day}</div>
                              <div className="text-orange-600">{payload[0].value} hours</div>
                              <div className="text-gray-500">{payload[0].payload.count} leads</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <ReferenceLine y={24} stroke="#9ca3af" strokeDasharray="5 5" label="SLA" />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#f97316"
                      fill="#fed7aa"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pending Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Sales → Ops Handoffs</CardTitle>
              <CardDescription>
                {salesToOpsLeads.length} won deals waiting for operations handoff
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>AE</TableHead>
                    <TableHead>Start Packet</TableHead>
                    <TableHead className="text-right">Wait Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesToOpsLeads.map(lead => (
                    <TableRow
                      key={lead.id}
                      className={
                        lead.healthStatus === 'critical' ? 'bg-red-50 dark:bg-red-900/10' :
                        lead.healthStatus === 'at_risk' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      }
                    >
                      <TableCell className="font-mono text-sm">{lead.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{lead.companyName}</div>
                        <div className="text-xs text-gray-500">{lead.contactName}</div>
                      </TableCell>
                      <TableCell>{lead.assignedAE || '-'}</TableCell>
                      <TableCell>
                        {lead.startPacketComplete ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Incomplete
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          lead.hoursInStage > 24 ? 'text-red-600 font-medium' :
                          lead.hoursInStage > 18 ? 'text-yellow-600 font-medium' : ''
                        }>
                          {Math.round(lead.hoursInStage)}h
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          lead.handoffStatus === 'delayed' ? 'danger' :
                          lead.handoffStatus === 'pending' ? 'warning' : 'success'
                        }>
                          {lead.handoffStatus || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StageBadge status={lead.healthStatus} size="sm" showLabel={false} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Automation Call-to-Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Eliminate Manual Handoffs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                These email-based handoffs are prime automation targets. See the ROI calculator for potential savings.
              </p>
            </div>
            <Link href="/lead-service-engine/automation">
              <Button>
                View Automation ROI
                <TrendingUp className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
