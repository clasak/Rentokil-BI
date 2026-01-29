/**
 * Business Days Calculation Utilities
 *
 * Calculates business days (Monday-Friday, excluding weekends)
 * for metric calculations like Proposals/Day.
 */

/**
 * Get the number of business days in a given month
 * @param year - The year (e.g., 2026)
 * @param month - The month (0-11, where 0 = January)
 * @returns Number of business days (weekdays) in the month
 */
export function getBusinessDaysInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0) // Last day of the month

  let businessDays = 0

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const currentDay = new Date(year, month, day)
    const dayOfWeek = currentDay.getDay()

    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++
    }
  }

  return businessDays
}

/**
 * Get the number of business days so far in the current month (up to today)
 * @returns Number of business days from start of month to today
 */
export function getBusinessDaysSoFar(): number {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const dayOfMonth = today.getDate()

  let businessDays = 0

  for (let day = 1; day <= dayOfMonth; day++) {
    const currentDay = new Date(year, month, day)
    const dayOfWeek = currentDay.getDay()

    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++
    }
  }

  return businessDays
}

/**
 * Calculate business days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of business days between the two dates
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let businessDays = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++
    }
    current.setDate(current.getDate() + 1)
  }

  return businessDays
}
