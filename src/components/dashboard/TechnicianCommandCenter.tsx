"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Truck,
  Timer,
  Star,
  TrendingUp,
  Navigation
} from 'lucide-react'

interface ScheduleItem {
  id: string
  time: string
  accountName: string
  address: string
  serviceType: string
  status: 'scheduled' | 'in_progress' | 'completed'
  estimatedDuration: number
  isCallback: boolean
}

export function TechnicianCommandCenter() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }, [])

  useEffect(() => {
    // Simulated schedule data
    const mockSchedule: ScheduleItem[] = [
      { id: '1', time: '8:00 AM', accountName: 'ABC Manufacturing', address: '123 Industrial Blvd', serviceType: 'Monthly Inspection', status: 'completed', estimatedDuration: 45, isCallback: false },
      { id: '2', time: '9:30 AM', accountName: 'Downtown Cafe', address: '456 Main St', serviceType: 'Quarterly Treatment', status: 'completed', estimatedDuration: 60, isCallback: false },
      { id: '3', time: '11:00 AM', accountName: 'City Hospital', address: '789 Health Way', serviceType: 'Monthly Inspection', status: 'in_progress', estimatedDuration: 90, isCallback: false },
      { id: '4', time: '1:30 PM', accountName: 'Sunrise Apartments', address: '321 Residential Dr', serviceType: 'Initial Service', status: 'scheduled', estimatedDuration: 120, isCallback: false },
      { id: '5', time: '4:00 PM', accountName: 'Tech Solutions Inc', address: '555 Corporate Park', serviceType: 'Callback', status: 'scheduled', estimatedDuration: 45, isCallback: true },
    ]

    setTimeout(() => {
      setSchedule(mockSchedule)
      setIsLoading(false)
    }, 300)
  }, [])

  const completedCount = schedule.filter(s => s.status === 'completed').length
  const inProgressCount = schedule.filter(s => s.status === 'in_progress').length
  const scheduledCount = schedule.filter(s => s.status === 'scheduled').length
  const remainingCount = inProgressCount + scheduledCount // Everything not completed
  const totalCount = schedule.length
  const callbackCount = schedule.filter(s => s.isCallback).length
  const totalServiceTime = schedule.reduce((acc, s) => acc + s.estimatedDuration, 0)
  const completedServiceTime = schedule.filter(s => s.status === 'completed').reduce((acc, s) => acc + s.estimatedDuration, 0)
  const remainingServiceTime = schedule.filter(s => s.status !== 'completed').reduce((acc, s) => acc + s.estimatedDuration, 0)

  // Find current and next stops
  const currentStop = schedule.find(s => s.status === 'in_progress')
  const nextStops = schedule.filter(s => s.status === 'scheduled').slice(0, 3)

  // Performance metrics (simulated)
  const performanceMetrics = {
    avgTimeOnSite: 52, // minutes
    onTimeRate: 94, // percent
    customerRating: 4.8,
    weeklyCompletionRate: 98,
  }

  const getStatusBadge = (status: string, isCallback: boolean) => {
    if (isCallback) {
      return <Badge variant="warning">Callback</Badge>
    }
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>
      default:
        return <Badge variant="outline">Scheduled</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
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
            Mike Johnson • Route 12A • {currentDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {completedCount}/{totalCount} Complete
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {currentTime}
          </Badge>
        </div>
      </div>

      {/* Progress Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Today&apos;s Progress</p>
              <p className="text-3xl font-bold mt-1">
                {completedCount} / {totalCount} Stops
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{Math.round((completedCount / totalCount) * 100)}%</p>
              <p className="text-white/80 text-sm">completed</p>
            </div>
          </div>
          <Progress
            value={(completedCount / totalCount) * 100}
            className="mt-4 h-3 bg-white/20"
          />
          <div className="flex justify-between mt-2 text-sm text-white/80">
            <span>{completedServiceTime} min completed</span>
            <span>{remainingServiceTime} min remaining ({remainingCount} stops)</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stops Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {remainingCount} remaining{inProgressCount > 0 ? ` (${inProgressCount} in progress)` : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Est. Service Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(totalServiceTime / 60)}h {totalServiceTime % 60}m</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Timer className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Avg {Math.round(totalServiceTime / totalCount)} min/stop</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Callbacks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{callbackCount}</p>
              </div>
              <div className={`h-12 w-12 ${callbackCount > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30'} rounded-lg flex items-center justify-center`}>
                <AlertTriangle className={`h-6 w-6 ${callbackCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className={callbackCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}>
                {callbackCount > 0 ? 'Priority service' : 'No callbacks'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">On-Time Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceMetrics.onTimeRate}%</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-gray-500 dark:text-gray-400">{performanceMetrics.customerRating} rating</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current & Next Stops */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Stop */}
          {currentStop && (
            <Card className="border-yellow-300 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    Current Stop
                  </CardTitle>
                  <Badge variant="warning">In Progress</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{currentStop.time}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{currentStop.estimatedDuration} min</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-lg text-gray-900 dark:text-white">{currentStop.accountName}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <MapPin className="h-3 w-3" />
                      {currentStop.address}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{currentStop.serviceType}</div>
                  </div>
                  <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <Truck className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Stops */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming Stops</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nextStops.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      item.isCallback ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10' :
                      'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.time}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.estimatedDuration} min</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 dark:text-white">{item.accountName}</div>
                        {getStatusBadge(item.status, item.isCallback)}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <MapPin className="h-3 w-3" />
                        {item.address}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.serviceType}</div>
                    </div>
                  </div>
                ))}
                {nextStops.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>All stops completed for today!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Performance */}
        <div className="space-y-6">
          {/* Weekly Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Completion Rate</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{performanceMetrics.weeklyCompletionRate}%</span>
                  </div>
                  <Progress value={performanceMetrics.weeklyCompletionRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">On-Time Arrivals</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{performanceMetrics.onTimeRate}%</span>
                  </div>
                  <Progress value={performanceMetrics.onTimeRate} className="h-2" />
                </div>
                <div className="flex justify-between text-sm pt-2 border-t dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Avg Time on Site</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{performanceMetrics.avgTimeOnSite} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Customer Rating</span>
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {performanceMetrics.customerRating}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Today */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Completed Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {schedule.filter(s => s.status === 'completed').map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-900 dark:text-white truncate max-w-[150px]">{item.accountName}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
