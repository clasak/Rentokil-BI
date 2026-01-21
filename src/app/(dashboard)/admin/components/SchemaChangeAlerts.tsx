"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Database, Plus, Minus, RefreshCw, AlertTriangle,
  CheckCircle, Clock, Eye
} from 'lucide-react'
import {
  SchemaChangeAlert, SchemaChangeType, SchemaChangeStatus, ImpactLevel
} from '@/lib/platform-admin-data'
import { formatDistanceToNow } from 'date-fns'

interface SchemaChangeAlertsProps {
  alerts: SchemaChangeAlert[]
}

export function SchemaChangeAlerts({ alerts }: SchemaChangeAlertsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const newCount = alerts.filter(a => a.status === 'new').length
  const acknowledgedCount = alerts.filter(a => a.status === 'acknowledged').length

  const getChangeTypeIcon = (type: SchemaChangeType) => {
    switch (type) {
      case 'field_added':
        return <Plus className="h-4 w-4 text-green-500" />
      case 'field_removed':
        return <Minus className="h-4 w-4 text-red-500" />
      case 'type_changed':
        return <RefreshCw className="h-4 w-4 text-amber-500" />
      case 'constraint_changed':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
    }
  }

  const getChangeTypeLabel = (type: SchemaChangeType) => {
    switch (type) {
      case 'field_added':
        return 'Field Added'
      case 'field_removed':
        return 'Field Removed'
      case 'type_changed':
        return 'Type Changed'
      case 'constraint_changed':
        return 'Constraint Changed'
    }
  }

  const getStatusBadge = (status: SchemaChangeStatus) => {
    switch (status) {
      case 'new':
        return <Badge variant="destructive">New</Badge>
      case 'acknowledged':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Acknowledged</Badge>
      case 'resolved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Resolved</Badge>
    }
  }

  const getImpactBadge = (level: ImpactLevel) => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High Impact</Badge>
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Medium</Badge>
      case 'low':
        return <Badge variant="outline" className="text-xs">Low</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Schema Change Alerts
            </CardTitle>
            <CardDescription>Detected changes in source system schemas</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {newCount > 0 && (
              <Badge variant="destructive">
                {newCount} New
              </Badge>
            )}
            {acknowledgedCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {acknowledgedCount} Pending
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
                <TableHead className="w-[150px]">Source</TableHead>
                <TableHead className="w-[140px]">Change Type</TableHead>
                <TableHead className="w-[150px]">Field</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <>
                  <TableRow
                    key={alert.id}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      alert.status === 'new' ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                    onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                  >
                    <TableCell className="font-medium">{alert.sourceSystem}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChangeTypeIcon(alert.changeType)}
                        <span className="text-sm">{getChangeTypeLabel(alert.changeType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {alert.fieldName}
                      </code>
                    </TableCell>
                    <TableCell>{getImpactBadge(alert.impactLevel)}</TableCell>
                    <TableCell>{getStatusBadge(alert.status)}</TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </TableCell>
                  </TableRow>
                  {expandedId === alert.id && (
                    <TableRow key={`${alert.id}-expanded`}>
                      <TableCell colSpan={6} className="bg-gray-50 dark:bg-gray-800/50">
                        <div className="p-4 space-y-3">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                              Description
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {alert.description}
                            </p>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                              Impact Assessment
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {alert.impactAssessment}
                            </p>
                          </div>
                          {alert.actionRequired && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Action Required
                              </div>
                              <p className="text-sm text-amber-700 dark:text-amber-300">
                                {alert.actionRequired}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Detected {formatDistanceToNow(alert.detectedAt, { addSuffix: true })}
                            </div>
                            {alert.status === 'new' && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  Acknowledge
                                </Button>
                                <Button size="sm">
                                  Resolve
                                </Button>
                              </div>
                            )}
                            {alert.status === 'acknowledged' && (
                              <Button size="sm">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Resolved
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
