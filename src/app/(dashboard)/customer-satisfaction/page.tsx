"use client"

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Award,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type {
  NPSScore,
  SurveyResponse,
  DetractorAnalysis,
  BranchNPSComparison,
} from '@/lib/bigquery/queries/customer-satisfaction'

// =============================================================================
// Empty State Defaults
// =============================================================================

const EMPTY_NPS: NPSScore[] = []
const EMPTY_RESPONSES: SurveyResponse[] = []
const EMPTY_DETRACTORS: DetractorAnalysis[] = []
const EMPTY_BRANCHES: BranchNPSComparison[] = []

// =============================================================================
// Transform Functions
// =============================================================================

function transformNPSScore(data: NPSScore[]): NPSScore[] {
  return data
}

function transformResponses(data: SurveyResponse[]): SurveyResponse[] {
  return data
}

function transformDetractors(data: DetractorAnalysis[]): DetractorAnalysis[] {
  return data
}

function transformBranches(data: BranchNPSComparison[]): BranchNPSComparison[] {
  return data
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerSatisfactionPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30')

  const daysBack = parseInt(selectedPeriod)

  // Fetch NPS score data
  const {
    data: npsData,
    isLoading: npsLoading,
    dataSource: npsSource,
    responseTime: npsResponseTime,
    refetch: refetchNPS,
  } = useBigQueryData<NPSScore[], NPSScore[]>({
    queryName: 'nps-score',
    filters: { daysBack },
    defaultData: EMPTY_NPS,
    transformBigQueryData: transformNPSScore,
    includeOrgFilters: true, // CSAT data - org-level aggregation
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Fetch recent survey responses
  const {
    data: responsesData,
    isLoading: responsesLoading,
    refetch: refetchResponses,
  } = useBigQueryData<SurveyResponse[], SurveyResponse[]>({
    queryName: 'survey-responses',
    filters: { daysBack, limit: 50 },
    defaultData: EMPTY_RESPONSES,
    transformBigQueryData: transformResponses,
    includeOrgFilters: true, // CSAT data - org-level aggregation
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Fetch detractor analysis
  const {
    data: detractorData,
    isLoading: detractorLoading,
    refetch: refetchDetractors,
  } = useBigQueryData<DetractorAnalysis[], DetractorAnalysis[]>({
    queryName: 'detractor-analysis',
    filters: { daysBack },
    defaultData: EMPTY_DETRACTORS,
    transformBigQueryData: transformDetractors,
    includeOrgFilters: true, // CSAT data - org-level aggregation
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Fetch branch comparison
  const {
    data: branchData,
    isLoading: branchLoading,
    refetch: refetchBranches,
  } = useBigQueryData<BranchNPSComparison[], BranchNPSComparison[]>({
    queryName: 'branch-nps-comparison',
    filters: { daysBack, limit: 20 },
    defaultData: EMPTY_BRANCHES,
    transformBigQueryData: transformBranches,
    includeOrgFilters: true, // CSAT data - org-level aggregation
    includeRoleFilters: false, // Not filtered to individual user
  })

  // Refetch all when period changes
  useEffect(() => {
    refetchNPS()
    refetchResponses()
    refetchDetractors()
    refetchBranches()
  }, [selectedPeriod])

  const handleRefresh = () => {
    refetchNPS()
    refetchResponses()
    refetchDetractors()
    refetchBranches()
  }

  const isLoading = npsLoading || responsesLoading || detractorLoading || branchLoading

  // Calculate current NPS from most recent period
  const currentNPS = useMemo(() => {
    if (npsData.length === 0) return null
    return npsData[0]
  }, [npsData])

  // Get detractors only from responses
  const detractorResponses = useMemo(() => {
    return responsesData.filter((r) => r.nps_category === 'Detractor').slice(0, 10)
  }, [responsesData])

  // Prepare data for distribution pie chart
  const distributionData = useMemo(() => {
    if (!currentNPS) return []
    return [
      { name: 'Promoters', value: currentNPS.promoter_count, color: '#22c55e' },
      { name: 'Passives', value: currentNPS.passive_count, color: '#f59e0b' },
      { name: 'Detractors', value: currentNPS.detractor_count, color: '#ef4444' },
    ].filter((d) => d.value > 0)
  }, [currentNPS])

  // Top 10 and bottom 10 branches
  const topBranches = useMemo(() => branchData.slice(0, 10), [branchData])
  const bottomBranches = useMemo(() => branchData.slice(-10).reverse(), [branchData])

  const getTrendIcon = (trend: string) => {
    if (trend === 'Improving') return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend === 'Declining') return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getNPSColor = (score: number) => {
    if (score >= 50) return 'text-green-600'
    if (score >= 0) return 'text-amber-600'
    return 'text-red-600'
  }

  const getNPSBadge = (score: number) => {
    if (score >= 50) return { label: 'Excellent', variant: 'default' as const, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
    if (score >= 30) return { label: 'Good', variant: 'default' as const, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    if (score >= 0) return { label: 'Fair', variant: 'secondary' as const, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
    return { label: 'Poor', variant: 'secondary' as const, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  }

  if (isLoading && !currentNPS) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Customer Satisfaction' }]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-7 w-7 text-primary" />
            Customer Satisfaction (NPS)
          </h1>
          <p className="text-muted-foreground mt-1">
            Net Promoter Score and customer feedback analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DataSourceBadge status={npsSource} responseTime={npsResponseTime} />
        </div>
      </div>

      {/* Empty State */}
      {!currentNPS && !isLoading && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No survey data available for the selected period</p>
          </CardContent>
        </Card>
      )}

      {/* Summary KPIs */}
      {currentNPS && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">NPS Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className={`text-3xl font-bold ${getNPSColor(currentNPS.nps_score)}`}>
                        {currentNPS.nps_score}
                      </p>
                      <Badge {...getNPSBadge(currentNPS.nps_score)} className={getNPSBadge(currentNPS.nps_score).className}>
                        {getNPSBadge(currentNPS.nps_score).label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <ThumbsUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Promoters</p>
                    <p className="text-2xl font-bold">{currentNPS.promoter_count}</p>
                    <p className="text-xs text-muted-foreground">{currentNPS.promoter_pct.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Minus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Passives</p>
                    <p className="text-2xl font-bold">{currentNPS.passive_count}</p>
                    <p className="text-xs text-muted-foreground">{currentNPS.passive_pct.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <ThumbsDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Detractors</p>
                    <p className="text-2xl font-bold">{currentNPS.detractor_count}</p>
                    <p className="text-xs text-muted-foreground">{currentNPS.detractor_pct.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NPS Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  NPS Trend
                </CardTitle>
                <CardDescription>Monthly NPS score progression</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...npsData].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis fontSize={12} domain={[-100, 100]} />
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="nps_score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        name="NPS"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Response Distribution
                </CardTitle>
                <CardDescription>Promoters, Passives, and Detractors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detractor Analysis */}
          {detractorData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Detractor Analysis
                </CardTitle>
                <CardDescription>Detractors grouped by service category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium">Category</th>
                        <th className="text-right py-3 px-2 font-medium">Detractors</th>
                        <th className="text-right py-3 px-2 font-medium">Avg Score</th>
                        <th className="text-right py-3 px-2 font-medium">% of Total</th>
                        <th className="text-left py-3 px-2 font-medium">Sample Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detractorData.map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-2 font-medium">{item.category}</td>
                          <td className="py-3 px-2 text-right">{item.detractor_count}</td>
                          <td className="py-3 px-2 text-right">
                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              {item.avg_score}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-right">{item.pct_of_detractors.toFixed(1)}%</td>
                          <td className="py-3 px-2 text-muted-foreground text-xs max-w-md truncate">
                            {item.feedback_sample || 'No feedback provided'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Branch Comparison */}
          {branchData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    Top 10 Branches
                  </CardTitle>
                  <CardDescription>Highest NPS scores</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topBranches.map((branch, idx) => (
                      <div
                        key={branch.branch_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-muted-foreground">#{idx + 1}</span>
                          <div>
                            <p className="font-medium">{branch.branch_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {branch.total_responses} responses
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(branch.trend)}
                          <span className={`font-bold ${getNPSColor(branch.nps_score)}`}>
                            {branch.nps_score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bottom Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Bottom 10 Branches
                  </CardTitle>
                  <CardDescription>Needs improvement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {bottomBranches.map((branch, idx) => (
                      <div
                        key={branch.branch_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-muted-foreground">#{branchData.length - idx}</span>
                          <div>
                            <p className="font-medium">{branch.branch_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {branch.total_responses} responses
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(branch.trend)}
                          <span className={`font-bold ${getNPSColor(branch.nps_score)}`}>
                            {branch.nps_score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Detractor Feedback */}
          {detractorResponses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Recent Detractor Feedback
                </CardTitle>
                <CardDescription>Latest customer concerns requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detractorResponses.map((response) => (
                    <div
                      key={response.response_id}
                      className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{response.customer_name}</p>
                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Score: {response.nps_score}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {response.branch_name} • {response.recorded_date}
                          </p>
                        </div>
                      </div>
                      {response.feedback_text && (
                        <p className="text-sm text-muted-foreground italic border-l-2 border-red-500 pl-3">
                          &quot;{response.feedback_text}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
