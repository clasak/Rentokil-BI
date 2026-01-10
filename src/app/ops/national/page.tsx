"use client"

import { useMemo } from 'react'
import Link from 'next/link'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { getServiceEvents, getTechnicianCapacity } from '@/lib/data'
import { getActiveBusinessUnits } from '@/lib/business-units'
import { ViewToggle } from '@/components/features/ViewToggle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Tooltip as RechartsTooltip, Legend
} from 'recharts'
import {
  Truck, Users, Clock, AlertTriangle, CheckCircle, Calendar,
  Activity, MapPin, ArrowRight, ChevronRight, Wrench, PhoneCall
} from 'lucide-react'

export default function NationalOpsPage() {
  const kpiValues = useMemo(() => calculateKPIValues(), [])
  const serviceEvents = useMemo(() => getServiceEvents(), [])
  const technicianCapacity = useMemo(() => getTechnicianCapacity(), [])
  const businessUnits = useMemo(() => getActiveBusinessUnits(), [])

  // Calculate key metrics
  const serviceRiskIndex = kpiValues.get('service_risk_index')
  const schedulingPressure = kpiValues.get('scheduling_pressure')

  // Service event stats
  const completedEvents = serviceEvents.filter(e => e.status === 'completed').length
  const pendingEvents = serviceEvents.filter(e => e.status === 'scheduled').length
  const callbackEvents = serviceEvents.filter(e => e.status === 'callback').length
  const callbackRate = serviceEvents.length > 0
    ? ((callbackEvents / serviceEvents.length) * 100).toFixed(1)
    : '0'

  // Regional ops breakdown (simulated)
  const regionalOpsData = businessUnits.map(bu => ({
    name: bu.shortName,
    color: bu.color,
    technicians: Math.round(bu.metrics.technicians),
    utilization: Math.round(70 + Math.random() * 20), // 70-90%
    callbackRate: (2 + Math.random() * 4).toFixed(1), // 2-6%
    avgTimeOnSite: Math.round(35 + Math.random() * 20), // 35-55 min
    completionRate: Math.round(92 + Math.random() * 6) // 92-98%
  }))

  // Weekly trend data (simulated)
  const weeklyTrend = [
    { day: 'Mon', completed: 1250, callbacks: 45, utilization: 82 },
    { day: 'Tue', completed: 1380, callbacks: 52, utilization: 85 },
    { day: 'Wed', completed: 1420, callbacks: 48, utilization: 88 },
    { day: 'Thu', completed: 1350, callbacks: 55, utilization: 84 },
    { day: 'Fri', completed: 1280, callbacks: 42, utilization: 80 },
    { day: 'Sat', completed: 680, callbacks: 22, utilization: 65 },
    { day: 'Sun', completed: 120, callbacks: 5, utilization: 25 }
  ]

  // Technician capacity by region
  const capacityByRegion = regionalOpsData.map(r => ({
    name: r.name,
    available: r.technicians,
    utilized: Math.round(r.technicians * (r.utilization / 100))
  }))

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Truck className="h-7 w-7 text-green-600" />
            National Operations View
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Service delivery metrics and technician efficiency across all regions
          </p>
        </div>
        <ViewToggle variant="dropdown" />
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 opacity-80" />
              <div>
                <div className="text-sm opacity-80">Completed Today</div>
                <div className="text-2xl font-bold">{completedEvents.toLocaleString()}</div>
                <div className="text-xs opacity-70">service events</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 opacity-80" />
              <div>
                <div className="text-sm opacity-80">Scheduled</div>
                <div className="text-2xl font-bold">{pendingEvents.toLocaleString()}</div>
                <div className="text-xs opacity-70">upcoming events</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={serviceRiskIndex && serviceRiskIndex.value > 50 ? 'border-red-300 dark:border-red-700' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Service Risk Index</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {serviceRiskIndex?.value?.toFixed(0) ?? '--'}
                </div>
                <div className="text-xs text-gray-500">
                  {serviceRiskIndex && serviceRiskIndex.value > 50 ? 'Above threshold' : 'Healthy'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={Number(callbackRate) > 5 ? 'border-yellow-300 dark:border-yellow-700' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <PhoneCall className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Callback Rate</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {callbackRate}%
                </div>
                <div className="text-xs text-gray-500">{callbackEvents} callbacks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Service Trend</CardTitle>
            <CardDescription>Completed services and callbacks this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="completed"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Completed"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="callbacks"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Callbacks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Technician Capacity by Region */}
        <Card>
          <CardHeader>
            <CardTitle>Technician Utilization by Region</CardTitle>
            <CardDescription>Available vs. utilized technician capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityByRegion} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Bar dataKey="available" fill="#94a3b8" name="Total Capacity" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="utilized" fill="#22c55e" name="Utilized" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Regional Operations Performance</CardTitle>
              <CardDescription>Key metrics by business unit</CardDescription>
            </div>
            <Link href="/ops">
              <Button variant="outline" size="sm">
                Detailed View <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead className="text-center">Technicians</TableHead>
                <TableHead className="text-center">Utilization</TableHead>
                <TableHead className="text-center">Callback Rate</TableHead>
                <TableHead className="text-center">Avg Time on Site</TableHead>
                <TableHead className="text-center">Completion Rate</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionalOpsData.map(region => (
                <TableRow key={region.name}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: region.color }}
                      />
                      <span className="font-medium">{region.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      {region.technicians.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={region.utilization >= 85 ? 'success' : region.utilization >= 75 ? 'warning' : 'secondary'}>
                      {region.utilization}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={Number(region.callbackRate) > 4 ? 'text-red-600 font-medium' : ''}>
                      {region.callbackRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {region.avgTimeOnSite} min
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={region.completionRate >= 95 ? 'success' : 'warning'}>
                      {region.completionRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/ops">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Truck className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="font-medium">Ops Dashboard</div>
              <div className="text-sm text-gray-500">Detailed view</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/lead-service-engine">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="font-medium">Service Engine</div>
              <div className="text-sm text-gray-500">Lead to service</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/manager/wig-scorecard">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Wrench className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="font-medium">WIG Scorecard</div>
              <div className="text-sm text-gray-500">Team metrics</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/governance/data-quality">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <div className="font-medium">Data Quality</div>
              <div className="text-sm text-gray-500">Monitor health</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
