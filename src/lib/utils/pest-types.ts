/**
 * Pest Type Utilities
 *
 * Centralized mapping logic for deriving pest types from BigQuery productGroup field.
 * Used across multiple query modules (new-starts.ts, ae.ts) to ensure consistency.
 */

export type PestType =
  | 'General Pest'
  | 'Termite'
  | 'Rodent'
  | 'Wildlife'
  | 'Bed Bug'
  | 'Mosquito'
  | 'Lawn Care'
  | 'Insulation'

/**
 * Map productGroup to standardized pest types
 *
 * ProductGroup examples from BigQuery:
 * - Single: 'General Pest', 'Termite', 'Rodent Control'
 * - Aggregated (from STRING_AGG): 'General Pest, Termite, Rodent Control'
 *
 * @param productGroup - The product group value from BigQuery (W3_Contract_Checker or S0_TMX)
 *                       Can be single value or comma-separated aggregated values
 * @returns Array of standardized pest type names (deduplicated)
 */
export function mapProductGroupToPestTypes(productGroup: string): string[] {
  if (!productGroup) return ['General Pest']

  // Mapping based on common product group values in W3_Contract_Checker
  const mapping: Record<string, string> = {
    'termite': 'Termite',
    'termite control': 'Termite',
    'termite monitoring': 'Termite',
    'rodent': 'Rodent',
    'rodent control': 'Rodent',
    'wildlife': 'Wildlife',
    'wildlife control': 'Wildlife',
    'bed bug': 'Bed Bug',
    'bedbug': 'Bed Bug',
    'mosquito': 'Mosquito',
    'mosquito control': 'Mosquito',
    'lawn': 'Lawn Care',
    'lawn care': 'Lawn Care',
    'insulation': 'Insulation',
    'general pest': 'General Pest',
    'pest control': 'General Pest',
    'commercial': 'General Pest',
    'residential': 'General Pest',
  }

  // Split comma-separated values (handles both single and aggregated productGroups)
  const productGroups = productGroup.split(',').map(pg => pg.trim().toLowerCase())
  const pestTypeSet = new Set<string>()

  for (const pg of productGroups) {
    if (!pg) continue

    // Check for exact matches first
    if (mapping[pg]) {
      pestTypeSet.add(mapping[pg])
      continue
    }

    // Check for partial matches
    let found = false
    for (const [key, pestType] of Object.entries(mapping)) {
      if (pg.includes(key)) {
        pestTypeSet.add(pestType)
        found = true
        break
      }
    }

    // If no match found, add as General Pest
    if (!found) {
      pestTypeSet.add('General Pest')
    }
  }

  // Return deduplicated array, with General Pest as default if empty
  const result = Array.from(pestTypeSet)
  return result.length > 0 ? result : ['General Pest']
}

/**
 * Format pest types for display
 * @param pestTypes - Array of pest type names
 * @returns Comma-separated string
 */
export function formatPestTypes(pestTypes: string[]): string {
  return pestTypes.join(', ')
}

/**
 * Get badge color class for pest type
 * @param pestType - Single pest type name
 * @returns Tailwind CSS class string for badge styling
 */
export function getPestTypeBadgeColor(pestType: string): string {
  const colors: Record<string, string> = {
    'General Pest': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Termite': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Rodent': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    'Wildlife': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Bed Bug': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Mosquito': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Lawn Care': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
    'Insulation': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  }

  return colors[pestType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}
