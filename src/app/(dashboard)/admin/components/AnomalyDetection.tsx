"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, AlertCircle, Info, Clock, Brain,
  ChevronDown, ChevronUp, CheckCircle, ExternalLink
} from 'lucide-react'
import { AnomalyAlert, AnomalySeverity } from '@/lib/platform-admin-data'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface AnomalyDetectionProps {
  alerts: AnomalyAlert[]
}

export function AnomalyDetection({ alerts }: AnomalyDetectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length

  const getSeverityIcon = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Warning</Badge>
      case 'info':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Info</Badge>
    }
  }

  const getCardStyle = (severity: AnomalySeverity, acknowledged: boolean) => {
    if (acknowledged) {
      return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-75'
    }
    switch (severity) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI-Detected Anomalies
            </CardTitle>
            <CardDescription>Automated detection of data and metric anomalies</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {warningCount} Warnings
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border rounded-lg transition-all ${getCardStyle(alert.severity, alert.acknowledged)}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(alert.severity)}
                      {alert.acknowledged && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(alert.detectedAt, { addSuffix: true })}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {alert.description}
                  </p>

                  <button
                    onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    {expandedId === alert.id ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Hide details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Show details
                      </>
                    )}
                  </button>

                  {expandedId === alert.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Likely Cause
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {alert.likelyCause}
                        </p>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Affected KPIs
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {alert.affectedKpis.map((kpi) => (
                            <Link
                              key={kpi}
                              href={`/kpi/${kpi}`}
                              className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                            >
                              <code>{kpi}</code>
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            </Link>
                          ))}
                        </div>
                      </div>

                      {!alert.acknowledged && (
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline">
                            Acknowledge
                          </Button>
                          <Button size="sm">
                            Investigate
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
