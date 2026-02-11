"use client"

import { useState, useEffect } from 'react'
import { useAppStore, PRESENTER_MODE_CONFIG, ROLE_PERMISSIONS, type TestScenario } from '@/store'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageSkeleton } from '@/components/ui/skeleton-loader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings, Shield, Users, Target, Database, RefreshCw,
  AlertTriangle, Presentation, ExternalLink, Lock, Eye,
  Crown, Building2, Briefcase, TrendingUp, Truck, UserCheck, Wrench,
  LogIn, UserPlus, Clock, Loader2, Activity, Brain, FlaskConical
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Role, DemoMode, Scenario } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getDataSourceStatus } from '@/services'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'
import { useOrganizationData } from '@/hooks/useOrganizationData'

// Platform Admin Components
import { PlatformHealth } from './components/PlatformHealth'
import { DataFreshnessSLATracker } from './components/DataFreshnessSLA'
import { UserAdoption } from './components/UserAdoption'
import { DataQualityScorecard } from './components/DataQualityScorecard'
import { SchemaChangeAlerts } from './components/SchemaChangeAlerts'
import { AnomalyDetection } from './components/AnomalyDetection'

// SALTI Dashboard Components
import { SALTILeadFunnel } from './components/SALTILeadFunnel'
import { SALTITargetKPIGauge } from './components/SALTITargetKPIGauge'

// Organization Code Discovery
import { OrgCodeDiscovery } from '@/components/admin/OrgCodeDiscovery'
import { SALTIFiveTenTwo } from './components/SALTIFiveTenTwo'
import { SALTISalesResults } from './components/SALTISalesResults'
import { SALTIPortfolio } from './components/SALTIPortfolio'
import { SALTIHRMetrics } from './components/SALTIHRMetrics'

// BigQuery Components
import { BigQueryDataSourceToggle } from './components/BigQueryDataSourceToggle'
import { BigQueryHealthCheck } from './components/BigQueryHealthCheck'

// Role Preview
import { RolePreview } from './components/RolePreview'

// Types for BigQuery data freshness
import type { DataFreshnessSLA, DataFreshnessSummary } from '@/lib/bigquery/queries/data-freshness'

// SALTI Dashboard Data
import {
  getLeadFunnelMetrics,
  getTargetKPIs,
  getFiveTenTwoMetrics,
  getSalesResultsMetrics,
  getPortfolioMetrics,
  getHRMetrics,
} from '@/lib/mock/saltiData'

// Test Mode Scenarios
import { TEST_SCENARIOS } from '@/lib/mock/testScenarios'

interface LoginEvent {
  id: string
  event_type: string
  message: string
  metadata: {
    email: string
    timestamp: string
    userAgent?: string
  }
  created_at: string
}

interface DataSummary {
  markets: number
  regions: number
  branches: number
  users: number
  accounts: number
  opportunities: number
  lastUpdated: string
}

// Role to route mapping for navigation after role switch
const ROLE_ROUTES: Record<Role, string> = {
  exec: '/',
  market_vp: '/',
  market_sales_director: '/',
  region_director: '/',
  region_sales_manager: '/',
  manager: '/',
  sales_manager: '/ae',
  ops_manager: '/',
  rep: '/ae',
  technician: '/tech'
}

