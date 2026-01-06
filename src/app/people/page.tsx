"use client"

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { getTechnicianCapacity, getBranches, getUsers } from '@/lib/data'
import { calculateKPIValues } from '@/lib/kpi-calculations'
import { KPICard } from '@/components/features/KPICard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Users, MapPin, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { KPIValue, TechnicianCapacity } from '@/types'

export default function PeoplePage() {
  const { settings } = useAppStore()
  const [capacity, setCapacity] = useState<TechnicianCapacity[]>([])
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())

  useEffect(() => {
    setCapacity(getTechnicianCapacity())
    setKpiValues(calculateKPIValues())
  }, [settings])

  const peopleKpis = ['capacity_utilization', 'scheduling_pressure_index']
  const branches = getBranches()
  const users = getUsers()

  // Get recent capacity data
  const today = new Date()
  const recentCapacity = capacity.filter(c =>
    c.date >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) &&
    c.date <= today
  )

  // Branch utilization summary
  const branchUtilization = branches.map(branch => {
    const branchCap = recentCapacity.filter(c => c.branchId === branch.id)
    const avgUtilization = branchCap.length > 0
      ? branchCap.reduce((sum, c) => sum + c.utilization, 0) / branchCap.length
      : 0
    const overutilizedDays = branchCap.filter(c => c.utilization > 1).length
    const totalHours = branchCap.reduce((sum, c) => sum + c.availableHours, 0)
    const usedHours = branchCap.reduce((sum, c) => sum + c.usedHours, 0)

    return {
      id: branch.id,
      name: branch.name,
      market: branch.name.split(' - ')[0],
      utilization: avgUtilization,
      overutilizedDays,
      totalHours,
      usedHours,
      techCount: new Set(branchCap.map(c => c.technicianId)).size,
    }
  }).sort((a, b) => b.utilization - a.utilization)

  // Weekly heatmap data (simulated)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const heatmapData = branches.slice(0, 8).map(branch => ({
    branch: branch.name.split(' - ')[1] || branch.name,
    ...daysOfWeek.reduce((acc, day, i) => ({
      ...acc,
      [day]: 60 + Math.random() * 50 // 60-110% utilization
    }), {})
  }))

  // Capacity distribution chart
  const capacityDistribution = [
    { range: '<60%', count: branchUtilization.filter(b => b.utilization < 0.6).length, fill: '#3b82f6' },
    { range: '60-80%', count: branchUtilization.filter(b => b.utilization >= 0.6 && b.utilization < 0.8).length, fill: '#22c55e' },
    { range: '80-95%', count: branchUtilization.filter(b => b.utilization >= 0.8 && b.utilization < 0.95).length, fill: '#84cc16' },
    { range: '95-100%', count: branchUtilization.filter(b => b.utilization >= 0.95 && b.utilization <= 1).length, fill: '#f59e0b' },
    { range: '>100%', count: branchUtilization.filter(b => b.utilization > 1).length, fill: '#ef4444' },
  ]

  const getUtilizationColor = (util: number): string => {
    if (util > 1) return 'text-red-600'
    if (util > 0.95) return 'text-orange-600'
    if (util > 0.8) return 'text-green-600'
    if (util > 0.6) return 'text-blue-600'
    return 'text-gray-600'
  }

  const getUtilizationBadge = (util: number) => {
    if (util > 1) return <Badge variant="danger">Overutilized</Badge>
    if (util > 0.95) return <Badge variant="warning">At Capacity</Badge>
    if (util > 0.8) return <Badge variant="success">Optimal</Badge>
    return <Badge variant="secondary">Underutilized</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">People & Capacity</h1>
          <p className="text-sm text-gray-500">Workforce utilization and scheduling pressure</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {peopleKpis.map(slug => {
          const kpiValue = kpiValues.get(slug)
          if (!kpiValue) return null
          return <KPICard key={slug} kpiValue={kpiValue} />
        })}

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Technicians</div>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.title?.includes('Technician') || u.title?.includes('Specialist')).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Overutilized Branches</div>
                <div className="text-2xl font-bold text-red-600">
                  {branchUtilization.filter(b => b.utilization > 1).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Capacity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {capacityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling Pressure Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Scheduling Pressure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left pb-2">Branch</th>
                    {daysOfWeek.map(day => (
                      <th key={day} className="text-center pb-2 w-12">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-2 text-gray-700 truncate max-w-[100px]">{row.branch}</td>
                      {daysOfWeek.map(day => {
                        const value = (row as Record<string, string | number>)[day] as number
                        const bgColor = value > 100 ? 'bg-red-500' :
                                       value > 90 ? 'bg-orange-400' :
                                       value > 75 ? 'bg-yellow-400' :
                                       value > 60 ? 'bg-green-400' :
                                       'bg-blue-400'
                        return (
                          <td key={day} className="p-1">
                            <div
                              className={`w-10 h-8 rounded flex items-center justify-center text-xs font-medium text-white ${bgColor}`}
                              title={`${value.toFixed(0)}%`}
                            >
                              {value.toFixed(0)}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-400 rounded" />
                <span>&lt;60%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-400 rounded" />
                <span>60-75%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-400 rounded" />
                <span>75-90%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-400 rounded" />
                <span>90-100%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span>&gt;100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Utilization Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Branch Capacity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Market</TableHead>
                <TableHead className="text-right">Technicians</TableHead>
                <TableHead className="text-right">Used / Available Hours</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead className="text-right">Overutilized Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchUtilization.slice(0, 15).map(branch => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name.split(' - ')[1] || branch.name}</TableCell>
                  <TableCell className="text-gray-500">{branch.market}</TableCell>
                  <TableCell className="text-right">{branch.techCount}</TableCell>
                  <TableCell className="text-right">
                    {branch.usedHours.toFixed(0)} / {branch.totalHours.toFixed(0)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(branch.utilization * 100, 120)}
                        className="w-24 h-2"
                      />
                      <span className={`text-sm font-medium ${getUtilizationColor(branch.utilization)}`}>
                        {(branch.utilization * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={branch.overutilizedDays > 0 ? 'text-red-600 font-medium' : ''}>
                      {branch.overutilizedDays}
                    </span>
                  </TableCell>
                  <TableCell>{getUtilizationBadge(branch.utilization)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
