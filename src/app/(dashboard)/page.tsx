"use client"

import { useState, useEffect, Suspense } from 'react'
import { useAppStore } from '@/store'
import {
  ExecutiveCommandCenter,
  RepCommandCenter,
  TechnicianCommandCenter,
  SalesManagerCommandCenter,
  OpsManagerCommandCenter,
} from '@/components/dashboard'
import { Skeleton } from '@/components/ui/skeleton'

// Loading component for Suspense boundary
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

export default function CommandCenterPage() {
  const [mounted, setMounted] = useState(false)
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use default role during SSR to prevent hydration mismatch
  const role = mounted ? settings.role : 'exec'

  // Leadership roles see the executive dashboard
  // exec, market_director, market_sales_director, region_director, manager
  const isLeadershipRole = ['exec', 'market_director', 'market_sales_director', 'region_director', 'manager'].includes(role)

  if (isLeadershipRole) {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <ExecutiveCommandCenter />
      </Suspense>
    )
  }

  // Frontline roles see personalized dashboards
  switch (role) {
    case 'rep':
      return <RepCommandCenter />
    case 'technician':
      return <TechnicianCommandCenter />
    case 'sales_manager':
      return <SalesManagerCommandCenter />
    case 'ops_manager':
      return <OpsManagerCommandCenter />
    default:
      // Fallback to executive view
      return (
        <Suspense fallback={<DashboardSkeleton />}>
          <ExecutiveCommandCenter />
        </Suspense>
      )
  }
}
