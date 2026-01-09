"use client"

import { useAppStore, PRESENTER_MODE_CONFIG, ROLE_PERMISSIONS } from '@/store'
import { getMarkets, getUsers, regenerateData } from '@/lib/data'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, Shield, Users, Target, Database, RefreshCw, AlertTriangle, Presentation, ExternalLink } from 'lucide-react'
import { Role, DemoMode, Scenario } from '@/types'
import Link from 'next/link'
import { getDataSourceName, getDataSourceStatus } from '@/services'

export default function SettingsPage() {
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
  const scope = getCurrentUserScope()
  const dataSourceStatus = getDataSourceStatus()

  const handleRefreshData = () => {
    refreshData()
    window.location.reload()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure demo mode, role simulation, and data options</p>
        </div>
      </div>

      {/* Demo Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Demo Mode
          </CardTitle>
          <CardDescription>
            Choose a demo scenario to highlight different aspects of the BI platform
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

      {/* Role Simulation */}
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
                  <SelectItem value="market_director">Market Director</SelectItem>
                  <SelectItem value="region_director">Region Director</SelectItem>
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
              <Select
                value={settings.userId}
                onValueChange={setUserId}
              >
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

      {/* Scenario */}
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

      {/* Data Sources */}
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

      {/* Data Quality */}
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
    </div>
  )
}