export default function AdminPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [loadingDataSummary, setLoadingDataSummary] = useState(false)
  const [dataSummaryError, setDataSummaryError] = useState<string | null>(null)
  const [freshnessData, setFreshnessData] = useState<DataFreshnessSLA[]>([])
  const [loadingFreshness, setLoadingFreshness] = useState(false)
  const supabase = createClient()

  const {
    settings,
    setDemoMode,
    setRole,
    setUserId,
    setScenario,
    setDataQualityIssuesEnabled,
    refreshData,
    setPresenterMode,
    getCurrentUserScope,
    testModeEnabled,
    testScenario,
    setTestModeEnabled,
    setTestScenario,
    isPreviewingRole,
    previewedRole,
    setPreviewingRole,
    setPreviewingRoleWithOrg,
    exitRolePreview,
    adminModeEnabled,
  } = useAppStore()

  // Get real organization data for role previews
  const { markets: orgMarkets, regions: orgRegions, branches: orgBranches } = useOrganizationData()

  const scope = mounted ? getCurrentUserScope() : { markets: [], branches: [], scope: 'Loading...' }
  const dataSourceStatus = getDataSourceStatus()
  const schemaAlerts: any[] = [] // TODO: Fetch from schema monitoring API when available

  // Handle role change with navigation to appropriate dashboard
  // When admin switches role, set both the role AND previewing state so navigation updates
  const handleRoleChange = (role: Role) => {
    setRole(role)

    // Use real org data from BigQuery if available for more accurate previews
    const hasOrgData = orgMarkets.length > 0
    if (hasOrgData) {
      // Get sample real org codes for the preview
      const sampleMarket = orgMarkets[0]?.market_code
      const sampleRegion = orgRegions.find(r => r.market_code === sampleMarket)?.region_code
      const sampleBranch = orgBranches.find(b => b.region_code === sampleRegion)?.branch_code

      setPreviewingRoleWithOrg(role, {
        market: sampleMarket,
        region: sampleRegion,
        branch: sampleBranch,
      })
    } else {
      // Fall back to default preview user with sample codes
      setPreviewingRole(role)
    }

    router.push(ROLE_ROUTES[role])
  }

  // Exit role preview and return to admin view
  const handleExitRolePreview = () => {
    exitRolePreview()
    setRole('exec')
    router.push('/admin')
  }

  // Platform Admin Data - Now using BigQuery hooks
  // Note: These hooks are called unconditionally after mounted check below
  const [healthMetrics, setHealthMetrics] = useState<any>(null)
  const [adoptionMetrics, setAdoptionMetrics] = useState<any>(null)
  const [anomalyAlerts, setAnomalyAlerts] = useState<any[]>([])

  // Fetch health metrics
  useEffect(() => {
    if (!mounted) return

    const fetchHealthMetrics = async () => {
      try {
        const response = await fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'platform-health-metrics' }),
        })
        const result = await response.json()
        if (result.success && result.data) {
          setHealthMetrics(result.data)
        }
      } catch (e) {
        // Silently fail - non-critical metrics
      }
    }

    const fetchAdoptionMetrics = async () => {
      try {
        const response = await fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'user-adoption-summary' }),
        })
        const result = await response.json()
        if (result.success && result.data) {
          setAdoptionMetrics(result.data)
        }
      } catch (e) {
        // Silently fail - non-critical metrics
      }
    }

    const fetchAnomalyAlerts = async () => {
      try {
        const response = await fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'anomaly-alerts' }),
        })
        const result = await response.json()
        if (result.success && result.data) {
          setAnomalyAlerts(result.data)
        }
      } catch (e) {
        // Silently fail - non-critical metrics
      }
    }

    fetchHealthMetrics()
    fetchAdoptionMetrics()
    fetchAnomalyAlerts()
  }, [mounted])

  // Calculate summary stats for alert banner
  const criticalCount = anomalyAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length
  const slaBreaches = freshnessData.filter(s => s.status === 'breached').length

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchLoginEvents = async () => {
    setLoadingEvents(true)
    try {
      const { data, error } = await supabase
        .from('ops_events')
        .select('*')
        .eq('source', 'auth')
        .in('event_type', ['login', 'signup'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setLoginEvents(data as LoginEvent[])
      }
    } catch (e) {
      // Silently fail - non-critical activity log
    } finally {
      setLoadingEvents(false)
    }
  }

  const fetchDataSummary = async () => {
    setLoadingDataSummary(true)
    setDataSummaryError(null)
    try {
      const response = await fetch('/api/bigquery/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'data-summary' }),
      })
      const result = await response.json()
      if (result.success && result.data) {
        setDataSummary(result.data)
      } else {
        setDataSummaryError(result.error || 'Failed to fetch data summary')
      }
    } catch (e) {
      console.error('Failed to fetch data summary:', e)
      setDataSummaryError('Network error fetching data summary')
    } finally {
      setLoadingDataSummary(false)
    }
  }

  const fetchDataFreshness = async () => {
    setLoadingFreshness(true)
    try {
      const response = await fetch('/api/bigquery/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'data-freshness' }),
      })
      const result = await response.json()
      if (result.success && result.data?.sources) {
        setFreshnessData(result.data.sources)
      } else if (result.success && Array.isArray(result.data)) {
        setFreshnessData(result.data)
      }
    } catch (e) {
      console.error('Failed to fetch data freshness:', e)
    } finally {
      setLoadingFreshness(false)
    }
  }

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
          const isUserAdmin = isAdminEmail(user.email)
          setIsAdmin(isUserAdmin)

          if (isUserAdmin) {
            fetchLoginEvents()
            fetchDataSummary()
            fetchDataFreshness()
          }
        }
      } catch (e) {
        console.error('Error checking admin status:', e)
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [supabase])

  const handleRefreshData = () => {
    refreshData()
    window.location.reload()
  }

  const handleRefresh = () => {
    setLastRefresh(new Date())
    fetchLoginEvents()
    fetchDataSummary()
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'exec': return Crown
      case 'market_vp': return Building2
      case 'market_sales_director': return TrendingUp
      case 'region_director': return Users
      case 'region_sales_manager': return TrendingUp
      case 'manager': return Briefcase
      case 'sales_manager': return TrendingUp
      case 'ops_manager': return Truck
      case 'rep': return UserCheck
      case 'technician': return Wrench
      default: return Users
    }
  }

  if (loading) {
    return <PageSkeleton />
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
              This page is restricted to administrators only.
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold dark:text-gray-100">Admin Console</h1>
            <Badge variant="destructive">Admin Only</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Platform health, role simulation, data sources, and demo controls
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Role Preview Banner */}
      {isPreviewingRole && previewedRole && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-blue-500" />
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-300">
                Previewing Role: {ROLE_PERMISSIONS[previewedRole]?.label || previewedRole}
              </span>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Navigation and dashboard views reflect this role&apos;s experience
              </p>
            </div>
          </div>
          <Button
            onClick={handleExitRolePreview}
            variant="outline"
            className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
          >
            <Shield className="h-4 w-4" />
            Exit Preview
          </Button>
        </div>
      )}

      {/* Alert Summary Bar */}
      {(criticalCount > 0 || slaBreaches > 0) && (
        <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-red-800 dark:text-red-300">Attention Required:</span>
            <span className="text-red-700 dark:text-red-400 ml-2">
              {[
                criticalCount > 0 && `${criticalCount} critical anomalies`,
                slaBreaches > 0 && `${slaBreaches} SLA breaches`,
              ].filter(Boolean).join(' • ')}
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <TabsTrigger value="overview" className="gap-1.5 text-xs px-3">
            <Activity className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs px-3">
            <Shield className="h-3.5 w-3.5" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="slas" className="gap-1.5 text-xs px-3">
            <Clock className="h-3.5 w-3.5" />
            SLAs
          </TabsTrigger>
          <TabsTrigger value="adoption" className="gap-1.5 text-xs px-3">
            <Users className="h-3.5 w-3.5" />
            Adoption
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-1.5 text-xs px-3">
            <Database className="h-3.5 w-3.5" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="schema" className="gap-1.5 text-xs px-3">
            <AlertTriangle className="h-3.5 w-3.5" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-1.5 text-xs px-3">
            <Brain className="h-3.5 w-3.5" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-1.5 text-xs px-3">
            <Presentation className="h-3.5 w-3.5" />
            Demo
          </TabsTrigger>
          <TabsTrigger value="datasources" className="gap-1.5 text-xs px-3">
            <Database className="h-3.5 w-3.5" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs px-3">
            <LogIn className="h-3.5 w-3.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="salti" className="gap-1.5 text-xs px-3">
            <Target className="h-3.5 w-3.5" />
            SALTI
          </TabsTrigger>
          <TabsTrigger value="org-codes" className="gap-1.5 text-xs px-3">
            <Building2 className="h-3.5 w-3.5" />
            Org Codes
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview - Platform Health */}
        <TabsContent value="overview" className="space-y-6">
          <PlatformHealth metrics={healthMetrics} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataFreshnessSLATracker slaData={freshnessData} isLoading={loadingFreshness} onRefresh={fetchDataFreshness} />
            <DataQualityScorecard />
          </div>
        </TabsContent>

        {/* Tab 2: Roles - Quick Role Switch & Role-Based Access Simulation */}
        <TabsContent value="roles" className="space-y-6">
          {/* Quick Role Switch */}
          <Card className={`border-2 ${isPreviewingRole ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-primary/20'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Quick Role Switch
                    {isPreviewingRole && previewedRole && (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Previewing: {ROLE_PERMISSIONS[previewedRole]?.label}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Instantly switch between roles to test different user experiences
                  </CardDescription>
                </div>
                {isPreviewingRole && (
                  <Button
                    onClick={handleExitRolePreview}
                    size="sm"
                    variant="outline"
                    className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
                  >
                    <Shield className="h-4 w-4" />
                    Exit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider delayDuration={300}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(Object.keys(ROLE_PERMISSIONS) as Role[]).map((role) => {
                    const Icon = getRoleIcon(role)
                    // Check both settings.role and previewedRole for active state
                    const isActive = isPreviewingRole ? previewedRole === role : settings.role === role
                    return (
                      <Tooltip key={role}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleRoleChange(role)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              isActive
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-gray-500'}`} />
                              <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'dark:text-gray-100'}`}>
                                {ROLE_PERMISSIONS[role].label}
                              </span>
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-sm">{ROLE_PERMISSIONS[role].description}</p>
                          <p className="text-xs text-gray-400 mt-1">Click to switch and navigate to dashboard</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </TooltipProvider>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">Current scope: </span>
                <span className="font-medium dark:text-gray-100">{scope.scope}</span>
              </div>
            </CardContent>
          </Card>

          {/* Role-Based Access Simulation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role-Based Access Simulation
              </CardTitle>
              <CardDescription>
                Simulate different user roles to demonstrate row-level security (RLS)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-gray-100">Role</label>
                  <Select value={isPreviewingRole && previewedRole ? previewedRole : settings.role} onValueChange={(v) => handleRoleChange(v as Role)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exec">Executive</SelectItem>
                      <SelectItem value="market_vp">Market VP</SelectItem>
                      <SelectItem value="market_sales_director">Market Sales Director</SelectItem>
                      <SelectItem value="region_director">Region Director</SelectItem>
                      <SelectItem value="region_sales_manager">Region Sales Manager</SelectItem>
                      <SelectItem value="manager">Branch Manager</SelectItem>
                      <SelectItem value="sales_manager">Sales Manager</SelectItem>
                      <SelectItem value="ops_manager">Operations Manager</SelectItem>
                      <SelectItem value="rep">Account Executive</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {ROLE_PERMISSIONS[isPreviewingRole && previewedRole ? previewedRole : settings.role].description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-gray-100">Location (BigQuery)</label>
                  <Select
                    value={settings.userId || ''}
                    onValueChange={(v) => {
                      setUserId(v)
                      // Find the org codes for the selected branch and set preview context
                      const branch = orgBranches.find(b => b.branch_code === v)
                      if (branch) {
                        const activeRole = isPreviewingRole && previewedRole ? previewedRole : settings.role
                        setPreviewingRoleWithOrg(activeRole, {
                          market: branch.market_code,
                          region: branch.region_code,
                          branch: branch.branch_code,
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch location" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgBranches.slice(0, 30).map(branch => (
                        <SelectItem key={branch.branch_code} value={branch.branch_code}>
                          {branch.branch_name} ({branch.market_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {orgBranches.length > 0 ? `${orgBranches.length} branches from BigQuery` : 'Loading org data...'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm font-medium mb-2 dark:text-gray-100">Current Access Scope</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Role</div>
                    <div className="font-medium dark:text-gray-100">
                      {ROLE_PERMISSIONS[isPreviewingRole && previewedRole ? previewedRole : settings.role].label}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Markets</div>
                    <div className="font-medium dark:text-gray-100">{scope.markets.length} market(s)</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Scope</div>
                    <div className="font-medium dark:text-gray-100">{scope.scope}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2 dark:text-gray-100">Permissions</div>
                {(() => {
                  const activeRole = isPreviewingRole && previewedRole ? previewedRole : settings.role
                  return (
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">View:</span>
                        {ROLE_PERMISSIONS[activeRole].canView.map(v => (
                          <Badge key={v} variant="outline" className="text-xs">{v.replace('_', ' ')}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Edit:</span>
                        {ROLE_PERMISSIONS[activeRole].canEdit.map(e => (
                          <Badge key={e} variant="secondary" className="text-xs">{e.replace('_', ' ')}</Badge>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Role Sidebar Preview */}
          <RolePreview />
        </TabsContent>

        {/* Tab 3: SLAs */}
        <TabsContent value="slas">
          <DataFreshnessSLATracker slaData={freshnessData} isLoading={loadingFreshness} onRefresh={fetchDataFreshness} />
        </TabsContent>

        {/* Tab 4: Adoption */}
        <TabsContent value="adoption">
          <UserAdoption metrics={adoptionMetrics} />
        </TabsContent>

        {/* Tab 5: Quality */}
        <TabsContent value="quality">
          <DataQualityScorecard />
        </TabsContent>

        {/* Tab 6: Schema */}
        <TabsContent value="schema">
          <SchemaChangeAlerts alerts={schemaAlerts} />
        </TabsContent>

        {/* Tab 7: Anomalies */}
        <TabsContent value="anomalies">
          <AnomalyDetection />
        </TabsContent>

        {/* Tab 8: Demo - Simulation Mode & Presenter Mode */}
        <TabsContent value="demo" className="space-y-6">
          {/* Simulation Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Simulation Mode
              </CardTitle>
              <CardDescription>
                Choose a simulation scenario to highlight different aspects of the BI platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(PRESENTER_MODE_CONFIG) as DemoMode[]).map((mode) => {
                  const config = PRESENTER_MODE_CONFIG[mode]
                  const isSelected = settings.demoMode === mode

                  return (
                    <button
                      key={mode}
                      onClick={() => setDemoMode(mode)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold dark:text-gray-100">{config.name}</span>
                        {isSelected && <Badge variant="default">Active</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{config.persona}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{config.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{config.steps.length} steps</p>
                    </button>
                  )
                })}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium dark:text-gray-100">Presenter Mode</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Floating panel with talking points for {PRESENTER_MODE_CONFIG[settings.demoMode]?.name || 'BI Leadership Demo'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Keyboard: Arrow keys to navigate, M to minimize, Esc to exit
                  </p>
                </div>
                <Button onClick={() => setPresenterMode(true)} className="gap-2 bg-rentokil-red hover:bg-rentokil-darkred">
                  <Presentation className="h-4 w-4" />
                  Start Presenter Mode
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Forecast Scenario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Forecast Scenario
              </CardTitle>
              <CardDescription>
                Select scenario for forecast projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {(['base', 'upside', 'downside'] as Scenario[]).map((scenario) => (
                  <button
                    key={scenario}
                    onClick={() => setScenario(scenario)}
                    className={`px-4 py-2 rounded-lg border-2 capitalize ${
                      settings.scenario === scenario
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:text-gray-100'
                    }`}
                  >
                    {scenario}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Quality Simulation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Data Quality Simulation
              </CardTitle>
              <CardDescription>
                Inject data quality issues to demonstrate how the system handles imperfect data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2 dark:text-gray-100">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Inject Data Quality Issues
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enable to show missing fields, stale data, and duplicates
                  </p>
                </div>
                <Switch
                  checked={settings.dataQualityIssuesEnabled}
                  onCheckedChange={setDataQualityIssuesEnabled}
                />
              </div>

              {settings.dataQualityIssuesEnabled && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Issues Being Simulated:</div>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                    <li>• Missing close dates on some opportunities</li>
                    <li>• Stale data source (Workforce/HR 6+ hours old)</li>
                    <li>• Duplicate invoices detected</li>
                    <li>• Stale service records (&gt;48 hours)</li>
                  </ul>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2 dark:text-gray-100">
                    <RefreshCw className="h-4 w-4" />
                    Refresh Data
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Regenerate synthetic data with slight variations (same entity IDs)
                  </p>
                </div>
                <Button onClick={handleRefreshData} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Data
                </Button>
              </div>

              <div className="text-xs text-gray-400">
                Current seed: {settings.refreshSeed}
              </div>
            </CardContent>
          </Card>

          {/* Test Mode */}
          <Card className={testModeEnabled ? 'border-2 border-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Test Mode
                {testModeEnabled && (
                  <Badge className="bg-amber-500 text-amber-950">Active</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Inject test data scenarios to verify dashboard behavior with edge cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2 dark:text-gray-100">
                    <FlaskConical className="h-4 w-4 text-amber-500" />
                    Enable Test Mode
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Override data with test scenarios to verify UI states
                  </p>
                </div>
                <Switch
                  checked={testModeEnabled}
                  onCheckedChange={setTestModeEnabled}
                />
              </div>

              {testModeEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-100">Select Scenario</label>
                    <Select value={testScenario} onValueChange={(v) => setTestScenario(v as TestScenario)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scenario" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TEST_SCENARIOS) as TestScenario[]).map((scenario) => (
                          <SelectItem key={scenario} value={scenario}>
                            <div className="flex items-center gap-2">
                              <span>{TEST_SCENARIOS[scenario].name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                      {TEST_SCENARIOS[testScenario].name}
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {TEST_SCENARIOS[testScenario].description}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-amber-200/50 dark:bg-amber-800/30 rounded px-2 py-1">
                        <span className="text-amber-600 dark:text-amber-400">Revenue:</span>
                        <span className="ml-1 font-medium text-amber-800 dark:text-amber-300">
                          {(TEST_SCENARIOS[testScenario].multipliers.revenue * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-amber-200/50 dark:bg-amber-800/30 rounded px-2 py-1">
                        <span className="text-amber-600 dark:text-amber-400">Counts:</span>
                        <span className="ml-1 font-medium text-amber-800 dark:text-amber-300">
                          {(TEST_SCENARIOS[testScenario].multipliers.counts * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-amber-200/50 dark:bg-amber-800/30 rounded px-2 py-1">
                        <span className="text-amber-600 dark:text-amber-400">Rates:</span>
                        <span className="ml-1 font-medium text-amber-800 dark:text-amber-300">
                          {(TEST_SCENARIOS[testScenario].multipliers.rates * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Test mode affects all dashboard data. A banner will appear at the top of all pages.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 9: Data Sources */}
        <TabsContent value="datasources" className="space-y-6">
          {/* BigQuery Data Source Toggle */}
          <BigQueryDataSourceToggle />

          {/* BigQuery Health Check */}
          <BigQueryHealthCheck />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Sources
              </CardTitle>
              <CardDescription>
                Configure connections to enterprise data sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium dark:text-gray-100">Active Source: {dataSourceStatus.name}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dataSourceStatus.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={dataSourceStatus.configured ? 'default' : 'outline'} className={dataSourceStatus.configured ? 'bg-green-100 text-green-700' : ''}>
                      {dataSourceStatus.configured ? 'Connected' : 'Not Configured'}
                    </Badge>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{dataSourceStatus.source}</code>
                  </div>
                </div>
                <Link href="/settings/data-sources">
                  <Button variant="outline" className="gap-2">
                    Configure
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Data Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Summary
                  {dataSummary && (
                    <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      Live from BigQuery
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDataSummary}
                  disabled={loadingDataSummary}
                  className="gap-2"
                >
                  {loadingDataSummary ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {dataSummaryError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  BigQuery Error: {dataSummaryError}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loadingDataSummary && !dataSummary ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <div className="text-2xl font-bold dark:text-gray-100">
                      {dataSummary ? dataSummary.markets.toLocaleString() : '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Markets</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <div className="text-2xl font-bold dark:text-gray-100">
                      {dataSummary ? dataSummary.regions.toLocaleString() : '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Regions</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <div className="text-2xl font-bold dark:text-gray-100">
                      {dataSummary ? dataSummary.branches.toLocaleString() : '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Branches</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <div className="text-2xl font-bold dark:text-gray-100">
                      {dataSummary ? dataSummary.users.toLocaleString() : '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Users</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <div className="text-2xl font-bold dark:text-gray-100">
                      {dataSummary ? dataSummary.accounts.toLocaleString() : '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Accounts</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <div className="text-2xl font-bold dark:text-gray-100">
                      {dataSummary ? dataSummary.opportunities.toLocaleString() : '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Opportunities</div>
                  </div>
                </div>
              )}
              {dataSummary && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
                  Last updated: {new Date(dataSummary.lastUpdated).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 10: Activity - Login Activity */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Login Activity
                  </CardTitle>
                  <CardDescription>
                    Recent user logins and signups
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLoginEvents}
                  disabled={loadingEvents}
                  className="gap-2"
                >
                  {loadingEvents ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEvents && loginEvents.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : loginEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <LogIn className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No login events recorded yet.</p>
                  <p className="text-xs mt-1">Events will appear here after users sign in.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {loginEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className={`p-2 rounded-full ${
                        event.event_type === 'signup'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {event.event_type === 'signup' ? (
                          <UserPlus className={`h-4 w-4 ${
                            event.event_type === 'signup'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`} />
                        ) : (
                          <LogIn className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm dark:text-gray-100 truncate">
                            {event.metadata?.email || 'Unknown user'}
                          </span>
                          <Badge
                            variant={event.event_type === 'signup' ? 'default' : 'secondary'}
                            className={`text-xs ${
                              event.event_type === 'signup'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : ''
                            }`}
                          >
                            {event.event_type === 'signup' ? 'New User' : 'Login'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(event.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 11: SALTI Dashboard - 47 KPIs */}
        <TabsContent value="salti" className="space-y-6">
          {/* Demo Mode Banner */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Demo Mode - Showing simulated SALTI metrics for testing purposes
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Target KPIs Section */}
          {getTargetKPIs(settings.role, settings.userId) && (
            <SALTITargetKPIGauge data={getTargetKPIs(settings.role, settings.userId)!} />
          )}

          {/* Lead Funnel Section */}
          <SALTILeadFunnel data={getLeadFunnelMetrics(settings.role, settings.userId)} />

          {/* 5-10-2 Tracker Section */}
          {getFiveTenTwoMetrics(settings.role, settings.userId) && (
            <SALTIFiveTenTwo data={getFiveTenTwoMetrics(settings.role, settings.userId)!} />
          )}

          {/* Sales Results Section */}
          {getSalesResultsMetrics(settings.role, settings.userId) && (
            <SALTISalesResults data={getSalesResultsMetrics(settings.role, settings.userId)!} />
          )}

          {/* Portfolio Section - Leadership only */}
          {getPortfolioMetrics(settings.role, settings.userId) && (
            <SALTIPortfolio data={getPortfolioMetrics(settings.role, settings.userId)!} />
          )}

          {/* HR Metrics Section - Leadership only */}
          {getHRMetrics(settings.role, settings.userId) && (
            <SALTIHRMetrics data={getHRMetrics(settings.role, settings.userId)!} />
          )}
        </TabsContent>

        {/* Tab: Organization Codes - Code Discovery Tool */}
        <TabsContent value="org-codes" className="space-y-6">
          <OrgCodeDiscovery />
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
        Last refreshed: {lastRefresh.toLocaleTimeString()}
      </div>
    </div>
  )
}
