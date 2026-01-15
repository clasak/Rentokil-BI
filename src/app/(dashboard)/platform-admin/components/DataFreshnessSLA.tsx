"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Clock, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Database
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getDataFreshnessSLAs, type DataFreshnessSLA as DataFreshnessSLAType } from '@/lib/mock/platformAdminData'

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return <TrendingUp className="h-4 w-4 text-green-500" />
  }
  if (trend === 'down') {
    return <TrendingDown className="h-4 w-4 text-red-500" />
  }
  return <Minus className="h-4 w-4 text-gray-400" />
}

function formatFreshness(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min ago`
  }
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`
  }
  const days = Math.floor(minutes / 1440)
  return `${days}d ago`
}

function SourceBadge({ sourceName }: { sourceName: string }) {
  const colors: Record<string, string> = {
    'Salesforce': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Billing/ERP': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'PestPac': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Workday': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'RTX Hub': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${colors[sourceName] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
      {sourceName}
    </span>
  )
}

export function DataFreshnessSLA() {
  const slaData = getDataFreshnessSLAs()
  const metCount = slaData.filter(s => s.status === 'met').length
  const breachedCount = slaData.filter(s => s.status === 'breached').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Data Freshness SLA Tracker
            </CardTitle>
            <CardDescription>
              Monitoring data sync freshness against defined SLA targets
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">{metCount} Met</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400 font-medium">{breachedCount} Breached</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>SLA Target</TableHead>
              <TableHead>Actual Freshness</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead className="text-right">Last Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slaData.map(sla => (
              <TableRow
                key={sla.id}
                className={sla.status === 'breached' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <SourceBadge sourceName={sla.sourceName} />
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{sla.slaTarget}</span>
                </TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${
                    sla.status === 'breached' ? 'text-red-600 dark:text-red-400' : ''
                  }`}>
                    {formatFreshness(sla.actualFreshnessMinutes)}
                  </span>
                </TableCell>
                <TableCell>
                  {sla.status === 'met' ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Met
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">
                      <XCircle className="h-3 w-3 mr-1" />
                      Breached
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={sla.trend} />
                    <span className="text-xs text-muted-foreground capitalize">{sla.trend}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(sla.lastSync, { addSuffix: true })}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
