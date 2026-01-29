/**
 * Data Access Layer for New Start Operations Data
 *
 * Manages CRUD operations for the new_start_ops_data table in Supabase.
 * Replaces localStorage-based persistence with proper database storage.
 *
 * Key Functions:
 * - getOpsDataForSale: Fetch ops data for a single sale
 * - batchGetOpsData: Fetch ops data for multiple sales (efficient for tables)
 * - createOpsData: Initialize ops record when new start is created
 * - updateOpsData: Update ops data when ops manager edits fields
 */

import { createClient } from '@/lib/supabase/client'
import type { NewStartOpsData, EquipmentDetails, SalesRepSplit } from '@/types/new-start-log'

// Default equipment structure for new records
export const DEFAULT_EQUIPMENT: EquipmentDetails = {
  generalPest: {
    rbsQty: 0,
    mrtQty: 0,
    iltQty: 0,
    doorSweepsQty: 0,
    glueBoardsQty: 0,
    flyLightsQty: 0,
    perimeterSpray: false,
    interiorTreatment: false,
  },
  termite: {
    baitStationsQty: 0,
    liquidTreatment: false,
    monitoringStationsQty: 0,
    drillingRequired: false,
  },
  notes: '',
}

/**
 * Get ops data for a single sale ID
 */
export async function getOpsDataForSale(
  salesId: string,
  bigquerySource: string = 'W3_Contract_Checker'
): Promise<NewStartOpsData | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('new_start_ops_data')
    .select('*')
    .eq('sales_id', salesId)
    .eq('bigquery_source', bigquerySource)
    .single()

  if (error) {
    // PGRST116 = no rows returned (record doesn't exist yet)
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('[new-start-ops] Error fetching ops data:', error)
    throw error
  }

  return data as NewStartOpsData
}

/**
 * Batch fetch ops data for multiple sales IDs
 * More efficient than individual queries when loading table views
 */
