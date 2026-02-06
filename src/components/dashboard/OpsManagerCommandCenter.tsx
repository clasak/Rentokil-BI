"use client"

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { getUsers } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Star,
  TrendingUp,
  TrendingDown,
  Phone,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TechnicianStatus {
  id: string
  name: string
  route: string
  status: 'on_route' | 'at_stop' | 'completed' | 'delayed'
  stopsCompleted: number
  stopsTotal: number
  callbacks: number
  utilization: number
  rating: number
}

export function OpsManagerCommandCenter() {
  const { currentUser } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [techData, setTechData] = useState<TechnicianStatus[]>([])

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }, [])

  useEffect(() => {
    // Get technicians from generated user data
    const users = getUsers()
    const assignedTechIds = currentUser?.assignedTechnicians || []

    // Filter technicians based on ops manager's assigned technicians
    const assignedTechs = users.filter(u =>
      u.role === 'technician' &&
      (assignedTechIds.length === 0 || assignedTechIds.includes(u.id))
    )

    // Generate realistic status data for assigned technicians
    const statuses: Array<'on_route' | 'at_stop' | 'completed' | 'delayed'> = ['on_route', 'at_stop', 'completed', 'delayed']
    const routes = ['Route 12A', 'Route 15B', 'Route 8C', 'Route 22A', 'Route 3D', 'Route 7F', 'Route 18E']

    const technicianData: TechnicianStatus[] = assignedTechs.slice(0, 5).map((tech, index) => {
      const stopsTotal = 5 + (index % 3) // 5-7 stops, deterministic per position
      const completionFractions = [0.5, 0.8, 1.0, 0.33, 0.67]
      const stopsCompleted = Math.min(Math.round(stopsTotal * completionFractions[index % 5]), stopsTotal)
      return {
        id: tech.id,
        name: tech.name,
        route: routes[index % routes.length],
        status: statuses[index % 4],
        stopsCompleted,
        stopsTotal,
        callbacks: index % 3, // 0, 1, or 2 deterministically
        utilization: 75 + ((index * 7 + 3) % 20), // 75-94 range, deterministic
        rating: 4.0 + ((index * 3 + 1) % 9) / 10, // 4.1-4.8 range, deterministic
      }
    })

    setTimeout(() => {
      setTechData(technicianData)
      setIsLoading(false)
    }, 300)
  }, [currentUser])

  // Team aggregations
  const teamStats = {
    totalStopsCompleted: techData.reduce((sum, t) => sum + t.stopsCompleted, 0),
    totalStopsPlanned: techData.reduce((sum, t) => sum + t.stopsTotal, 0),
    totalCallbacks: techData.reduce((sum, t) => sum + t.callbacks, 0),
    avgUtilization: techData.length > 0 ? techData.reduce((sum, t) => sum + t.utilization, 0) / techData.length : 0,
    avgRating: techData.length > 0 ? techData.reduce((sum, t) => sum + t.rating, 0) / techData.length : 0,
    delayedTechs: techData.filter(t => t.status === 'delayed').length,
    completedTechs: techData.filter(t => t.status === 'completed').length,
  }

  const completionRate = teamStats.totalStopsPlanned > 0
    ? (teamStats.totalStopsCompleted / teamStats.totalStopsPlanned) * 100
    : 0

  // Callback rate calculation and thresholds
  const CALLBACK_RATE_THRESHOLD = 8 // 8% is the maximum acceptable callback rate
  const callbackRate = teamStats.totalStopsCompleted > 0
    ? (teamStats.totalCallbacks / teamStats.totalStopsCompleted) * 100
    : 0
  const isCallbackRateHigh = callbackRate > CALLBACK_RATE_THRESHOLD

  // Chart data
  const techChartData = techData.map(t => ({
    name: t.name.split(' ')[0],
    completed: t.stopsCompleted,
    remaining: t.stopsTotal - t.stopsCompleted,
  }))

  // Derive service issues from technician data (callbacks and delays)
  const serviceIssues = techData.flatMap(tech => {
    const issues: { id: string; type: string; account: string; tech: string; urgency: string; description: string }[] = []
    if (tech.callbacks > 0) {
      issues.push({
        id: `cb-${tech.id}`,
        type: 'callback',
        account: `${tech.route} service`,
        tech: tech.name,
        urgency: 'high',
        description: `${tech.callbacks} callback${tech.callbacks > 1 ? 's' : ''} pending`,
      })
    }
    if (tech.status === 'delayed') {
      issues.push({
        id: `delay-${tech.id}`,
        type: 'delay',
        account: `${tech.route} schedule`,
        tech: tech.name,
        urgency: 'medium',
        description: 'Running behind schedule',
      })
    }
    return issues
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Done</Badge>
      case 'at_stop':
        return <Badge variant="warning">At Stop</Badge>
      case 'delayed':
        return <Badge variant="destructive">Delayed</Badge>
      default:
        return <Badge variant="outline">En Route</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Command Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Operations Manager • {techData.length} Technicians • {currentDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {teamStats.delayedTechs > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {teamStats.delayedTechs} Delayed
            </Badge>
          )}
          {teamStats.totalCallbacks > 0 && (
            <Badge variant="warning" className="gap-1">
              <Phone className="h-3 w-3" />
              {teamStats.totalCallbacks} Callbacks
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {currentTime}
          </Badge>
        </div>
      </div>

      {/* Team Progress */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Today&apos;s Service Progress</p>
              <p className="text-3xl font-bold mt-1">
                {teamStats.totalStopsCompleted} / {teamStats.totalStopsPlanned} Stops
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{completionRate.toFixed(0)}%</p>
              <p className="text-white/80 text-sm">completed</p>
            </div>
          </div>
          <Progress
            value={completionRate}
            className="mt-4 h-3 bg-white/20"
          />
          <div className="flex justify-between mt-2 text-sm text-white/80">
            <span>{teamStats.completedTechs} of {techData.length} techs finished</span>
            <span>{teamStats.totalStopsPlanned - teamStats.totalStopsCompleted} stops remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Techs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{techData.length - teamStats.completedTechs}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{teamStats.completedTechs} done for the day</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Callbacks Today</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.totalCallbacks}</p>
                  <span className={`text-sm font-medium ${isCallbackRateHigh ? 'text-red-600 dark:text-red-400' : callbackRate > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    ({callbackRate.toFixed(1)}% rate)
                  </span>
                </div>
              </div>
              <div className={`h-12 w-12 ${isCallbackRateHigh ? 'bg-red-100 dark:bg-red-900/30' : callbackRate > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30'} rounded-lg flex items-center justify-center`}>
                <Phone className={`h-6 w-6 ${isCallbackRateHigh ? 'text-red-600 dark:text-red-400' : callbackRate > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {isCallbackRateHigh ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400">
                    Above {CALLBACK_RATE_THRESHOLD}% threshold
                  </span>
                </>
              ) : callbackRate > 0 ? (
                <span className="text-yellow-600 dark:text-yellow-400">
                  Within {CALLBACK_RATE_THRESHOLD}% threshold
                </span>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">No callbacks</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Utilization</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.avgUtilization.toFixed(0)}%</p>
              </div>
              <div className={`h-12 w-12 ${teamStats.avgUtilization >= 85 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'} rounded-lg flex items-center justify-center`}>
                <TrendingUp className={`h-6 w-6 ${teamStats.avgUtilization >= 85 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className={teamStats.avgUtilization >= 85 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                {teamStats.avgUtilization >= 85 ? 'On target' : 'Below target'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Team Rating</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.avgRating.toFixed(1)}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Customer satisfaction</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Technician Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Completion Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route Progress by Technician</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={techChartData}>
                    <defs>
                      <filter id="glow-ops-mgr" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                            <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
                            {payload.map((entry, index) => (
                              <p key={index} className="text-sm text-gray-600 dark:text-gray-300">
                                {entry.name}: {entry.value}
                              </p>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} activeBar={{ filter: 'url(#glow-ops-mgr)' }} />
                    <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ops-mgr)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Technician Status List */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Technician Status
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {techData.map((tech) => {
                  const progress = (tech.stopsCompleted / tech.stopsTotal) * 100
                  return (
                    <div
                      key={tech.id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        tech.status === 'delayed' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700' :
                        tech.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' :
                        'bg-muted'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tech.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                        tech.status === 'delayed' ? 'bg-red-100 dark:bg-red-900/30' :
                        tech.status === 'at_stop' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <Truck className={`h-5 w-5 ${
                          tech.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                          tech.status === 'delayed' ? 'text-red-600 dark:text-red-400' :
                          tech.status === 'at_stop' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-blue-600 dark:text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{tech.name}</span>
                          {getStatusBadge(tech.status)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tech.route}</div>
                        <div className="flex items-center justify-between mt-1">
                          <Progress value={progress} className="h-1.5 flex-1 mr-4" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {tech.stopsCompleted}/{tech.stopsTotal}
                          </span>
                        </div>
                      </div>
                      {tech.callbacks > 0 && (
                        <Badge variant="warning" className="text-xs">
                          {tech.callbacks} CB
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Issues */}
        <div className="space-y-6">
          {/* Service Issues */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  Needs Attention
                </CardTitle>
                <Badge variant="warning">{serviceIssues.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serviceIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border ${
                      issue.urgency === 'high'
                        ? 'border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                        : 'border-yellow-200 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{issue.account}</span>
                      <Badge variant={issue.urgency === 'high' ? 'destructive' : 'warning'} className="text-xs">
                        {issue.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {issue.tech}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {issue.description}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Performance Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Service Completion</span>
                    <span className="font-semibold text-gray-900 dark:text-white">96%</span>
                  </div>
                  <Progress value={96} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">On-Time Rate</span>
                    <span className="font-semibold text-gray-900 dark:text-white">91%</span>
                  </div>
                  <Progress value={91} className="h-2" />
                </div>
                <div className="flex justify-between text-sm pt-2 border-t dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Weekly Callbacks</span>
                  <span className="font-semibold text-gray-900 dark:text-white">8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Callback Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-white">4.2%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
