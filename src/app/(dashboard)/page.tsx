"use client"

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import {
  ExecutiveCommandCenter,
  RepCommandCenter,
  TechnicianCommandCenter,
  SalesManagerCommandCenter,
  OpsManagerCommandCenter,
} from '@/components/dashboard'

export default function CommandCenterPage() {
  const [mounted, setMounted] = useState(false)
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use default role during SSR to prevent hydration mismatch
  const role = mounted ? settings.role : 'exec'

  // Leadership roles see the executive dashboard
  // exec, market_director, region_director, manager
  const isLeadershipRole = ['exec', 'market_director', 'region_director', 'manager'].includes(role)

  if (isLeadershipRole) {
    return <ExecutiveCommandCenter />
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
      return <ExecutiveCommandCenter />
  }
}