export async function batchGetOpsData(
  salesIds: string[],
  bigquerySource: string = 'W3_Contract_Checker'
): Promise<Record<string, NewStartOpsData>> {
  if (salesIds.length === 0) {
    return {}
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('new_start_ops_data')
    .select('*')
    .in('sales_id', salesIds)
    .eq('bigquery_source', bigquerySource)

  if (error) {
    console.error('[new-start-ops] Error batch fetching ops data:', error)
    throw error
  }

  // Convert array to map keyed by sales_id for O(1) lookup
  const opsDataMap: Record<string, NewStartOpsData> = {}
  if (data) {
    data.forEach((record) => {
      opsDataMap[record.sales_id] = record as NewStartOpsData
    })
  }

  return opsDataMap
}

/**
 * Create ops data record for a new start
 * Called when AE submits new start or when ops manager first edits
 */
export async function createOpsData(
  salesId: string,
  initialData: Partial<Omit<NewStartOpsData, 'id' | 'sales_id' | 'created_at' | 'updated_at'>>,
  bigquerySource: string = 'W3_Contract_Checker'
): Promise<NewStartOpsData> {
  const supabase = createClient()

  // Get current user for audit trail
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('new_start_ops_data')
    .insert({
      sales_id: salesId,
      bigquery_source: bigquerySource,
      equipment: initialData.equipment || DEFAULT_EQUIPMENT,
      status: initialData.status || 'pending_ops',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      ...initialData,
    })
    .select()
    .single()

  if (error) {
    console.error('[new-start-ops] Error creating ops data:', error)
    throw error
  }

  return data as NewStartOpsData
}

/**
 * Update ops data for an existing sale
 * Called when ops manager edits YELLOW fields
 */
export async function updateOpsData(
  salesId: string,
  updates: Partial<Omit<NewStartOpsData, 'id' | 'sales_id' | 'bigquery_source' | 'created_at' | 'created_by'>>,
  bigquerySource: string = 'W3_Contract_Checker'
): Promise<NewStartOpsData> {
  const supabase = createClient()

  // Get current user for audit trail
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('new_start_ops_data')
    .upsert({
      sales_id: salesId,
      bigquery_source: bigquerySource,
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[new-start-ops] Error updating ops data:', error)
    throw error
  }

  return data as NewStartOpsData
}

/**
 * Delete ops data for a sale (rare - usually only for cleanup)
 */
export async function deleteOpsData(
  salesId: string,
  bigquerySource: string = 'W3_Contract_Checker'
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('new_start_ops_data')
    .delete()
    .eq('sales_id', salesId)
    .eq('bigquery_source', bigquerySource)

  if (error) {
    console.error('[new-start-ops] Error deleting ops data:', error)
    throw error
  }
}

/**
 * Get all ops data with optional filtering
 * Useful for ops manager dashboard views
 */
export async function getAllOpsData(filters?: {
  status?: string
  operationsManager?: string
  assignedSpecialist?: string
  limit?: number
}): Promise<NewStartOpsData[]> {
  const supabase = createClient()

  let query = supabase
    .from('new_start_ops_data')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.operationsManager) {
    query = query.eq('operations_manager', filters.operationsManager)
  }

  if (filters?.assignedSpecialist) {
    query = query.eq('assigned_specialist', filters.assignedSpecialist)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[new-start-ops] Error fetching all ops data:', error)
    throw error
  }

  return (data || []) as NewStartOpsData[]
}

/**
 * Helper: Generate PestPac URL from location number
 */
export function generatePestPacUrl(locationNumber: string): string {
  if (!locationNumber) return ''
  // TODO: Update with actual PestPac URL pattern
  // Example: https://pestpac.com/location/{locationNumber}
  return `https://pestpac.com/location/${locationNumber}`
}

/**
 * Helper: Format sales rep splits for display
 * Example: "Cody Lytle (50%) / Jane Doe (50%)"
 */
export function formatSalesRepSplits(splits: SalesRepSplit[] | null): string {
  if (!splits || splits.length === 0) return ''
  return splits.map(rep => `${rep.name} (${rep.split}%)`).join(' / ')
}

/**
 * Helper: Parse sales rep splits from formatted string
 * Example: "Cody Lytle (50%) / Jane Doe (50%)" -> [{ name: "Cody Lytle", split: 50 }, ...]
 */
export function parseSalesRepSplits(formatted: string): SalesRepSplit[] {
  if (!formatted) return []

  const splits: SalesRepSplit[] = []
  const parts = formatted.split('/')

  parts.forEach(part => {
    const match = part.trim().match(/^(.+)\s*\((\d+)%\)$/)
    if (match) {
      splits.push({
        name: match[1].trim(),
        split: parseInt(match[2], 10),
      })
    }
  })

  return splits
}

/**
 * Helper: Validate sales rep splits sum to 100%
 */
export function validateSalesRepSplits(splits: SalesRepSplit[]): boolean {
  if (splits.length === 0) return false
  const total = splits.reduce((sum, rep) => sum + rep.split, 0)
  return total === 100
}

/**
 * Helper: Get equipment summary for display (e.g., "RBS (5), MRT (3)")
 */
export function getEquipmentSummary(equipment: EquipmentDetails | null | undefined): string {
  if (!equipment) return ''

  const items: string[] = []

  // General Pest equipment
  if (equipment.generalPest.rbsQty > 0) items.push(`RBS (${equipment.generalPest.rbsQty})`)
  if (equipment.generalPest.mrtQty > 0) items.push(`MRT (${equipment.generalPest.mrtQty})`)
  if (equipment.generalPest.iltQty > 0) items.push(`ILT (${equipment.generalPest.iltQty})`)
  if (equipment.generalPest.doorSweepsQty > 0) items.push(`Door Sweeps (${equipment.generalPest.doorSweepsQty})`)
  if (equipment.generalPest.glueBoardsQty > 0) items.push(`Glue Boards (${equipment.generalPest.glueBoardsQty})`)
  if (equipment.generalPest.flyLightsQty > 0) items.push(`Fly Lights (${equipment.generalPest.flyLightsQty})`)
  if (equipment.generalPest.perimeterSpray) items.push('Perimeter Spray')
  if (equipment.generalPest.interiorTreatment) items.push('Interior Treatment')

  // Termite equipment
  if (equipment.termite.baitStationsQty > 0) items.push(`Termite Bait (${equipment.termite.baitStationsQty})`)
  if (equipment.termite.liquidTreatment) items.push('Liquid Treatment')
  if (equipment.termite.monitoringStationsQty > 0) items.push(`Monitoring (${equipment.termite.monitoringStationsQty})`)
  if (equipment.termite.drillingRequired) items.push('Drilling Required')

  return items.length > 0 ? items.join(', ') : 'None'
}

/**
 * Helper: Check if equipment has any items configured
 */
export function hasEquipment(equipment: EquipmentDetails | null | undefined): boolean {
  if (!equipment) return false

  return Boolean(
    equipment.generalPest.rbsQty > 0 ||
    equipment.generalPest.mrtQty > 0 ||
    equipment.generalPest.iltQty > 0 ||
    equipment.generalPest.doorSweepsQty > 0 ||
    equipment.generalPest.glueBoardsQty > 0 ||
    equipment.generalPest.flyLightsQty > 0 ||
    equipment.generalPest.perimeterSpray ||
    equipment.generalPest.interiorTreatment ||
    equipment.termite.baitStationsQty > 0 ||
    equipment.termite.liquidTreatment ||
    equipment.termite.monitoringStationsQty > 0 ||
    equipment.termite.drillingRequired ||
    (equipment.notes && equipment.notes.length > 0)
  )
}
