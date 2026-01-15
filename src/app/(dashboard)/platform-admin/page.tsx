"use client"

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck, Activity, Clock, Users, Shield, GitBranch, Zap
} from 'lucide-react'

// Import components
import { PlatformHealth } from './components/PlatformHealth'
import { DataFreshnessSLA } from './components/DataFreshnessSLA'
import { UserAdoption } from './components/UserAdoption'
import { DataQualityScorecard } from './components/DataQualityScorecard'
import { SchemaChangeAlerts } from './components/SchemaChangeAlerts'
import { AnomalyDetection } from './components/AnomalyDetection'

// Import mock data for badge counts
import {
  getDataFreshnessSLAs,
  getSchemaChangeAlerts,
  getAnomalyAlerts
} from '@/lib/mock/platformAdminData'

export default function PlatformAdminPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('health')
  const { settings } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate badge counts
  const slaBreachCount = getDataFreshnessSLAs().filter(s => s.status === 'breached').length
  const schemaNewCount = getSchemaChangeAlerts().filter(s => s.status === 'new').length
  const anomalyCriticalCount = getAnomalyAlerts().filter(a => a.severity === 'critical' && a.status === 'active').length

  // Check access - only admin or product_owner roles
  // In production, this would check against actual user roles
  // For now, we check if admin email or allow exec/manager access
  const hasAccess = mounted && (
    settings.role === 'exec' ||
    settings.role === 'market_vp' ||
    settings.role === 'region_director' ||
    settings.role === 'manager'
  )

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground">
          This page is only accessible to administrators and product owners.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Platform Admin' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Platform Admin Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor platform health, data quality, user adoption, and system alerts
          </p>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Product Owner View
        </Badge>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="health" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="freshness" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Freshness</span>
            {slaBreachCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {slaBreachCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="adoption" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Adoption</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Quality</span>
          </TabsTrigger>
          <TabsTrigger value="schema" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Schema</span>
            {schemaNewCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {schemaNewCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Anomalies</span>
            {anomalyCriticalCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {anomalyCriticalCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <PlatformHealth />
        </TabsContent>

        <TabsContent value="freshness" className="space-y-6">
          <DataFreshnessSLA />
        </TabsContent>

        <TabsContent value="adoption" className="space-y-6">
          <UserAdoption />
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <DataQualityScorecard />
        </TabsContent>

        <TabsContent value="schema" className="space-y-6">
          <SchemaChangeAlerts />
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          <AnomalyDetection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
