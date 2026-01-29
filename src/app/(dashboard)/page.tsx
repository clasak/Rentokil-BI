"use client"

import { useState, useEffect, Suspense } from 'react'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import {
  ExecutiveCommandCenter,
  RepCommandCenter,
  TechnicianCommandCenter,
  SalesManagerCommandCenter,
  OpsManagerCommandCenter,
} from '@/components/dashboard'
import { DashboardSkeleton } from '@/components/ui/skeleton-loader'

export default function CommandCenterPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use effective role (supports admin preview mode)
  const role = useEffectiveRole(mounted)

  // Leadership roles see the executive dashboard
  // exec, market_vp, market_sales_director, region_director, region_sales_manager, manager
  const isLeadershipRole = ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager'].includes(role)

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
