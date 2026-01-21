import { NextRequest, NextResponse } from 'next/server'
import { rtxClient } from '@/services/rtx-hub'
import { createClient } from '@supabase/supabase-js'
import { validateRTXApiRequest } from '@/lib/auth/rtx-api-auth'

// Types
interface FieldInfo {
  name: string
  type: string
  nullable: boolean
  sample: unknown[]
  null_rate: number
  unique_values_count: number
  min_value?: number
  max_value?: number
}

interface DetectedRelationship {
  source_entity: string
  source_field: string
  target_entity: string
  target_field: string
  confidence: number
  detection_method: 'id_suffix' | 'prefix_match' | 'value_overlap'
}

interface DiscoveredEntity {
  entity: string
  fields: FieldInfo[]
  row_count: number
}

interface SchemaChange {
  entity: string
  field: string
  change: 'added' | 'removed' | 'type_changed'
  previous_type?: string
  current_type?: string
}

interface DiscoverResponse {
  success: boolean
  timestamp: string
  discovered: DiscoveredEntity[]
  changes: SchemaChange[]
  relationships: DetectedRelationship[]
  registered: number
  message?: string
}

interface DiscoverRequest {
  entities?: string[]
  force?: boolean
}

/**
 * Infer field type from sample values
 */
function inferFieldType(values: unknown[]): string {
  const nonNullValues = values.filter(v => v !== null && v !== undefined)

  if (nonNullValues.length === 0) return 'null'

  const sample = nonNullValues[0]

  if (typeof sample === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}T/.test(sample)) return 'datetime'
    if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) return 'date'
    return 'string'
  }

  if (typeof sample === 'number') return 'number'
  if (typeof sample === 'boolean') return 'boolean'
  if (Array.isArray(sample)) return 'array'
  if (typeof sample === 'object') return 'object'

  return 'unknown'
}

/**
 * Analyze sample records to discover schema
 */
function analyzeRecords(records: Record<string, unknown>[]): FieldInfo[] {
  if (!records || records.length === 0) return []

  const fieldMap = new Map<string, { values: unknown[], nullCount: number }>()

  // Collect values for each field across all records
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (!fieldMap.has(key)) {
        fieldMap.set(key, { values: [], nullCount: 0 })
      }
      const field = fieldMap.get(key)!
      field.values.push(value)
      if (value === null || value === undefined) {
        field.nullCount++
      }
    }
  }

  // Build field info with enhanced statistics
  const fields: FieldInfo[] = []
  for (const [name, data] of fieldMap.entries()) {
    const null_rate = (data.nullCount / records.length) * 100
    const nonNullValues = data.values.filter(v => v !== null && v !== undefined)

    // Track unique values (for cardinality analysis)
    const uniqueValues = new Set(nonNullValues.map(v =>
      typeof v === 'object' ? JSON.stringify(v) : String(v)
    ))

    // Track min/max for numeric fields
    const numericValues = nonNullValues.filter(v => typeof v === 'number') as number[]
    let min_value: number | undefined
    let max_value: number | undefined

    if (numericValues.length > 0) {
      min_value = Math.min(...numericValues)
      max_value = Math.max(...numericValues)
    }

    fields.push({
      name,
      type: inferFieldType(data.values),
      nullable: data.nullCount > 0,
      sample: nonNullValues.slice(0, 5), // First 5 non-null samples
      null_rate: Math.round(null_rate * 100) / 100,
      unique_values_count: uniqueValues.size,
      min_value,
      max_value
    })
  }

  return fields.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Detect relationships between entities based on field naming patterns
 */
function detectRelationships(
  entityName: string,
  fields: FieldInfo[],
  allEntities: string[]
): DetectedRelationship[] {
  const relationships: DetectedRelationship[] = []

  for (const field of fields) {
    // Pattern 1: *_id suffix (e.g., account_id → accounts.id)
    if (field.name.endsWith('_id') && field.name !== 'id') {
      const baseEntityName = field.name.replace(/_id$/, '')
      // Try both singular+s and exact match
      const targetEntity = allEntities.find(e =>
        e === baseEntityName + 's' ||
        e === baseEntityName ||
        e === baseEntityName + 'es'
      )

      if (targetEntity) {
        relationships.push({
          source_entity: entityName,
          source_field: field.name,
          target_entity: targetEntity,
          target_field: 'id',
          confidence: 80,
          detection_method: 'id_suffix'
        })
      }
    }

    // Pattern 2: entity_ prefix (e.g., account_owner → employees)
    for (const otherEntity of allEntities) {
      if (otherEntity === entityName) continue

      const singular = otherEntity.replace(/s$/, '').replace(/es$/, '')
      if (field.name.startsWith(`${singular}_`) && !field.name.endsWith('_id')) {
        relationships.push({
          source_entity: entityName,
          source_field: field.name,
          target_entity: otherEntity,
          target_field: 'id',
          confidence: 70,
          detection_method: 'prefix_match'
        })
      }
    }
  }

  // Remove duplicates (prefer higher confidence)
  const uniqueRelationships = relationships.reduce((acc, rel) => {
    const key = `${rel.source_entity}.${rel.source_field}->${rel.target_entity}`
    if (!acc.has(key) || acc.get(key)!.confidence < rel.confidence) {
      acc.set(key, rel)
    }
    return acc
  }, new Map<string, DetectedRelationship>())

  return Array.from(uniqueRelationships.values())
}

