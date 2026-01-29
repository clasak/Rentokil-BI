"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { BCGTechWorkOrder } from '@/lib/bigquery/queries/bcg-analytics'

interface ScheduleItem {
  id: string
  time: string
  accountName: string
  address: string
  serviceType: string
  status: 'scheduled' | 'in_progress' | 'completed'
  estimatedDuration: number
}

interface ScheduleDisplay {
  schedule: ScheduleItem[]
  completedCount: number
  totalCount: number
  totalDuration: number
  callbackCount: number
}

const EMPTY_SCHEDULE: ScheduleDisplay = {
  schedule: [],
  completedCount: 0,
  totalCount: 0,
  totalDuration: 0,
  callbackCount: 0,
}

function transformBigQueryData(bqData: BCGTechWorkOrder[]): ScheduleDisplay {
  // Transform BCG tech work order data to today's schedule format
  // Generate schedule times based on order index (8:00 AM start)
  const schedule: ScheduleItem[] = bqData.slice(0, 10).map((workOrder, index) => {
    const hour = 8 + Math.floor(index * 0.75) // ~45 min per stop
    const minute = (index * 45) % 60
    const timeStr = `${hour}:${minute.toString().padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`

    return {
      id: workOrder.technician_id || String(index + 1),
      time: timeStr,
      accountName: workOrder.technician_name || 'Service Customer',
      address: workOrder.branch || 'Service Location',
      serviceType: `${Math.round(workOrder.avg_stops_per_day)} stops/day avg`,
      status: workOrder.completion_rate >= 0.8 ? 'completed' :
              workOrder.completion_rate >= 0.5 ? 'in_progress' : 'scheduled',
      estimatedDuration: Math.round(480 / Math.max(workOrder.avg_stops_per_day, 1)) || 45, // 8 hours / stops per day
    }
  })

  return {
    schedule,
    completedCount: schedule.filter(s => s.status === 'completed').length,
    totalCount: schedule.length,
    totalDuration: schedule.reduce((acc, s) => acc + s.estimatedDuration, 0),
    callbackCount: bqData.filter(wo => wo.completion_rate < 1).length, // Incomplete as callbacks
  }
}

export default function TechSchedulePage() {
  // BigQuery integration - Use BCG tech work orders query
  const {
    data: scheduleData,
    isLoading,
    dataSource,
    responseTime,
    refetch,
  } = useBigQueryData<BCGTechWorkOrder[], ScheduleDisplay>({
    queryName: 'bcg-tech-work-orders',
    filters: { daysBack: 1 },
    defaultData: EMPTY_SCHEDULE,
    transformBigQueryData,
  })

  const schedule = scheduleData?.schedule || []
  const completedCount = scheduleData?.completedCount || 0
  const totalCount = scheduleData?.totalCount || 0
  const callbackCount = scheduleData?.callbackCount || 0

  const getStatusBadge = (status: string) => {
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
    return <div className="p-6">Loading schedule...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Schedule</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading} className="h-8 w-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {completedCount}/{totalCount} Complete
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalCount}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Stops Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{schedule.reduce((acc, s) => acc + s.estimatedDuration, 0)} min</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Est. Service Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{callbackCount}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Callbacks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule List */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Route</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedule.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 rounded-lg border ${
                  item.status === 'in_progress' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
                  item.status === 'completed' ? 'border-green-200 bg-green-50 dark:bg-green-900/20' :
                  'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{item.time}</div>
                  <div className="text-xs text-gray-500">{item.estimatedDuration} min</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 dark:text-white">{item.accountName}</div>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <MapPin className="h-3 w-3" />
                    {item.address}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.serviceType}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
