"use client"

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface RouteStop {
  id: string
  order: number
  accountName: string
  address: string
  city: string
  status: 'completed' | 'current' | 'upcoming'
  coordinates: [number, number] // [lng, lat]
}

interface RouteMapProps {
  stops: RouteStop[]
  className?: string
}

export function RouteMap({ stops, className = '' }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  useEffect(() => {
    if (!mapContainer.current) return
    if (map.current) return // Map already initialized

    if (!accessToken) {
      setError('Mapbox access token not configured')
      return
    }

    mapboxgl.accessToken = accessToken

    try {
      // Calculate center from stops
      const validStops = stops.filter(s => s.coordinates)
      if (validStops.length === 0) {
        setError('No valid coordinates for stops')
        return
      }

      const centerLng = validStops.reduce((sum, s) => sum + s.coordinates[0], 0) / validStops.length
      const centerLat = validStops.reduce((sum, s) => sum + s.coordinates[1], 0) / validStops.length

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [centerLng, centerLat],
        zoom: 11
      })

      map.current.on('load', () => {
        setMapReady(true)

        // Add route line
        const routeCoordinates = validStops
          .sort((a, b) => a.order - b.order)
          .map(s => s.coordinates)

        if (map.current && routeCoordinates.length > 1) {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
              }
            }
          })

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.7,
              'line-dasharray': [2, 1]
            }
          })
        }

        // Add markers for each stop
        validStops.forEach((stop) => {
          const el = document.createElement('div')
          el.className = 'route-marker'
          el.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
            background-color: ${
              stop.status === 'completed' ? '#22c55e' :
              stop.status === 'current' ? '#3b82f6' :
              '#9ca3af'
            };
            ${stop.status === 'current' ? 'border: 3px solid white; animation: pulse 2s infinite;' : ''}
          `
          el.innerHTML = `${stop.order}`

          // Add popup
          const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div style="padding: 8px; max-width: 200px;">
                <strong style="font-size: 14px;">${stop.accountName}</strong>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
                  ${stop.address}, ${stop.city}
                </p>
                <span style="
                  display: inline-block;
                  margin-top: 6px;
                  padding: 2px 8px;
                  border-radius: 12px;
                  font-size: 11px;
                  font-weight: 500;
                  background-color: ${
                    stop.status === 'completed' ? '#dcfce7' :
                    stop.status === 'current' ? '#dbeafe' :
                    '#f3f4f6'
                  };
                  color: ${
                    stop.status === 'completed' ? '#166534' :
                    stop.status === 'current' ? '#1e40af' :
                    '#374151'
                  };
                ">
                  ${stop.status === 'completed' ? 'Completed' : stop.status === 'current' ? 'Current Stop' : 'Upcoming'}
                </span>
              </div>
            `)

          if (map.current) {
            new mapboxgl.Marker(el)
              .setLngLat(stop.coordinates)
              .setPopup(popup)
              .addTo(map.current)
          }
        })

        // Fit bounds to show all markers
        const bounds = new mapboxgl.LngLatBounds()
        validStops.forEach(stop => {
          bounds.extend(stop.coordinates)
        })
        map.current?.fitBounds(bounds, { padding: 50 })
      })

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    } catch (err) {
      setError('Failed to initialize map')
      console.error('Map initialization error:', err)
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [stops, accessToken])

  if (error) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400 p-4">
          <svg className="h-12 w-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>{error}</p>
          <p className="text-xs mt-1">Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable maps</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {!mapReady && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        }
      `}</style>
    </div>
  )
}
