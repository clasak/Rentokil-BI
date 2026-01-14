'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  Database,
  Link2,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react'

interface SchemaField {
  name: string
  type: string
  nullable: boolean
  null_rate: number
  unique_values_count: number
  sample: unknown[]
  min_value?: number
  max_value?: number
}

interface EntitySchema {
  entity: string
  fields: SchemaField[]
  field_count: number
}

interface Relationship {
  source_entity: string
  source_field: string
  target_entity: string
  target_field: string
  confidence: number
  detection_method: string
}

interface SchemaChange {
  entity: string
  field: string
  change: 'added' | 'removed' | 'type_changed'
  previous_type?: string
  current_type?: string
}

export default function RTXDiscoveryPage() {
  const [entities, setEntities] = useState<EntitySchema[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [changes, setChanges] = useState<SchemaChange[]>([])
  const [loading, setLoading] = useState(false)
  const [lastDiscovery, setLastDiscovery] = useState<string | null>(null)
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null)

  const fetchSchema = useCallback(async () => {
    try {
      const res = await fetch('/api/rtx/discover')
      const data = await res.json()
      if (data.success) {
        setEntities(data.entities || [])
        setLastDiscovery(data.timestamp)
      }
    } catch (error) {
      console.error('Failed to fetch schema:', error)
    }
  }, [])

  const runDiscovery = async () => {
    setLoading(true)
    setDiscoveryMessage(null)
    try {
      const res = await fetch('/api/rtx/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      })
      const data = await res.json()
      if (data.success) {
        setRelationships(data.relationships || [])
        setChanges(data.changes || [])
        setDiscoveryMessage(data.message)
        await fetchSchema()
      } else {
        setDiscoveryMessage(data.message || 'Discovery failed')
      }
    } catch (error) {
      console.error('Discovery failed:', error)
      setDiscoveryMessage('Failed to run discovery')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSchema()
  }, [fetchSchema])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'number':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'boolean':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'datetime':
      case 'date':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'object':
      case 'array':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            RTX Schema Discovery
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Discover and monitor RTX Data Hub schema structure
          </p>
          {lastDiscovery && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last updated: {new Date(lastDiscovery).toLocaleString()}
            </p>
          )}
        </div>
        <Button onClick={runDiscovery} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Discovering...' : 'Run Discovery'}
        </Button>
      </div>

      {/* Discovery Message */}
      {discoveryMessage && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200">{discoveryMessage}</p>
        </div>
      )}

      {/* Schema Changes Alert */}
      {changes.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Schema Changes Detected ({changes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {changes.map((change, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300"
                >
                  <Badge
                    variant={
                      change.change === 'added'
                        ? 'default'
                        : change.change === 'removed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {change.change}
                  </Badge>
                  <code className="font-mono">
                    {change.entity}.{change.field}
                  </code>
                  {change.change === 'type_changed' && (
                    <span className="text-gray-500">
                      ({change.previous_type} → {change.current_type})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Detected Relationships */}
      {relationships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Detected Relationships ({relationships.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relationships.map((rel, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <code className="font-mono text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded">
                    {rel.source_entity}.{rel.source_field}
                  </code>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <code className="font-mono text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded">
                    {rel.target_entity}.{rel.target_field}
                  </code>
                  <Badge
                    variant={rel.confidence > 75 ? 'default' : 'secondary'}
                    className="ml-auto"
                  >
                    {rel.confidence}% confidence
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {rel.detection_method}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entity Schema Cards */}
      {entities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {entities.map((entity) => (
            <Card key={entity.entity}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    {entity.entity}
                  </span>
                  <Badge variant="secondary">{entity.field_count} fields</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">
                          Field
                        </th>
                        <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">
                          Type
                        </th>
                        <th className="text-right py-2 font-medium text-gray-600 dark:text-gray-400">
                          Null %
                        </th>
                        <th className="text-right py-2 font-medium text-gray-600 dark:text-gray-400">
                          Unique
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entity.fields.slice(0, 15).map((field) => (
                        <tr
                          key={field.name}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-2">
                            <code className="font-mono text-xs">
                              {field.name}
                            </code>
                          </td>
                          <td className="py-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getTypeColor(field.type)}`}
                            >
                              {field.type}
                            </Badge>
                          </td>
                          <td className="py-2 text-right">
                            <span
                              className={`flex items-center justify-end gap-1 ${
                                field.null_rate > 50
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : field.null_rate === 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {field.null_rate > 50 && (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              {field.null_rate === 0 && (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              {field.null_rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                            {field.unique_values_count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {entity.fields.length > 15 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      ... and {entity.fields.length - 15} more fields
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Schema Discovered Yet</p>
              <p className="mt-1">
                Click &quot;Run Discovery&quot; to scan RTX Data Hub for available
                entities and fields.
              </p>
              <p className="mt-4 text-sm">
                Note: RTX Data Hub must be configured for discovery to work.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Guide */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-lg">Schema Discovery Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>Run Discovery:</strong> Connects to RTX Data Hub, samples
            records, and analyzes the schema structure.
          </p>
          <p>
            <strong>Type Inference:</strong> Automatically detects field types
            (string, number, date, boolean, etc.) from sample data.
          </p>
          <p>
            <strong>Relationship Detection:</strong> Identifies foreign key
            relationships using naming patterns (e.g., account_id → accounts).
          </p>
          <p>
            <strong>Schema Changes:</strong> Tracks added, removed, or
            type-changed fields between discovery runs.
          </p>
          <p>
            <strong>Null Rate:</strong> Shows percentage of null values - high
            null rates may indicate data quality issues.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
