"use client"

import { useState, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  GitBranch, Plus, Minus, RefreshCw, AlertTriangle,
  CheckCircle, Clock, Eye, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getSchemaChangeAlerts, type SchemaChangeAlert } from '@/lib/mock/platformAdminData'

function ChangeTypeIcon({ type }: { type: SchemaChangeAlert['changeType'] }) {
  const icons = {
    field_added: <Plus className="h-4 w-4 text-green-500" />,
    field_removed: <Minus className="h-4 w-4 text-red-500" />,
    type_changed: <RefreshCw className="h-4 w-4 text-yellow-500" />,
    constraint_changed: <AlertTriangle className="h-4 w-4 text-orange-500" />
  }
  return icons[type]
}

function ChangeTypeBadge({ type }: { type: SchemaChangeAlert['changeType'] }) {
  const styles = {
    field_added: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    field_removed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    type_changed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    constraint_changed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  }

  const labels = {
    field_added: 'Field Added',
    field_removed: 'Field Removed',
    type_changed: 'Type Changed',
    constraint_changed: 'Constraint Changed'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
      <ChangeTypeIcon type={type} />
      {labels[type]}
    </span>
  )
}

function ImpactBadge({ impact }: { impact: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[impact]}`}>
      {impact}
    </span>
  )
}

function StatusBadge({ status }: { status: SchemaChangeAlert['status'] }) {
  const styles = {
    new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    acknowledged: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }

  const icons = {
    new: <Clock className="h-3 w-3" />,
    acknowledged: <Eye className="h-3 w-3" />,
    resolved: <CheckCircle className="h-3 w-3" />
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    'Salesforce': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'PestPac': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Workday': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'RTX Hub': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[source] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
      {source}
    </span>
  )
}

export function SchemaChangeAlerts() {
  const alerts = getSchemaChangeAlerts()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const newCount = alerts.filter(a => a.status === 'new').length
  const highImpactCount = alerts.filter(a => a.impactAssessment === 'high').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Schema Change Alerts
              {newCount > 0 && (
                <Badge variant="destructive" className="ml-2">{newCount} New</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Detected schema changes across connected data sources
            </CardDescription>
          </div>
          {highImpactCount > 0 && (
            <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {highImpactCount} High Impact
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Change Type</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Detected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map(alert => (
              <Fragment key={alert.id}>
                <TableRow
                  className={`cursor-pointer hover:bg-muted/50 ${
                    alert.status === 'new' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                >
                  <TableCell>
                    {expandedId === alert.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={alert.sourceSystem} />
                  </TableCell>
                  <TableCell>
                    <ChangeTypeBadge type={alert.changeType} />
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{alert.fieldName}</code>
                  </TableCell>
                  <TableCell>
                    <ImpactBadge impact={alert.impactAssessment} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={alert.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(alert.detectedAt, { addSuffix: true })}
                  </TableCell>
                </TableRow>
                {expandedId === alert.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-muted/30">
                      <div className="py-3 px-4 space-y-3">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Details</div>
                          <p className="text-sm">{alert.details}</p>
                        </div>
                        {alert.actionRequired && (
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Action Required</div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">{alert.actionRequired}</p>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          {alert.status === 'new' && (
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          {alert.status !== 'resolved' && (
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Resolved
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
