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
  RefreshCw, FileText, DollarSign, Clock, AlertTriangle,
  CheckCircle, XCircle, Eye, Send, MessageSquare
} from 'lucide-react'
import {
  generateMockProposalPipeline,
  generateMockProposalSummary,
} from '@/lib/mock/saltiExtendedData'
import type { ProposalPipelineItem, ProposalPipelineSummary, ProposalStatus } from '@/types/salti-extended'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const STATUS_CONFIG: Record<ProposalStatus, { color: string; bgColor: string; icon: React.ReactNode }> = {
  draft: { color: '#6b7280', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: <FileText className="h-4 w-4" /> },
  sent: { color: '#3b82f6', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: <Send className="h-4 w-4" /> },
  viewed: { color: '#8b5cf6', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: <Eye className="h-4 w-4" /> },
  presented: { color: '#f97316', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: <MessageSquare className="h-4 w-4" /> },
  negotiating: { color: '#eab308', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: <MessageSquare className="h-4 w-4" /> },
  accepted: { color: '#22c55e', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: <CheckCircle className="h-4 w-4" /> },
  declined: { color: '#ef4444', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: <XCircle className="h-4 w-4" /> },
  expired: { color: '#9ca3af', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: <Clock className="h-4 w-4" /> },
}

const COLORS = ['#6b7280', '#3b82f6', '#8b5cf6', '#f97316', '#eab308', '#22c55e', '#ef4444', '#9ca3af']

export default function ProposalPipelinePage() {
  const [proposals, setProposals] = useState<ProposalPipelineItem[]>([])
  const [summary, setSummary] = useState<ProposalPipelineSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    setIsLoading(true)
    const data = generateMockProposalPipeline(100)
    const summaryData = generateMockProposalSummary()
    setProposals(data)
    setSummary(summaryData)
    setIsLoading(false)
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      const data = generateMockProposalPipeline(100, `refresh-${Date.now()}`)
      const summaryData = generateMockProposalSummary(`refresh-${Date.now()}`)
      setProposals(data)
      setSummary(summaryData)
      setIsLoading(false)
    }, 500)
  }

  const filteredProposals = useMemo(() => {
    if (selectedStatus === 'all') return proposals
    return proposals.filter(p => p.status === selectedStatus)
  }, [proposals, selectedStatus])

  const statusChartData = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.byStatus).map(([status, data]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      count: data.count,
      value: data.value,
      fill: STATUS_CONFIG[status as ProposalStatus]?.color || '#6b7280',
    }))
  }, [summary])

  const valueByStatusData = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.byStatus)
      .filter(([status]) => !['declined', 'expired'].includes(status))
      .map(([status, data]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        value: data.value,
        fill: STATUS_CONFIG[status as ProposalStatus]?.color || '#6b7280',
      }))
  }, [summary])

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'SALTI', href: '/salti' },
        { label: 'Proposal Pipeline' }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Proposal Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Proposals by status with counts and values
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="presented">Presented</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Proposals</p>
              <p className="text-3xl font-bold">{summary.totalProposals}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-3xl font-bold">${(summary.totalValue / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-3xl font-bold text-green-600">{Math.round(summary.winRate * 100)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Expiring Soon
              </p>
              <p className="text-3xl font-bold text-amber-500">{summary.expiringSoon}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Needs Follow-Up</p>
              <p className="text-3xl font-bold text-blue-600">{summary.needsFollowUp}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(summary.byStatus).map(([status, data]) => {
          const config = STATUS_CONFIG[status as ProposalStatus]
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedStatus(status)}>
              <CardContent className="pt-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor}`}>
                  <div style={{ color: config.color }}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground capitalize">{status}</p>
                    <p className="text-lg font-bold">{data.count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${(data.value / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Count Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Proposal Distribution</CardTitle>
            <CardDescription>Count by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Value by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Value by Stage</CardTitle>
            <CardDescription>Active proposals value (excl. declined/expired)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueByStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" fontSize={11} />
                  <YAxis fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {valueByStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
          <CardDescription>
            {selectedStatus === 'all' ? 'All proposals' : `${selectedStatus} proposals`} ({filteredProposals.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">ID</th>
                  <th className="text-left py-3 px-2 font-medium">Account</th>
                  <th className="text-left py-3 px-2 font-medium">Rep</th>
                  <th className="text-left py-3 px-2 font-medium">Service</th>
                  <th className="text-right py-3 px-2 font-medium">Amount</th>
                  <th className="text-center py-3 px-2 font-medium">Status</th>
                  <th className="text-right py-3 px-2 font-medium">Days Open</th>
                  <th className="text-right py-3 px-2 font-medium">Touches</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.slice(0, 20).map((proposal) => {
                  const config = STATUS_CONFIG[proposal.status]
                  return (
                    <tr key={proposal.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-xs">{proposal.id}</td>
                      <td className="py-3 px-2 font-medium">{proposal.accountName}</td>
                      <td className="py-3 px-2 text-muted-foreground">{proposal.repName}</td>
                      <td className="py-3 px-2">{proposal.serviceType}</td>
                      <td className="py-3 px-2 text-right font-semibold">${proposal.amount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={`capitalize ${config.bgColor}`}
                          style={{ borderColor: config.color, color: config.color }}
                        >
                          {proposal.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={proposal.daysOpen > 30 ? 'text-red-600' : ''}>
                          {proposal.daysOpen}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">{proposal.touchpoints}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredProposals.length > 20 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Showing 20 of {filteredProposals.length} proposals
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
