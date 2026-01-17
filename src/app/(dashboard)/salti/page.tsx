"use client"

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Target, RefreshCw, Download, Users, TrendingUp,
  BarChart3, Filter, Calendar
} from 'lucide-react'
import {
  getSALTIDashboardData,
  SALTIDashboardData,
} from '@/lib/mock/saltiData'
import { SALTITargetKPIGauge } from '../admin/components/SALTITargetKPIGauge'
import { SALTILeadFunnel } from '../admin/components/SALTILeadFunnel'
import { SALTIFiveTenTwo } from '../admin/components/SALTIFiveTenTwo'
import { SALTISalesResults } from '../admin/components/SALTISalesResults'
import { SALTIPortfolio } from '../admin/components/SALTIPortfolio'
import { SALTIHRMetrics } from '../admin/components/SALTIHRMetrics'

export default function SALTIPage() {
  const { settings } = useAppStore()
  const [data, setData] = useState<SALTIDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMarket, setSelectedMarket] = useState<string>('all')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('mtd')

  useEffect(() => {
    setIsLoading(true)
    // Simulate loading
    const saltiData = getSALTIDashboardData(settings.role, settings.userId)
    setData(saltiData)
    setIsLoading(false)
  }, [settings.role, settings.userId, selectedMarket, selectedTimePeriod])

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      const saltiData = getSALTIDashboardData(settings.role, settings.userId)
      setData(saltiData)
      setIsLoading(false)
    }, 500)
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Admin', href: '/admin' },
        { label: 'SALTI Dashboard' }
      ]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7 text-primary" />
            SALTI Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Sales, Activity, Lead, Target, and Inspection metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filters */}
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="northeast">Northeast</SelectItem>
              <SelectItem value="southeast">Southeast</SelectItem>
              <SelectItem value="midwest">Midwest</SelectItem>
              <SelectItem value="southwest">Southwest</SelectItem>
              <SelectItem value="west">West</SelectItem>
              <SelectItem value="central">Central</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wtd">Week to Date</SelectItem>
              <SelectItem value="mtd">Month to Date</SelectItem>
              <SelectItem value="qtd">Quarter to Date</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Target KPIs Row */}
      {data.targetKPIs && (
        <SALTITargetKPIGauge data={data.targetKPIs} />
      )}

      {/* Lead Funnel */}
      <SALTILeadFunnel data={data.leadFunnel} />

      {/* 5-10-2 Tracker */}
      {data.fiveTenTwo && (
        <SALTIFiveTenTwo data={data.fiveTenTwo} />
      )}

      {/* Tabbed Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Detailed Metrics
          </CardTitle>
          <CardDescription>
            Sales results, portfolio performance, and HR metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales-results" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="sales-results" className="text-xs">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                Sales Results
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="text-xs">
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                Portfolio
              </TabsTrigger>
              <TabsTrigger value="hr" className="text-xs">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                HR Metrics
              </TabsTrigger>
              <TabsTrigger value="yoy" className="text-xs">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                YoY Trends
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales-results" className="mt-6">
              {data.salesResults ? (
                <SALTISalesResults data={data.salesResults} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Sales results not available for your role
                </div>
              )}
            </TabsContent>

            <TabsContent value="portfolio" className="mt-6">
              {data.portfolio ? (
                <SALTIPortfolio data={data.portfolio} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Portfolio metrics not available for your role
                </div>
              )}
            </TabsContent>

            <TabsContent value="hr" className="mt-6">
              {data.hr ? (
                <SALTIHRMetrics data={data.hr} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  HR metrics not available for your role
                </div>
              )}
            </TabsContent>

            <TabsContent value="yoy" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* YoY Summary Cards */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Year over Year Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.salesResults && (
                      <>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">CY vs LYTD</span>
                          <Badge variant={data.salesResults.yoy_variance_pct > 0 ? 'default' : 'destructive'}
                            className={data.salesResults.yoy_variance_pct > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                            {data.salesResults.yoy_variance_pct > 0 ? '+' : ''}{data.salesResults.yoy_variance_pct.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">Started as % of Net</span>
                          <span className="font-semibold">{data.salesResults.started_as_pct_of_net.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">YoY Variance</span>
                          <span className={`font-semibold ${data.salesResults.yoy_variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(data.salesResults.yoy_variance).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Performance Indicators */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Performance Indicators</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.targetKPIs && (
                      <>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">Close Rate</span>
                          <span className="font-semibold">{data.targetKPIs.close_rate.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">Speed to Lead</span>
                          <span className="font-semibold">{data.targetKPIs.speed_to_lead.toFixed(1)} days</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">Bundle Rate</span>
                          <span className="font-semibold">{data.targetKPIs.bundle_rate.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Role Access Note */}
      <div className="text-xs text-muted-foreground text-center">
        Viewing as: {settings.role} | Data scoped to your organizational level
      </div>
    </div>
  )
}