/**
 * POST /api/rtx/discover
 * Discover and register RTX Data Hub schema
 *
 * Used by: OPS-RTX-INTAKE-001 workflow (daily or on first connect)
 *
 * Request body:
 * {
 *   entities?: string[],  // Specific entities to discover, or all if omitted
 *   force?: boolean       // Force rediscovery even if recently done
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<DiscoverResponse>> {
  // Validate authentication
  const auth = validateRTXApiRequest(request)
  if (!auth.valid) return auth.error!

  const timestamp = new Date().toISOString()

  // Check if RTX is configured
  if (!rtxClient.isConfigured()) {
    return NextResponse.json({
      success: false,
      timestamp,
      discovered: [],
      changes: [],
      relationships: [],
      registered: 0,
      message: 'RTX Data Hub not configured. Set RTX_API_ENDPOINT and RTX_API_KEY environment variables.'
    }, { status: 200 })
  }

  // Parse request body
  let body: DiscoverRequest = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is fine, use defaults
  }

  const { entities: requestedEntities, force = false } = body

  // Default entities to discover
  const defaultEntities = ['accounts', 'opportunities', 'service_events', 'invoices', 'employees']
  const entitiesToDiscover = requestedEntities && requestedEntities.length > 0
    ? requestedEntities
    : defaultEntities

  const discovered: DiscoveredEntity[] = []
  const changes: SchemaChange[] = []
  let registered = 0

  // Get Supabase client for schema registry
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let supabase: ReturnType<typeof createClient> | null = null
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
  }

  // Get existing schema for comparison
  const existingSchema = new Map<string, Map<string, { type: string }>>()

  if (supabase && !force) {
    try {
      const { data: schemaData } = await supabase
        .from('rtx_schema_registry')
        .select('entity_name, field_name, field_type')

      if (schemaData) {
        for (const row of schemaData as { entity_name: string; field_name: string; field_type: string }[]) {
          if (!existingSchema.has(row.entity_name)) {
            existingSchema.set(row.entity_name, new Map())
          }
          existingSchema.get(row.entity_name)!.set(row.field_name, { type: row.field_type })
        }
      }
    } catch {
      // Schema registry table may not exist yet
    }
  }

  // Discover each entity
  for (const entityName of entitiesToDiscover) {
    try {
      // Fetch sample records from RTX
      // In production, this would call the actual RTX API
      // For now, we simulate with mock data structure
      let sampleRecords: Record<string, unknown>[] = []

      // Map entity names to RTX client methods
      switch (entityName) {
        case 'accounts':
          // Would call: const accounts = await rtxClient.getAccounts()
          // For now, return empty to indicate discovery attempted
          break
        case 'opportunities':
          // Would call: const opps = await rtxClient.getOpportunities()
          break
        case 'service_events':
          // Would call: const events = await rtxClient.getServiceEvents()
          break
        case 'invoices':
          // Would call: const invoices = await rtxClient.getInvoices()
          break
        case 'employees':
          // Would call: const users = await rtxClient.getUsers()
          break
        default:
          // Unknown entity, skip
          continue
      }

      // Analyze records to discover schema
      const fields = analyzeRecords(sampleRecords)

      discovered.push({
        entity: entityName,
        fields,
        row_count: sampleRecords.length
      })

      // Detect schema changes
      const existingEntitySchema = existingSchema.get(entityName)
      const currentFieldNames = new Set(fields.map(f => f.name))

      if (existingEntitySchema) {
        // Check for removed fields
        for (const [fieldName] of existingEntitySchema) {
          if (!currentFieldNames.has(fieldName)) {
            changes.push({
              entity: entityName,
              field: fieldName,
              change: 'removed'
            })
          }
        }

        // Check for added or type-changed fields
        for (const field of fields) {
          const existingField = existingEntitySchema.get(field.name)
          if (!existingField) {
            changes.push({
              entity: entityName,
              field: field.name,
              change: 'added'
            })
          } else if (existingField.type !== field.type) {
            changes.push({
              entity: entityName,
              field: field.name,
              change: 'type_changed',
              previous_type: existingField.type,
              current_type: field.type
            })
          }
        }
      } else {
        // All fields are new for this entity
        for (const field of fields) {
          changes.push({
            entity: entityName,
            field: field.name,
            change: 'added'
          })
        }
      }

      // Register fields in database using batch upsert
      if (supabase && fields.length > 0) {
        try {
          const existingEntityFields = existingSchema.get(entityName)
          const upsertData = fields.map(field => ({
            entity_name: entityName,
            field_name: field.name,
            field_type: field.type,
            is_required: field.null_rate === 0,
            is_nullable: field.nullable,
            null_rate: field.null_rate,
            sample_values: field.sample,
            distinct_count: field.unique_values_count,
            min_value: field.min_value,
            max_value: field.max_value,
            last_seen_at: timestamp,
            // Only set discovered_at for new fields
            ...(existingEntityFields?.has(field.name) ? {} : { discovered_at: timestamp })
          }))

          // Type assertion needed due to dynamic schema generation
          await (supabase.from('rtx_schema_registry') as ReturnType<typeof supabase.from>).upsert(upsertData as Record<string, unknown>[], {
            onConflict: 'entity_name,field_name'
          })
          registered += fields.length
        } catch (error) {
          console.error(`[RTX Discover] Failed to register fields for ${entityName}:`, error)
        }
      }
    } catch (error) {
      console.error(`[RTX Discover] Failed to discover ${entityName}:`, error)
      // Continue with other entities
    }
  }

  // Detect relationships across all discovered entities
  const allEntityNames = discovered.map(d => d.entity)
  const allRelationships: DetectedRelationship[] = []

  for (const entity of discovered) {
    const entityRelationships = detectRelationships(entity.entity, entity.fields, allEntityNames)
    allRelationships.push(...entityRelationships)
  }

  // Log discovery to ops_events
  if (supabase) {
    try {
      await (supabase.from('ops_events') as ReturnType<typeof supabase.from>).insert({
        event_type: changes.length > 0 ? 'rtx_schema_change' : 'rtx_health',
        severity: changes.some(c => c.change === 'removed') ? 'warning' : 'info',
        source: 'rtx',
        route: '/api/rtx/discover',
        message: changes.length > 0
          ? `Schema discovery completed: ${changes.length} changes detected`
          : `Schema discovery completed: ${registered} fields registered`,
        metadata: {
          entities_discovered: discovered.length,
          fields_registered: registered,
          changes: changes.length,
          force
        }
      } as Record<string, unknown>)
    } catch {
      // Best effort logging
    }
  }

  return NextResponse.json({
    success: true,
    timestamp,
    discovered,
    changes,
    relationships: allRelationships,
    registered,
    message: discovered.length === 0
      ? 'RTX API not yet connected. Schema will be discovered when RTX is available.'
      : `Discovered ${discovered.length} entities with ${registered} fields and ${allRelationships.length} relationships.`
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

/**
 * GET /api/rtx/discover
 * Get current schema from registry (read-only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Validate authentication (allow public read for dashboard)
  const auth = validateRTXApiRequest(request, { allowPublicRead: true })
  if (!auth.valid) return auth.error!

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      success: false,
      message: 'Supabase not configured',
      entities: []
    }, { status: 200 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: schemaData, error } = await supabase
      .from('rtx_schema_registry')
      .select('*')
      .order('entity_name')
      .order('field_name')

    if (error) throw error

    // Group by entity
    const entities = new Map<string, FieldInfo[]>()

    for (const row of schemaData || []) {
      if (!entities.has(row.entity_name)) {
        entities.set(row.entity_name, [])
      }
      entities.get(row.entity_name)!.push({
        name: row.field_name,
        type: row.field_type,
        nullable: row.is_nullable,
        sample: row.sample_values || [],
        null_rate: row.null_rate || 0,
        unique_values_count: row.distinct_count || 0,
        min_value: row.min_value,
        max_value: row.max_value
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      entities: Array.from(entities.entries()).map(([name, fields]) => ({
        entity: name,
        fields,
        field_count: fields.length
      }))
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=60',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch schema',
      entities: []
    }, { status: 500 })
  }
}
