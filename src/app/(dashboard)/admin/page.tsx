"use client"

import { useState, useEffect } from 'react'
import { useAppStore, PRESENTER_MODE_CONFIG, ROLE_PERMISSIONS } from '@/store'
import { getMarkets, getUsers } from '@/lib/data'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  LogIn, UserPlus, Clock, Loader2, Activity, Brain
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Role, DemoMode, Scenario } from '@/types'
import Link from 'next/link'
import { getDataSourceStatus } from '@/services'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'

// Platform Admin Components
import { PlatformHealth } from './components/PlatformHealth'
import { DataFreshnessSLATracker } from './components/DataFreshnessSLA'
import { UserAdoption } from './components/UserAdoption'
import { DataQualityScorecard } from './components/DataQualityScorecard'
import { SchemaChangeAlerts } from './components/SchemaChangeAlerts'
import { AnomalyDetection } from './components/AnomalyDetection'

// Platform Admin Data
import {
  getPlatformHealthMetrics,
  getDataFreshnessSLAs,
  getUserAdoptionMetrics,
  getDataQualityScorecard,
  getSchemaChangeAlerts,
  getAnomalyAlerts,
} from '@/lib/platform-admin-data'

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

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
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
  } = useAppStore()

  const markets = getMarkets()
  const users = getUsers()
  const scope = mounted ? getCurrentUserScope() : { markets: [], branches: [], scope: 'Loading...' }
  const dataSourceStatus = getDataSourceStatus()

  // Platform Admin Data
  const healthMetrics = getPlatformHealthMetrics()
  const freshnessData = getDataFreshnessSLAs()
  const adoptionMetrics = getUserAdoptionMetrics()
  const qualityDimensions = getDataQualityScorecard()
  const schemaAlerts = getSchemaChangeAlerts()
  const anomalyAlerts = getAnomalyAlerts()

  // Calculate summary stats for alert banner
  const criticalCount = anomalyAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length
  const newSchemaChanges = schemaAlerts.filter(a => a.status === 'new').length
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
      console.log('Failed to fetch login events:', e)
    } finally {
      setLoadingEvents(false)
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
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
        </TabsList>

        {/* Tab 1: Overview - Platform Health */}
        <TabsContent value="overview" className="space-y-6">
          <PlatformHealth metrics={healthMetrics} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataFreshnessSLATracker slaData={freshnessData} />
            <DataQualityScorecard dimensions={qualityDimensions} />
          </div>
        </TabsContent>

        {/* Tab 2: Roles - Quick Role Switch & Role-Based Access Simulation */}
        <TabsContent value="roles" className="space-y-6">
          {/* Quick Role Switch */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Quick Role Switch
              </CardTitle>
              <CardDescription>
                Instantly switch between roles to test different user experiences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TooltipProvider delayDuration={300}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(Object.keys(ROLE_PERMISSIONS) as Role[]).map((role) => {
                    const Icon = getRoleIcon(role)
                    const isActive = settings.role === role
                    return (
                      <Tooltip key={role}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setRole(role)}
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
                  <Select value={settings.role} onValueChange={(v) => setRole(v as Role)}>
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
                    {ROLE_PERMISSIONS[settings.role].description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-gray-100">User</label>
                  <Select value={settings.userId} onValueChange={setUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(u => u.role === settings.role)
                        .slice(0, 10)
                        .map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} - {user.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm font-medium mb-2 dark:text-gray-100">Current Access Scope</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Role</div>
                    <div className="font-medium dark:text-gray-100">{ROLE_PERMISSIONS[settings.role].label}</div>
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
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">View:</span>
                    {ROLE_PERMISSIONS[settings.role].canView.map(v => (
                      <Badge key={v} variant="outline" className="text-xs">{v.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Edit:</span>
                    {ROLE_PERMISSIONS[settings.role].canEdit.map(e => (
                      <Badge key={e} variant="secondary" className="text-xs">{e.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: SLAs */}
        <TabsContent value="slas">
          <DataFreshnessSLATracker slaData={freshnessData} />
        </TabsContent>

        {/* Tab 4: Adoption */}
        <TabsContent value="adoption">
          <UserAdoption metrics={adoptionMetrics} />
        </TabsContent>

        {/* Tab 5: Quality */}
        <TabsContent value="quality">
          <DataQualityScorecard dimensions={qualityDimensions} />
        </TabsContent>

        {/* Tab 6: Schema */}
        <TabsContent value="schema">
          <SchemaChangeAlerts alerts={schemaAlerts} />
        </TabsContent>

        {/* Tab 7: Anomalies */}
        <TabsContent value="anomalies">
          <AnomalyDetection alerts={anomalyAlerts} />
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
        </TabsContent>

        {/* Tab 9: Data Sources */}
        <TabsContent value="datasources" className="space-y-6">
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
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Data Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <div className="text-2xl font-bold dark:text-gray-100">{markets.length}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Markets</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <div className="text-2xl font-bold dark:text-gray-100">{users.length}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Users</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <div className="text-2xl font-bold dark:text-gray-100">1,500</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Accounts</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <div className="text-2xl font-bold dark:text-gray-100">2,500</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Opportunities</div>
                </div>
              </div>
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
      </Tabs>

      {/* Footer */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
        Last refreshed: {lastRefresh.toLocaleTimeString()} • Data is mock/synthetic for demonstration
      </div>
    </div>
  )
}
