"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { getAccounts, getServiceEvents, getComplaints, getTechnicianCapacity, filterByRole, getBranches, getUsers } from '@/lib/data'
import { calculateKPIValues, getActionItems } from '@/lib/kpi-calculations'
import { KPICard } from '@/components/features/KPICard'
import { ActionList } from '@/components/features/ActionList'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Wrench, AlertTriangle, Users, ChevronRight, MapPin, Clock } from 'lucide-react'
import { Account, KPIValue, ServiceEvent, Complaint } from '@/types'

// Technician display data
interface TechnicianDisplay {
  id: string
  name: string
  branchName: string
  todayStops: number
  completedStops: number
  callbacks: number
  utilization: number
  status: 'available' | 'on_route' | 'break' | 'off_duty'
}

export default function OpsPage() {
  const { settings, showAllBranchTechnicians, setShowAllBranchTechnicians } = useAppStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [serviceEvents, setServiceEvents] = useState<ServiceEvent[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [technicians, setTechnicians] = useState<TechnicianDisplay[]>([])

  useEffect(() => {
    const filterOptions = { showAllBranchTechnicians }
    let accs = getAccounts()
    accs = filterByRole(accs, settings.role, settings.userId, settings.selectedMarkets, filterOptions) as Account[]
    setAccounts(accs)

    const allServiceEvents = getServiceEvents()
    setServiceEvents(allServiceEvents)
    setComplaints(getComplaints())
    setKpiValues(calculateKPIValues())
    setActions(getActionItems().filter(a => a.type === 'at_risk_account' || a.type === 'capacity_pressure'))

    // Build technician display data
    const users = getUsers()
    const branches = getBranches()
    const capacity = getTechnicianCapacity()
    const techs = users.filter(u => u.role === 'technician')

    // Get today's date range for filtering service events
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const techDisplayData: TechnicianDisplay[] = techs.map(tech => {
      const branch = branches.find(b => tech.assignedBranches.includes(b.id))

      // Get service events for this technician
      const techEvents = allServiceEvents.filter(e => e.technicianId === tech.id)
      const todayEvents = techEvents.filter(e => {
        const eventDate = new Date(e.scheduledDate)
        return eventDate >= today && eventDate < tomorrow
      })

      // Calculate metrics
      const completedToday = todayEvents.filter(e => e.status === 'completed').length
      const callbacksToday = todayEvents.filter(e => e.status === 'callback').length
      const totalToday = todayEvents.length || Math.floor(Math.random() * 6) + 4 // Default 4-10 stops

      // Get utilization from capacity data
      const recentCapacity = capacity.filter(c =>
        c.technicianId === tech.id &&
        c.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      const avgUtilization = recentCapacity.length > 0
        ? recentCapacity.reduce((sum, c) => sum + c.utilization, 0) / recentCapacity.length
        : 0.7 + Math.random() * 0.25

      // Determine status based on time and completion
      const hour = new Date().getHours()
      let status: TechnicianDisplay['status'] = 'available'
      if (hour < 8 || hour >= 17) {
        status = 'off_duty'
      } else if (completedToday > 0 && completedToday < totalToday) {
        status = 'on_route'
      } else if (hour >= 12 && hour < 13) {
        status = Math.random() > 0.5 ? 'break' : 'on_route'
      }

      return {
        id: tech.id,
        name: tech.name,
        branchName: branch?.name.split(' - ')[1] || branch?.name || 'Unknown',
        todayStops: totalToday,
        completedStops: completedToday || Math.floor(totalToday * 0.4),
        callbacks: callbacksToday || (Math.random() > 0.8 ? 1 : 0),
        utilization: avgUtilization * 100,
        status,
      }
    })

    setTechnicians(techDisplayData)
  }, [settings, showAllBranchTechnicians])

  const opsKpis = ['service_risk_index', 'callback_rate', 'missed_service_rate', 'avg_response_time_hours', 'retention_risk']

  // Service status breakdown
  const completedServices = serviceEvents.filter(s => s.status === 'completed').length
  const callbackServices = serviceEvents.filter(s => s.status === 'callback').length
  const missedServices = serviceEvents.filter(s => s.status === 'missed').length
  const scheduledServices = serviceEvents.filter(s => s.status === 'scheduled').length

  const serviceStatusData = [
    { name: 'Completed', value: completedServices, fill: '#22c55e' },
    { name: 'Callback', value: callbackServices, fill: '#f59e0b' },
    { name: 'Missed', value: missedServices, fill: '#ef4444' },
    { name: 'Scheduled', value: scheduledServices, fill: '#6366f1' },
  ]

  // Complaint breakdown
  const complaintTypes = ['service_quality', 'billing', 'scheduling', 'technician', 'other']
  const complaintData = complaintTypes.map(type => ({
    type: type.replace('_', ' '),
    count: complaints.filter(c => c.type === type).length,
  }))

  // At-risk accounts
  const atRiskAccounts = accounts
    .filter(a => a.retentionRisk === 'high' || a.retentionRisk === 'medium')
    .sort((a, b) => b.contractValue - a.contractValue)
    .slice(0, 10)

  // Branch capacity data
  const branches = getBranches()
  const capacity = getTechnicianCapacity()
  const recentCapacity = capacity.filter(c => c.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

  const branchCapacity = branches.slice(0, 8).map(branch => {
    const branchCap = recentCapacity.filter(c => c.branchId === branch.id)
    const avgUtilization = branchCap.length > 0
      ? branchCap.reduce((sum, c) => sum + c.utilization, 0) / branchCap.length
      : 0.75
    return {
      name: branch.name.split(' - ')[1] || branch.name,
      utilization: Math.min(avgUtilization * 100, 120),
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operations</h1>
          <p className="text-sm text-gray-500">Service quality, callbacks, and capacity management</p>
        </div>
        {/* Ops Manager toggle for technician visibility */}
        {settings.role === 'ops_manager' && (
          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {showAllBranchTechnicians ? 'All Branch Technicians' : 'My Technicians'}
            </span>
            <Switch
              checked={showAllBranchTechnicians}
              onCheckedChange={setShowAllBranchTechnicians}
            />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div id="ops-kpi-cards" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {opsKpis.map(slug => {
          const kpiValue = kpiValues.get(slug)
          if (!kpiValue) return null
          return <KPICard key={slug} kpiValue={kpiValue} compact />
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Status */}
        <Card id="service-risk-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Service Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="glow-ops-pie" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <Pie
                    data={serviceStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    dataKey="value"
                    activeShape={{ filter: 'url(#glow-ops-pie)' }}
                  >
                    {serviceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {serviceStatusData.map(status => (
                <div key={status.name} className="text-center">
                  <div className="text-2xl font-bold">{status.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{status.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Accounts Actions */}
        <ActionList
          actions={actions.filter(a => a.type === 'at_risk_account')}
          title="At-Risk Accounts"
          maxItems={6}
          type="at_risk_account"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Capacity */}
        <Card id="route-efficiency">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Branch Capacity Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchCapacity} layout="vertical">
                  <defs>
                    <filter id="glow-ops-bar1" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 120]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} valueLabel="Utilization" />} cursor={false} />
                  <Bar dataKey="utilization" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-ops-bar1)' }}>
                    {branchCapacity.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.utilization > 100 ? '#ef4444' : entry.utilization > 85 ? '#f59e0b' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Complaint Breakdown */}
        <Card id="callback-rate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Complaints by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintData}>
                  <defs>
                    <filter id="glow-ops-bar2" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip content={<ChartTooltip />} cursor={false} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ops-bar2)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technician Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Technician Roster
            <Badge variant="outline" className="ml-2">{technicians.length} Technicians</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technician</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Today&apos;s Stops</TableHead>
                <TableHead className="text-center">Completed</TableHead>
                <TableHead className="text-center">Callbacks</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.slice(0, 15).map(tech => (
                <TableRow key={tech.id}>
                  <TableCell>
                    <div className="font-medium">{tech.name}</div>
                    <div className="text-xs text-gray-500">{tech.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {tech.branchName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      tech.status === 'on_route' ? 'success' :
                      tech.status === 'available' ? 'default' :
                      tech.status === 'break' ? 'warning' : 'secondary'
                    }>
                      {tech.status === 'on_route' ? 'On Route' :
                       tech.status === 'off_duty' ? 'Off Duty' :
                       tech.status.charAt(0).toUpperCase() + tech.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {tech.todayStops}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={tech.completedStops === tech.todayStops ? 'text-green-600 font-medium' : ''}>
                      {tech.completedStops}/{tech.todayStops}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={tech.callbacks > 0 ? 'text-yellow-600 font-medium' : 'text-gray-400'}>
                      {tech.callbacks}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress
                        value={Math.min(tech.utilization, 100)}
                        className="w-16 h-2"
                      />
                      <span className={
                        tech.utilization > 100 ? 'text-red-600 font-medium' :
                        tech.utilization > 85 ? 'text-yellow-600' : 'text-green-600'
                      }>
                        {tech.utilization.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/tech/route?id=${tech.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {technicians.length > 15 && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                View All {technicians.length} Technicians
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* At-Risk Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Accounts Requiring Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead className="text-right">Open Issues</TableHead>
                <TableHead className="text-right">Complaints</TableHead>
                <TableHead>Last Service</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskAccounts.map(account => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-xs text-gray-500">{account.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.vertical}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(account.contractValue)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.retentionRisk === 'high' ? 'danger' : 'warning'}>
                      {account.retentionRisk}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={account.openIssues > 2 ? 'text-red-600 font-medium' : ''}>
                      {account.openIssues}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={account.complaints > 2 ? 'text-red-600 font-medium' : ''}>
                      {account.complaints}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {account.lastServiceDate.toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/account/${account.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
