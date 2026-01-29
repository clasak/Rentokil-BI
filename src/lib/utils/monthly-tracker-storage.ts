/**
 * Monthly Tracker Storage - localStorage utilities for ISQ and Personal Goal overrides
 *
 * Stores monthly-specific data that can be manually edited by the user:
 * - ISQ (Individual Sales Quota)
 * - Personal Goal
 * - Any manual overrides to calculated values
 */

export interface MonthlyOverrides {
  isq?: number
  personalGoal?: number
  proposalTermite?: number
  proposalContract?: number
  proposalJobWork?: number
  salesTermite?: number
  salesContract?: number
  salesJobWork?: number
}

const STORAGE_PREFIX = 'ae-tracker-monthly'

/**
 * Get the localStorage key for a specific month/year
 */
function getStorageKey(year: number, month: number): string {
  return `${STORAGE_PREFIX}-${year}-${month}`
}

/**
 * Get monthly overrides from localStorage
 * @param year - The year (e.g., 2026)
 * @param month - The month (1-12, where 1 = January)
 * @returns Monthly overrides object or empty object if none exist
 */
export function getMonthlyOverrides(year: number, month: number): MonthlyOverrides {
  if (typeof window === 'undefined') return {}

  try {
    const key = getStorageKey(year, month)
    const stored = localStorage.getItem(key)
    if (!stored) return {}

    return JSON.parse(stored) as MonthlyOverrides
  } catch (error) {
    console.error('[Monthly Storage] Failed to get overrides:', error)
    return {}
  }
}

/**
 * Save monthly overrides to localStorage
 * @param year - The year (e.g., 2026)
 * @param month - The month (1-12)
 * @param overrides - The overrides to save
 */
export function saveMonthlyOverrides(
  year: number,
  month: number,
  overrides: MonthlyOverrides
): void {
  if (typeof window === 'undefined') return

  try {
    const key = getStorageKey(year, month)
    localStorage.setItem(key, JSON.stringify(overrides))
  } catch (error) {
    console.error('[Monthly Storage] Failed to save overrides:', error)
  }
}

/**
 * Update a specific field in monthly overrides
 * @param year - The year
 * @param month - The month (1-12)
 * @param field - The field to update
 * @param value - The new value
 */
export function updateMonthlyOverride(
  year: number,
  month: number,
  field: keyof MonthlyOverrides,
  value: number
): void {
  const current = getMonthlyOverrides(year, month)
  current[field] = value
  saveMonthlyOverrides(year, month, current)
}

/**
 * Clear all monthly overrides for a specific month
 * @param year - The year
 * @param month - The month (1-12)
 */
export function clearMonthlyOverrides(year: number, month: number): void {
  if (typeof window === 'undefined') return

  try {
    const key = getStorageKey(year, month)
    localStorage.removeItem(key)
  } catch (error) {
    console.error('[Monthly Storage] Failed to clear overrides:', error)
  }
}

/**
 * Get all monthly overrides for a year (useful for year-to-date calculations)
 * @param year - The year
 * @returns Array of [month, overrides] tuples
 */
export function getAllMonthlyOverridesForYear(year: number): Array<[number, MonthlyOverrides]> {
  const results: Array<[number, MonthlyOverrides]> = []

  for (let month = 1; month <= 12; month++) {
    const overrides = getMonthlyOverrides(year, month)
    if (Object.keys(overrides).length > 0) {
      results.push([month, overrides])
    }
  }

  return results
}
