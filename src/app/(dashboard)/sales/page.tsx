"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { getOpportunities, getUsers, filterByRole } from '@/lib/data'
import { calculateKPIValues, getPipelineByStage, getActionItems } from '@/lib/kpi-calculations'
import { KPICard } from '@/components/features/KPICard'
import { ActionList } from '@/components/features/ActionList'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { TrendingUp, Users, AlertTriangle, ChevronRight, Target } from 'lucide-react'
import { Opportunity, KPIValue } from '@/types'

export default function SalesPage() {
  const { settings } = useAppStore()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [pipelineByStage, setPipelineByStage] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])

  useEffect(() => {
    let opps = getOpportunities()
    opps = filterByRole(opps, settings.role, settings.userId, settings.selectedMarkets) as Opportunity[]
    setOpportunities(opps)
    // Pass role and userId to filter KPI data to user's scope
    setKpiValues(calculateKPIValues(settings.role, settings.userId))
    setPipelineByStage(getPipelineByStage(settings.role, settings.userId))
    setActions(getActionItems(settings.role, settings.userId).filter(a => a.type === 'stalled_opp'))
  }, [settings])

  const salesKpis = ['pipeline_30_60_90', 'win_rate', 'avg_cycle_time_days', 'stalled_opps', 'crm_hygiene_score']

  // Stage conversion data
  const stageLabels: Record<string, string> = {
    prospect: 'Prospect',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
  }

  const funnelData = pipelineByStage.map(stage => ({
    name: stageLabels[stage.stage] || stage.stage,
    value: stage.value,
    count: stage.count,
    // Distinct colors for each stage (with glow support)
    fill: stage.stage === 'prospect' ? '#94a3b8' :      // Gray/Slate
          stage.stage === 'qualified' ? '#3b82f6' :     // Blue
          stage.stage === 'proposal' ? '#f59e0b' :      // Amber/Yellow
          '#22c55e'                                      // Green (Negotiation - closest to close)
  }))

  // Rep performance data
  const users = getUsers().filter(u => u.role === 'rep' || u.role === 'manager')
  const repPerformance = users.slice(0, 10).map((user, index) => {
    const userOpps = opportunities.filter(o => o.ownerId === user.id)
    const stalledOpps = userOpps.filter(o => o.isStalled)
    const stalledValue = stalledOpps.reduce((sum, o) => sum + o.amount, 0)
    const totalPipeline = userOpps.filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
      .reduce((sum, o) => sum + o.amount, 0)

    // Deterministic hygiene score based on user index and stalled count
    const hygieneScore = 95 - (stalledOpps.length * 3) - (index * 2)

    return {
      id: user.id,
      name: user.name,
      title: user.title,
      totalPipeline,
      stalledCount: stalledOpps.length,
      stalledValue,
      hygieneScore: Math.max(60, Math.min(98, hygieneScore)),
    }
  }).sort((a, b) => b.stalledValue - a.stalledValue)

  // At-risk opportunities
  const atRiskOpps = opportunities
    .filter(o => o.isStalled || o.daysInStage > 21)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-sm text-gray-500">Pipeline health, conversion, and rep coaching</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div id="sales-kpi-cards" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {salesKpis.map(slug => {
          const kpiValue = kpiValues.get(slug)
          if (!kpiValue) return null
          return <KPICard key={slug} kpiValue={kpiValue} compact />
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <Card id="pipeline-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Pipeline by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <defs>
                    <filter id="glow-sales" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip content={<ChartTooltip formatter={formatCurrency} />} cursor={false} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-sales)' }}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stalled Opportunities */}
        <ActionList
          actions={actions}
          title="Stalled Opportunities"
          maxItems={6}
          type="stalled_opp"
        />
      </div>

      {/* Rep Coaching Panel */}
      <Card id="conversion-funnel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rep Coaching Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead className="text-right">Pipeline</TableHead>
                <TableHead className="text-right">Stalled Opps</TableHead>
                <TableHead className="text-right">Stalled $</TableHead>
                <TableHead>Hygiene Score</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repPerformance.map(rep => (
                <TableRow key={rep.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rep.name}</div>
                      <div className="text-xs text-gray-500">{rep.title}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(rep.totalPipeline)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={rep.stalledCount > 3 ? 'danger' : rep.stalledCount > 1 ? 'warning' : 'secondary'}>
                      {rep.stalledCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {formatCurrency(rep.stalledValue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={rep.hygieneScore} className="w-20 h-2" />
                      <span className="text-sm">{rep.hygieneScore.toFixed(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {rep.stalledCount > 0 && (
                      <Badge variant="outline" className="text-xs cursor-default" title={`${rep.stalledCount} stalled opportunities`}>
                        {rep.stalledCount} stalled
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* At-Risk Opportunities Table */}
      <Card id="hygiene-score">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            At-Risk Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Days in Stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Risk Reason</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskOpps.map(opp => (
                <TableRow key={opp.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{opp.name}</div>
                      <div className="text-xs text-gray-500">{opp.accountName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{opp.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(opp.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={opp.daysInStage > 21 ? 'text-red-600 font-medium' : ''}>
                      {opp.daysInStage}
                    </span>
                  </TableCell>
                  <TableCell>{opp.ownerName}</TableCell>
                  <TableCell>
                    <Badge variant={opp.daysInStage > 30 ? 'danger' : 'warning'} className="text-xs">
                      {opp.isStalled ? 'Stalled' : 'Aging'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/sales/opportunity/${opp.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
