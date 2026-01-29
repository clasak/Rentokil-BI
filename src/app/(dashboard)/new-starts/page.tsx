'use client'

import { useState, useEffect } from 'react'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'

// Import role-specific view components
import AENewStartsView from './components/AENewStartsView'
import OpsNewStartsView from './components/OpsNewStartsView'
import LeadershipNewStartsView from './components/LeadershipNewStartsView'

/**
 * Consolidated New Starts Page
 *
 * Renders different views based on user role without redirects:
 * - AE (rep): Personal new starts tracking with log form
 * - Ops Manager: Team oversight, assign specialists, schedule installations
 * - Leadership (exec/directors/managers): Aggregated metrics and trends
 */
export default function NewStartsPage() {
  const [mounted, setMounted] = useState(false)
  const role = useEffectiveRole(mounted)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show nothing during SSR/hydration to prevent flash
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Determine which view to render based on role
  const isAE = role === 'rep'
  const isOpsManager = role === 'ops_manager'
  const isLeadership = [
    'exec',
    'market_vp',
    'market_sales_director',
    'region_director',
    'region_sales_manager',
    'manager',
    'sales_manager'
  ].includes(role)

  // Render role-specific view
  if (isAE) {
    return <AENewStartsView />
  }

  if (isOpsManager) {
    return <OpsNewStartsView />
  }

  if (isLeadership) {
    return <LeadershipNewStartsView />
  }

  // Fallback for technicians or unknown roles
  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <div className="text-6xl">🚧</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Access Denied
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          This page is only available to Account Executives, Operations Managers, and Leadership roles.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Your current role: <span className="font-mono font-semibold">{role}</span>
        </p>
      </div>
    </div>
  )
}
