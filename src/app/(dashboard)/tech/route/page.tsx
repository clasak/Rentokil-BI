"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Clock, Truck, ExternalLink, Phone } from 'lucide-react'
import { RouteMap } from '@/components/maps/RouteMap'

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
  coordinates: [number, number] // [lng, lat]
  phone?: string
}

export default function TechRoutePage() {
  const [stops, setStops] = useState<RouteStop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStop, setSelectedStop] = useState<string | null>(null)

  useEffect(() => {
    // Springfield, IL area coordinates for demo
    const mockStops: RouteStop[] = [
      {
        id: '1',
        order: 1,
        accountName: 'ABC Manufacturing',
        address: '123 Industrial Blvd',
        city: 'Springfield',
        estimatedArrival: '8:00 AM',
        estimatedDuration: 45,
        status: 'completed',
        distance: '0 mi',
        coordinates: [-89.6501, 39.7817],
        phone: '(217) 555-0101'
      },
      {
        id: '2',
        order: 2,
        accountName: 'Downtown Cafe',
        address: '456 Main St',
        city: 'Springfield',
        estimatedArrival: '9:30 AM',
        estimatedDuration: 60,
        status: 'completed',
        distance: '3.2 mi',
        coordinates: [-89.6437, 39.7990],
        phone: '(217) 555-0202'
      },
      {
        id: '3',
        order: 3,
        accountName: 'City Hospital',
        address: '789 Health Way',
        city: 'Springfield',
        estimatedArrival: '11:00 AM',
        estimatedDuration: 90,
        status: 'current',
        distance: '5.1 mi',
        coordinates: [-89.6590, 39.8120],
        phone: '(217) 555-0303'
      },
      {
        id: '4',
        order: 4,
        accountName: 'Sunrise Apartments',
        address: '321 Residential Dr',
        city: 'Riverside',
        estimatedArrival: '1:30 PM',
        estimatedDuration: 120,
        status: 'upcoming',
        distance: '8.4 mi',
        coordinates: [-89.6200, 39.7650],
        phone: '(217) 555-0404'
      },
      {
        id: '5',
        order: 5,
        accountName: 'Tech Solutions Inc',
        address: '555 Corporate Park',
        city: 'Riverside',
        estimatedArrival: '4:00 PM',
        estimatedDuration: 45,
        status: 'upcoming',
        distance: '2.3 mi',
        coordinates: [-89.6050, 39.7500],
        phone: '(217) 555-0505'
      },
    ]

    setTimeout(() => {
      setStops(mockStops)
      setIsLoading(false)
    }, 300)
  }, [])

  const totalDistance = stops.reduce((acc, s) => acc + parseFloat(s.distance), 0).toFixed(1)
  const completedStops = stops.filter(s => s.status === 'completed').length
  const currentStop = stops.find(s => s.status === 'current')

  const openInMaps = (stop: RouteStop) => {
    const query = encodeURIComponent(`${stop.address}, ${stop.city}`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

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

      {/* Current Stop Highlight */}
      {currentStop && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {currentStop.order}
                </div>
                Current Stop
              </CardTitle>
              <Badge variant="default">In Progress</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{currentStop.accountName}</h3>
                <p className="text-gray-600 dark:text-gray-400">{currentStop.address}, {currentStop.city}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Est. {currentStop.estimatedDuration} min service time
                </p>
              </div>
              <div className="flex gap-2">
                {currentStop.phone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${currentStop.phone}`}>
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => openInMaps(currentStop)}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Navigate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Map */}
      <Card>
        <CardHeader>
          <CardTitle>Route Map</CardTitle>
        </CardHeader>
        <CardContent>
          <RouteMap stops={stops} className="h-80" />
        </CardContent>
      </Card>

      {/* Route Stops */}
      <Card>
        <CardHeader>
          <CardTitle>Route Stops</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stops.map((stop) => (
              <div
                key={stop.id}
                onClick={() => setSelectedStop(selectedStop === stop.id ? null : stop.id)}
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                  stop.status === 'current' ? 'border-primary bg-primary/5' :
                  stop.status === 'completed' ? 'border-green-200 bg-green-50 dark:bg-green-900/20 opacity-70' :
                  'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${selectedStop === stop.id ? 'ring-2 ring-primary' : ''}`}
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

                  {/* Expanded actions */}
                  {selectedStop === stop.id && (
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      {stop.phone && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${stop.phone}`}>
                            <Phone className="h-4 w-4 mr-1" />
                            {stop.phone}
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openInMaps(stop); }}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open in Maps
                      </Button>
                    </div>
                  )}
                </div>
                {stop.status === 'current' && (
                  <Badge variant="default">Current</Badge>
                )}
                {stop.status === 'completed' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">Done</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
