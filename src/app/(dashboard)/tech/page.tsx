"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, CheckCircle, AlertTriangle } from 'lucide-react'

interface ScheduleItem {
  id: string
  time: string
  accountName: string
  address: string
  serviceType: string
  status: 'scheduled' | 'in_progress' | 'completed'
  estimatedDuration: number
}

export default function TechSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulated schedule data
    const mockSchedule: ScheduleItem[] = [
      { id: '1', time: '8:00 AM', accountName: 'ABC Manufacturing', address: '123 Industrial Blvd', serviceType: 'Monthly Inspection', status: 'completed', estimatedDuration: 45 },
      { id: '2', time: '9:30 AM', accountName: 'Downtown Cafe', address: '456 Main St', serviceType: 'Quarterly Treatment', status: 'completed', estimatedDuration: 60 },
      { id: '3', time: '11:00 AM', accountName: 'City Hospital', address: '789 Health Way', serviceType: 'Monthly Inspection', status: 'in_progress', estimatedDuration: 90 },
      { id: '4', time: '1:30 PM', accountName: 'Sunrise Apartments', address: '321 Residential Dr', serviceType: 'Initial Service', status: 'scheduled', estimatedDuration: 120 },
      { id: '5', time: '4:00 PM', accountName: 'Tech Solutions Inc', address: '555 Corporate Park', serviceType: 'Callback', status: 'scheduled', estimatedDuration: 45 },
    ]

    setTimeout(() => {
      setSchedule(mockSchedule)
      setIsLoading(false)
    }, 300)
  }, [])

  const completedCount = schedule.filter(s => s.status === 'completed').length
  const totalCount = schedule.length

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
        <Badge variant="outline" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          {completedCount}/{totalCount} Complete
        </Badge>
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
                <div className="text-2xl font-bold">{schedule.filter(s => s.serviceType === 'Callback').length}</div>
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
