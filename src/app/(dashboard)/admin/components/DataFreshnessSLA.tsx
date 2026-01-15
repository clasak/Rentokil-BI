"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Clock, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle
} from 'lucide-react'
import { DataFreshnessSLA, TrendDirection } from '@/lib/platform-admin-data'

interface DataFreshnessSLATrackerProps {
  slaData: DataFreshnessSLA[]
}

export function DataFreshnessSLATracker({ slaData }: DataFreshnessSLATrackerProps) {
  const metCount = slaData.filter(s => s.status === 'met').length
  const breachedCount = slaData.filter(s => s.status === 'breached').length

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

  const getTrendLabel = (trend: TrendDirection) => {
    switch (trend) {
      case 'up':
        return 'Improving'
      case 'down':
        return 'Degrading'
      default:
        return 'Stable'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Data Freshness SLA Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-3 w-3 mr-1" />
              {metCount} Met
            </Badge>
            {breachedCount > 0 && (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                {breachedCount} Breached
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Source</TableHead>
                <TableHead className="w-[120px]">SLA Target</TableHead>
                <TableHead className="w-[150px]">Actual Freshness</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaData.map((source) => (
                <TableRow key={source.id} className={source.status === 'breached' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                  <TableCell className="font-medium">{source.sourceName}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {source.slaTarget}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className={source.status === 'breached' ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                      {source.actualFreshness}
                    </span>
                  </TableCell>
                  <TableCell>
                    {source.status === 'met' ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Met
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Breached
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(source.trend)}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getTrendLabel(source.trend)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
