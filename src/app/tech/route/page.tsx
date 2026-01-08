"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, Clock, Truck } from 'lucide-react'

interface RouteStop {
  id: string
  order: number
  accountName: string
  address: string
  city: string
  estimatedArrival: string
  estimatedDuration: number
  status: 'completed' | 'current' | 'upcoming'
  distance: string
}

export default function TechRoutePage() {
  const [stops, setStops] = useState<RouteStop[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const mockStops: RouteStop[] = [
      { id: '1', order: 1, accountName: 'ABC Manufacturing', address: '123 Industrial Blvd', city: 'Springfield', estimatedArrival: '8:00 AM', estimatedDuration: 45, status: 'completed', distance: '0 mi' },
      { id: '2', order: 2, accountName: 'Downtown Cafe', address: '456 Main St', city: 'Springfield', estimatedArrival: '9:30 AM', estimatedDuration: 60, status: 'completed', distance: '3.2 mi' },
      { id: '3', order: 3, accountName: 'City Hospital', address: '789 Health Way', city: 'Springfield', estimatedArrival: '11:00 AM', estimatedDuration: 90, status: 'current', distance: '5.1 mi' },
      { id: '4', order: 4, accountName: 'Sunrise Apartments', address: '321 Residential Dr', city: 'Riverside', estimatedArrival: '1:30 PM', estimatedDuration: 120, status: 'upcoming', distance: '8.4 mi' },
      { id: '5', order: 5, accountName: 'Tech Solutions Inc', address: '555 Corporate Park', city: 'Riverside', estimatedArrival: '4:00 PM', estimatedDuration: 45, status: 'upcoming', distance: '2.3 mi' },
    ]

    setTimeout(() => {
      setStops(mockStops)
      setIsLoading(false)
    }, 300)
  }, [])

  const totalDistance = stops.reduce((acc, s) => acc + parseFloat(s.distance), 0).toFixed(1)
  const completedStops = stops.filter(s => s.status === 'completed').length

  if (isLoading) {
    return <div className="p-6">Loading route...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Route</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Truck className="h-3 w-3" />
          {completedStops}/{stops.length} Stops Complete
        </Badge>
      </div>

      {/* Route Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stops.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Stops</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Navigation className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{totalDistance} mi</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Distance</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stops.reduce((acc, s) => acc + s.estimatedDuration, 0)} min</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Est. Service Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Route Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Map integration coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Stops */}
      <Card>
        <CardHeader>
          <CardTitle>Route Stops</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  stop.status === 'current' ? 'border-primary bg-primary/5' :
                  stop.status === 'completed' ? 'border-green-200 bg-green-50 dark:bg-green-900/20 opacity-70' :
                  'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  stop.status === 'current' ? 'bg-primary text-white' :
                  stop.status === 'completed' ? 'bg-green-500 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {stop.order}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 dark:text-white">{stop.accountName}</div>
                    <div className="text-sm text-gray-500">{stop.estimatedArrival}</div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {stop.address}, {stop.city}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>{stop.distance} from previous</span>
                    <span>{stop.estimatedDuration} min service</span>
                  </div>
                </div>
                {stop.status === 'current' && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
