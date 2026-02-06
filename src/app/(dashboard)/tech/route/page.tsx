"use client"

import { useEffect, useState } from 'react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { TechnicianRouteStop } from '@/lib/bigquery/queries/ops'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Clock, Truck, ExternalLink, Phone, AlertTriangle, RefreshCw, Mail, FileText } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/providers/AuthProvider'

// Lazy-load RouteMap to avoid bundling mapbox-gl (~200KB) on initial page load
const RouteMap = dynamic(
  () => import('@/components/maps/RouteMap').then(m => ({ default: m.RouteMap })),
  { ssr: false, loading: () => <div className="h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /> }
)
import { DataSourceBadge } from '@/components/ui/data-source-badge'

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

// Transform BigQuery data to RouteStop format
function transformRouteStops(bqStops: TechnicianRouteStop[]): RouteStop[] {
  return bqStops.map(stop => ({
    id: stop.id,
    order: stop.order,
    accountName: stop.accountName,
    address: stop.address,
    city: stop.city,
    estimatedArrival: stop.estimatedArrival,
    estimatedDuration: stop.estimatedDuration,
    status: stop.status,
    distance: stop.distance,
    coordinates: [0, 0] as [number, number], // Geocoding not available in BigQuery
    phone: stop.phone || undefined,
  }))
}

const EMPTY_STOPS: TechnicianRouteStop[] = []

export default function TechRoutePage() {
  const [mounted, setMounted] = useState(false)
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const { profile } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get technician ID from user profile (using employee_number field)
  const technicianId = profile?.employee_number || undefined

  // Fetch route data from BigQuery
  const {
    data: routeStops,
    isLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<TechnicianRouteStop[], TechnicianRouteStop[]>({
    queryName: 'technician-route',
    filters: {
      technicianId, // Manually filter by technician ID from user profile
      date: new Date().toISOString().split('T')[0],
    },
    defaultData: EMPTY_STOPS,
    transformBigQueryData: (data) => data,
    includeOrgFilters: false, // Route already filtered by technicianId above
    includeRoleFilters: false, // Route already filtered by technicianId above
  })

  // Transform to display format
  const stops = mounted ? transformRouteStops(routeStops) : []

  // Hydration guard
  if (!mounted) {
    return null
  }

  const totalDistance = stops.reduce((acc, s) => acc + parseFloat(s.distance), 0).toFixed(1)
  const completedStops = stops.filter(s => s.status === 'completed').length
  const currentStop = stops.find(s => s.status === 'current')

  const openInMaps = (stop: RouteStop) => {
    const query = encodeURIComponent(`${stop.address}, ${stop.city}`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-semibold">Loading today&apos;s route...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error State - Comprehensive */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Route Data</span>
          </div>

          <div className="space-y-3">
            {/* Error message */}
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            {/* Context */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Error Type:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{errorType || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-gray-500">Query:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">technician-route</p>
              </div>
              <div>
                <span className="text-gray-500">Technician ID:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{technicianId || 'Not set'}</p>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Recovery actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://console.cloud.google.com/bigquery', '_blank')}
              >
                <FileText className="h-3 w-3 mr-1.5" />
                View Logs
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `mailto:support@rentokil.com?subject=Technician Route Dashboard Error&body=Error: ${encodeURIComponent(error || 'Unknown error')}%0D%0ATechnician ID: ${technicianId || 'Not set'}`}
              >
                <Mail className="h-3 w-3 mr-1.5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Route</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Badge variant="outline" className="gap-1">
            <Truck className="h-3 w-3" />
            {completedStops}/{stops.length} Stops Complete
          </Badge>
        </div>
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
          <CardTitle className="flex items-center justify-between">
            Route Map
            <Badge variant="outline" className="text-xs font-normal">
              Geocoding unavailable
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stops.length === 0 ? (
            <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-center text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No stops scheduled for today</p>
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="text-center text-gray-500 max-w-md px-4">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium mb-1">Map Visualization Unavailable</p>
                <p className="text-sm">
                  Address geocoding data is not available in BigQuery. Route optimization and turn-by-turn navigation requires integration with a mapping service.
                </p>
              </div>
            </div>
          )}
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
