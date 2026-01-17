"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Shield, TrendingUp, TrendingDown, Minus, CheckCircle,
  AlertTriangle, Target, Info, RefreshCw, Calendar,
  Database, FileCheck, AlertCircle, XCircle
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'
import {
  getDataQualityScorecard,
  DataQualityDimension,
  TrendDirection
} from '@/lib/platform-admin-data'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const dimensionDescriptions: Record<string, string> = {
  Accuracy: 'Data correctly represents the real-world entity it describes',
  Completeness: 'All required data fields are populated',
  Consistency: 'Data values are consistent across different systems',
  Timeliness: 'Data is available within expected time frames',
  Validity: 'Data conforms to defined formats and business rules',
  Uniqueness: 'No duplicate records exist in the dataset',
}

export default function DataQualityPage() {
  const [dimensions, setDimensions] = useState<DataQualityDimension[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState('30d')

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setDimensions(getDataQualityScorecard())
      setIsLoading(false)
    }, 300)
  }, [timePeriod])

  const getTrendIcon = (trend: TrendDirection) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getScoreColor = (current: number, target: number) => {
    if (current >= target) return 'text-green-600 dark:text-green-400'
    if (current >= target - 5) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getProgressColor = (current: number, target: number) => {
    if (current >= target) return '[&>div]:bg-green-500'
    if (current >= target - 5) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-red-500'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const overallScore = dimensions.reduce((acc, d) => acc + d.currentScore, 0) / dimensions.length
  const metCount = dimensions.filter(d => d.currentScore >= d.targetScore).length

  // Mock trend data
  const trendData = [
    { date: 'Week 1', score: 89.2 },
    { date: 'Week 2', score: 90.1 },
    { date: 'Week 3', score: 89.8 },
    { date: 'Week 4', score: 92.0 },
    { date: 'Week 5', score: 91.5 },
    { date: 'Week 6', score: overallScore },
  ]

  // Mock validation results
  const validationResults = [
    { check: 'Required Fields', status: 'pass', records: 15420, issues: 0 },
    { check: 'Date Format', status: 'pass', records: 15420, issues: 0 },
    { check: 'Referential Integrity', status: 'warning', records: 15420, issues: 23 },
    { check: 'Value Range', status: 'pass', records: 15420, issues: 0 },
  ]

  // Mock issues
  const qualityIssues = [
    { id: 1, severity: 'high', source: 'Salesforce', issue: 'Missing contact email on 234 lead records', created: '2 hours ago' },
    { id: 2, severity: 'medium', source: 'PestPac', issue: 'Service duration inconsistencies in 45 records', created: '5 hours ago' },
    { id: 3, severity: 'low', source: 'ERP', issue: 'Deprecated field still populated', created: '1 day ago' },
  ]

  // Mock source quality
  const sourceQuality = [
    { source: 'Salesforce', score: 94.5, records: 8420, lastSync: '8 min ago' },
    { source: 'PestPac', score: 88.2, records: 12340, lastSync: '23 min ago' },
    { source: 'ERP/Billing', score: 96.1, records: 5680, lastSync: '2h 7m ago' },
    { source: 'Workday', score: 91.3, records: 487, lastSync: '7h ago' },
    { source: 'RTX Hub', score: 93.8, records: 45230, lastSync: '42 min ago' },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Data Quality' }
      ]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Data Quality
            </h1>
            <p className="text-muted-foreground mt-1">
              Enterprise data quality scorecard and monitoring
            </p>
          </div>
          <Badge
            className={
              overallScore >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              overallScore >= 80 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              ''
            }
            variant={overallScore < 80 ? 'destructive' : 'default'}
          >
            {overallScore.toFixed(1)}% Overall
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Score & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Overall Score</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className={`text-5xl font-bold ${getScoreColor(overallScore, 90)}`}>
              {overallScore.toFixed(1)}%
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">+2.3% from last month</span>
            </div>
            <div className="mt-4">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {metCount}/6 targets met
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quality Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[85, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="font-medium">{payload[0].payload.date}</div>
                            <div className="text-lg font-bold">{payload[0].value}%</div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Quality Dimensions
          </CardTitle>
          <CardDescription>6 dimensions of enterprise data quality</CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider delayDuration={300}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dimensions.map((dimension) => (
                <div
                  key={dimension.dimension}
                  className="p-4 bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{dimension.dimension}</span>
                      <UITooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm">{dimensionDescriptions[dimension.dimension]}</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    {getTrendIcon(dimension.trend)}
                  </div>

                  <div className="flex items-end justify-between mb-2">
                    <div className={`text-3xl font-bold ${getScoreColor(dimension.currentScore, dimension.targetScore)}`}>
                      {dimension.currentScore}%
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Target className="h-3 w-3" />
                      {dimension.targetScore}%
                    </div>
                  </div>

                  <Progress
                    value={dimension.currentScore}
                    className={`h-2 ${getProgressColor(dimension.currentScore, dimension.targetScore)}`}
                  />

                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-start gap-2">
                      {dimension.currentScore >= dimension.targetScore ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {dimension.topIssue}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Tabs for detailed views */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="validation" className="w-full">
            <TabsList>
              <TabsTrigger value="validation">
                <CheckCircle className="h-4 w-4 mr-2" />
                Live Validation
              </TabsTrigger>
              <TabsTrigger value="issues">
                <AlertCircle className="h-4 w-4 mr-2" />
                Issues
              </TabsTrigger>
              <TabsTrigger value="sources">
                <Database className="h-4 w-4 mr-2" />
                By Source
              </TabsTrigger>
            </TabsList>

            {/* Validation Tab */}
            <TabsContent value="validation" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {validationResults.map((result) => (
                  <Card key={result.check} className={result.status === 'warning' ? 'border-amber-200 dark:border-amber-800' : ''}>
                    <CardContent className="pt-6 text-center">
                      {result.status === 'pass' ? (
                        <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                      )}
                      <div className="font-medium text-sm">{result.check}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.records.toLocaleString()} records
                      </div>
                      {result.issues > 0 && (
                        <Badge variant="outline" className="mt-2 text-amber-600">
                          {result.issues} issues
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Issues Tab */}
            <TabsContent value="issues" className="mt-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Severity</TableHead>
                      <TableHead className="w-[120px]">Source</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead className="w-[120px]">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qualityIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <Badge
                            variant={issue.severity === 'high' ? 'destructive' : 'outline'}
                            className={
                              issue.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              issue.severity === 'low' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : ''
                            }
                          >
                            {issue.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{issue.source}</TableCell>
                        <TableCell>{issue.issue}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{issue.created}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources" className="mt-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source System</TableHead>
                      <TableHead className="w-[120px]">Quality Score</TableHead>
                      <TableHead className="w-[120px]">Records</TableHead>
                      <TableHead className="w-[120px]">Last Sync</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceQuality.map((source) => (
                      <TableRow key={source.source}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            {source.source}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={getScoreColor(source.score, 90)}>
                              {source.score}%
                            </span>
                            <Progress value={source.score} className="h-1.5 w-16" />
                          </div>
                        </TableCell>
                        <TableCell>{source.records.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{source.lastSync}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
