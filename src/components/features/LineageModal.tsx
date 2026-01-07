"use client"

import { KPIDefinition } from '@/types'
import { getDataSources } from '@/lib/data'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Database, ArrowRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LineageModalProps {
  open: boolean
  onClose: () => void
  kpi: KPIDefinition | null
}

export function LineageModal({ open, onClose, kpi }: LineageModalProps) {
  if (!kpi) return null

  const dataSources = getDataSources()

  const getSourceData = (sourceName: string) => {
    return dataSources.find(s =>
      s.name.toLowerCase().includes(sourceName.toLowerCase()) ||
      sourceName.toLowerCase().includes(s.name.split(' ')[0].toLowerCase())
    )
  }

  const primarySourceData = getSourceData(kpi.primarySource)
  const secondarySourcesData = kpi.secondarySources.map(s => ({
    name: s,
    data: getSourceData(s)
  }))

  const StatusIcon = ({ status }: { status?: string }) => {
    if (status === 'fresh') return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (status === 'stale') return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Lineage: {kpi.name}
          </DialogTitle>
          <DialogDescription>
            Source systems and data flow for this KPI
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Visual Lineage */}
          <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center mb-2">
                <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-xs font-medium">Source Systems</div>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center mb-2">
                <svg className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-xs font-medium">Data Warehouse</div>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center mb-2">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-xs font-medium">KPI</div>
            </div>
          </div>

          {/* Primary Source */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Primary Source</h4>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{kpi.primarySource}</div>
                    <div className="text-xs text-muted-foreground">
                      {primarySourceData?.recordCount.toLocaleString()} records
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={primarySourceData?.status} />
                  <div className="text-right">
                    <Badge variant={primarySourceData?.status === 'fresh' ? 'success' : 'warning'}>
                      {primarySourceData?.status || 'Unknown'}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {primarySourceData?.lastRefresh &&
                        formatDistanceToNow(primarySourceData.lastRefresh, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
              {primarySourceData?.knownIssues && primarySourceData.knownIssues.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1">Known Issues:</div>
                  <ul className="text-xs text-muted-foreground">
                    {primarySourceData.knownIssues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {/* Secondary Sources */}
          {kpi.secondarySources.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Secondary Sources</h4>
              <div className="space-y-2">
                {secondarySourcesData.map((source, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{source.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={source.data?.status} />
                        <Badge variant="outline" className="text-xs">
                          {source.data?.status || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Calculation Notes */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Calculation</h4>
            <code className="text-xs text-muted-foreground whitespace-pre-wrap">
              {kpi.calculationNotes}
            </code>
          </div>

          {/* Refresh Schedule */}
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Refresh Cadence:</span> {kpi.refreshCadence}
            </div>
            <div>
              <span className="font-medium">Owner:</span> {kpi.owner}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
