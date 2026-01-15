"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield, Activity, Clock, Users, Database,
  AlertTriangle, Brain, RefreshCw, Lock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'
import Link from 'next/link'

// Components
import { PlatformHealth } from './components/PlatformHealth'
import { DataFreshnessSLATracker } from './components/DataFreshnessSLA'
import { UserAdoption } from './components/UserAdoption'
import { DataQualityScorecard } from './components/DataQualityScorecard'
import { SchemaChangeAlerts } from './components/SchemaChangeAlerts'
import { AnomalyDetection } from './components/AnomalyDetection'

// Data
import {
  getPlatformHealthMetrics,
  getDataFreshnessSLAs,
  getUserAdoptionMetrics,
  getDataQualityScorecard,
  getSchemaChangeAlerts,
  getAnomalyAlerts,
} from '@/lib/platform-admin-data'

export default function PlatformAdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const supabase = createClient()

  // Load all data
  const healthMetrics = getPlatformHealthMetrics()
  const freshnessData = getDataFreshnessSLAs()
  const adoptionMetrics = getUserAdoptionMetrics()
  const qualityDimensions = getDataQualityScorecard()
  const schemaAlerts = getSchemaChangeAlerts()
  const anomalyAlerts = getAnomalyAlerts()

  // Calculate summary stats
  const criticalCount = anomalyAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length
  const newSchemaChanges = schemaAlerts.filter(a => a.status === 'new').length
  const slaBreaches = freshnessData.filter(s => s.status === 'breached').length

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
          const isUserAdmin = isAdminEmail(user.email)
          setIsAdmin(isUserAdmin)
        }
      } catch (e) {
        console.error('Error checking admin status:', e)
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [supabase])

  const handleRefresh = () => {
    setLastRefresh(new Date())
    // In real implementation, this would refetch data from APIs
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page is restricted to platform administrators and product owners.
              {userEmail && (
                <span className="block mt-2 text-xs">
                  Signed in as: {userEmail}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold dark:text-gray-100">Platform Admin Console</h1>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Shield className="h-3 w-3 mr-1" />
              Product Owner
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor platform health, data quality, and user adoption
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Alert Summary Bar */}
      {(criticalCount > 0 || newSchemaChanges > 0 || slaBreaches > 0) && (
        <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-red-800 dark:text-red-300">Attention Required:</span>
            <span className="text-red-700 dark:text-red-400 ml-2">
              {[
                criticalCount > 0 && `${criticalCount} critical anomalies`,
                newSchemaChanges > 0 && `${newSchemaChanges} schema changes`,
                slaBreaches > 0 && `${slaBreaches} SLA breaches`,
              ].filter(Boolean).join(' • ')}
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="freshness" className="gap-2">
            <Clock className="h-4 w-4" />
            SLAs
          </TabsTrigger>
          <TabsTrigger value="adoption" className="gap-2">
            <Users className="h-4 w-4" />
            Adoption
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-2">
            <Database className="h-4 w-4" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="schema" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-2">
            <Brain className="h-4 w-4" />
            Anomalies
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <PlatformHealth metrics={healthMetrics} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataFreshnessSLATracker slaData={freshnessData} />
            <DataQualityScorecard dimensions={qualityDimensions} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SchemaChangeAlerts alerts={schemaAlerts} />
            <AnomalyDetection alerts={anomalyAlerts} />
          </div>
        </TabsContent>

        {/* Freshness Tab */}
        <TabsContent value="freshness">
          <DataFreshnessSLATracker slaData={freshnessData} />
        </TabsContent>

        {/* Adoption Tab */}
        <TabsContent value="adoption">
          <UserAdoption metrics={adoptionMetrics} />
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality">
          <DataQualityScorecard dimensions={qualityDimensions} />
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema">
          <SchemaChangeAlerts alerts={schemaAlerts} />
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies">
          <AnomalyDetection alerts={anomalyAlerts} />
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
        Last refreshed: {lastRefresh.toLocaleTimeString()} • Data is mock/synthetic for demonstration
      </div>
    </div>
  )
}
