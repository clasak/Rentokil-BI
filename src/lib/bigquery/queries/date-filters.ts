/**
 * Standardized Date Filter Helpers for BigQuery Queries
 *
 * CRITICAL: All date comparisons MUST use explicit DATE() casting to prevent
 * timezone-related bugs. BigQuery TIMESTAMPs are stored in UTC and can produce
 * unexpected results when compared directly to dates.
 *
 * Example Bug:
 * - BAD:  WHERE timestamp_col >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
 *         ^ timestamp vs date comparison can miss records
 * - GOOD: WHERE DATE(timestamp_col) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
 *         ^ explicit DATE() cast ensures correct comparison
 *
 * Usage:
 * ```typescript
 * const dateFilter = buildDateFilter('received_date', { daysBack: 30 });
 * const sql = `SELECT * FROM table WHERE ${dateFilter}`;
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export interface DateFilterOptions {
  /**
   * Number of days to look back from CURRENT_DATE()
   * Default: 30 days
   */
  daysBack?: number

  /**
   * Start date (inclusive) in 'YYYY-MM-DD' format
   * If provided with endDate, overrides daysBack
   */
  startDate?: string

  /**
   * End date (inclusive) in 'YYYY-MM-DD' format
   * If provided with startDate, overrides daysBack
   */
  endDate?: string

  /**
   * Column data type in BigQuery
   * - 'timestamp': Use DATE(column) for casting (default)
   * - 'date': No casting needed
   * - 'datetime': Use DATE(column) for casting
   */
  columnType?: 'timestamp' | 'date' | 'datetime'
}

export interface YearMonthFilterOptions {
  /**
   * Number of months to look back from current month
   * Default: 12 months
   */
  monthsBack?: number

  /**
   * Specific year-month value (YYYYMM format as number)
   * Example: 202401 for January 2024
   */
  yearMonth?: number

  /**
   * Start year-month (YYYYMM format)
   * If provided with endYearMonth, overrides monthsBack
   */
  startYearMonth?: number

  /**
   * End year-month (YYYYMM format)
   * If provided with startYearMonth, overrides monthsBack
   */
  endYearMonth?: number
}

// =============================================================================
// Date Filter Builders
// =============================================================================

/**
 * Build standardized date filter with proper DATE() casting
 *
 * @param columnName - The column to filter (e.g., 'received_date', 'SellDate')
 * @param options - Filter options (daysBack, startDate/endDate, columnType)
 * @returns SQL WHERE clause fragment (without 'WHERE' keyword)
 *
 * @example
 * // Days back (default 30)
 * buildDateFilter('received_date', { daysBack: 90 })
 * // => "DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)"
 *
 * @example
 * // Date range
 * buildDateFilter('SellDate', { startDate: '2024-01-01', endDate: '2024-12-31' })
 * // => "DATE(SellDate) BETWEEN DATE('2024-01-01') AND DATE('2024-12-31')"
 *
 * @example
 * // DATE column (no casting needed)
 * buildDateFilter('report_date', { daysBack: 7, columnType: 'date' })
 * // => "report_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)"
 */
export function buildDateFilter(
  columnName: string,
  options: DateFilterOptions = {}
): string {
  const { daysBack = 30, startDate, endDate, columnType = 'timestamp' } = options

  // Determine if we need DATE() casting
  const needsCasting = columnType === 'timestamp' || columnType === 'datetime'
  const castColumn = needsCasting ? `DATE(${columnName})` : columnName

  // Explicit date range takes precedence
  if (startDate && endDate) {
    // Validate date format (YYYY-MM-DD)
    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      console.warn(
        `[DateFilter] Invalid date format. Expected YYYY-MM-DD, got: ${startDate}, ${endDate}`
      )
      // Fallback to daysBack
      return `${castColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
    }
    return `${castColumn} BETWEEN DATE('${startDate}') AND DATE('${endDate}')`
  }

  // Days back (relative to today)
  const validatedDaysBack = validateDaysBack(daysBack)
  return `${castColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)`
}

/**
 * Build date filter for today only
 *
 * @param columnName - The column to filter
 * @param columnType - Column data type
 * @returns SQL WHERE clause fragment for current date
 *
 * @example
 * buildTodayFilter('received_date')
 * // => "DATE(received_date) = CURRENT_DATE()"
 */
export function buildTodayFilter(
  columnName: string,
  columnType: 'timestamp' | 'date' | 'datetime' = 'timestamp'
): string {
  const needsCasting = columnType === 'timestamp' || columnType === 'datetime'
  const castColumn = needsCasting ? `DATE(${columnName})` : columnName
  return `${castColumn} = CURRENT_DATE()`
}

/**
 * Build date filter for current month (MTD)
 *
 * @param columnName - The column to filter
 * @param columnType - Column data type
 * @returns SQL WHERE clause fragment for current month
 *
 * @example
 * buildMonthToDateFilter('sold_date')
 * // => "DATE(sold_date) >= DATE_TRUNC(CURRENT_DATE(), MONTH)"
 */
export function buildMonthToDateFilter(
  columnName: string,
  columnType: 'timestamp' | 'date' | 'datetime' = 'timestamp'
): string {
  const needsCasting = columnType === 'timestamp' || columnType === 'datetime'
  const castColumn = needsCasting ? `DATE(${columnName})` : columnName
  return `${castColumn} >= DATE_TRUNC(CURRENT_DATE(), MONTH)`
}

/**
 * Build date filter for current year (YTD)
 *
 * @param columnName - The column to filter
 * @param columnType - Column data type
 * @returns SQL WHERE clause fragment for current year
 *
 * @example
 * buildYearToDateFilter('sold_date')
 * // => "DATE(sold_date) >= DATE_TRUNC(CURRENT_DATE(), YEAR)"
 */
export function buildYearToDateFilter(
  columnName: string,
  columnType: 'timestamp' | 'date' | 'datetime' = 'timestamp'
): string {
  const needsCasting = columnType === 'timestamp' || columnType === 'datetime'
  const castColumn = needsCasting ? `DATE(${columnName})` : columnName
  return `${castColumn} >= DATE_TRUNC(CURRENT_DATE(), YEAR)`
}

/**
 * Build date filter for trailing N months (including current partial month)
 *
 * @param columnName - The column to filter
 * @param months - Number of months to look back (default: 12)
 * @param columnType - Column data type
 * @returns SQL WHERE clause fragment for trailing months
 *
 * @example
 * buildTrailingMonthsFilter('sold_date', 6)
 * // => "DATE(sold_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)"
 */
export function buildTrailingMonthsFilter(
  columnName: string,
  months: number = 12,
  columnType: 'timestamp' | 'date' | 'datetime' = 'timestamp'
): string {
  const validatedMonths = Math.max(1, Math.min(120, Math.floor(months))) // 1-120 months
  const needsCasting = columnType === 'timestamp' || columnType === 'datetime'
  const castColumn = needsCasting ? `DATE(${columnName})` : columnName
  return `${castColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedMonths} MONTH)`
}

// =============================================================================
// Year-Month Filter Builders (for YYYYMM integer columns)
// =============================================================================

/**
 * Build filter for YYYYMM integer columns (e.g., SellDateYearMonth)
 *
 * @param columnName - The YYYYMM column name
 * @param options - Filter options (monthsBack, yearMonth, startYearMonth/endYearMonth)
 * @returns SQL WHERE clause fragment
 *
 * @example
 * buildYearMonthFilter('SellDateYearMonth', { monthsBack: 12 })
 * // => "SellDateYearMonth >= 202401" (if current is 202501)
 *
 * @example
 * buildYearMonthFilter('SellDateYearMonth', { yearMonth: 202401 })
 * // => "SellDateYearMonth = 202401"
 *
 * @example
 * buildYearMonthFilter('SellDateYearMonth', { startYearMonth: 202401, endYearMonth: 202412 })
 * // => "SellDateYearMonth BETWEEN 202401 AND 202412"
 */
export function buildYearMonthFilter(
  columnName: string,
  options: YearMonthFilterOptions = {}
): string {
  const { monthsBack = 12, yearMonth, startYearMonth, endYearMonth } = options

  // Specific year-month
  if (yearMonth !== undefined) {
    const validated = validateYearMonth(yearMonth)
    return `${columnName} = ${validated}`
  }

  // Year-month range
  if (startYearMonth !== undefined && endYearMonth !== undefined) {
    const validatedStart = validateYearMonth(startYearMonth)
    const validatedEnd = validateYearMonth(endYearMonth)
    return `${columnName} BETWEEN ${validatedStart} AND ${validatedEnd}`
  }

  // Trailing months
  const currentYearMonth = getCurrentYearMonth()
  const startYearMonthCalc = subtractMonths(currentYearMonth, monthsBack)
  return `${columnName} >= ${startYearMonthCalc}`
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate daysBack parameter
 * Enforces reasonable limits to prevent accidental full table scans
 */
function validateDaysBack(daysBack: number): number {
  const days = Math.floor(daysBack)
  if (!Number.isFinite(days) || days < 1) {
    console.warn(`[DateFilter] Invalid daysBack: ${daysBack}, using default 30`)
    return 30
  }
  // Warn if requesting more than 2 years of data
  if (days > 730) {
    console.warn(
      `[DateFilter] Large daysBack value (${days}). Consider using explicit date range for better performance.`
    )
  }
  return Math.min(3650, days) // Max 10 years
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDateFormat(dateString: string): boolean {
  if (typeof dateString !== 'string') return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  // Check if it's a valid date
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Validate year-month integer (YYYYMM format)
 */
function validateYearMonth(yearMonth: number): number {
  const ym = Math.floor(yearMonth)
  if (!Number.isFinite(ym) || ym < 190001 || ym > 209912) {
    console.warn(`[DateFilter] Invalid yearMonth: ${yearMonth}, using current month`)
    return getCurrentYearMonth()
  }
  // Validate month part (01-12)
  const month = ym % 100
  if (month < 1 || month > 12) {
    console.warn(`[DateFilter] Invalid month in yearMonth: ${yearMonth}, using current month`)
    return getCurrentYearMonth()
  }
  return ym
}

/**
 * Get current year-month as YYYYMM integer
 */
function getCurrentYearMonth(): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 0-indexed
  return year * 100 + month
}

/**
 * Subtract months from a YYYYMM integer
 */
function subtractMonths(yearMonth: number, months: number): number {
  const year = Math.floor(yearMonth / 100)
  const month = yearMonth % 100

  let newYear = year
  let newMonth = month - months

  while (newMonth < 1) {
    newMonth += 12
    newYear -= 1
  }

  return newYear * 100 + newMonth
}

// =============================================================================
// Null-Safe Date Filters
// =============================================================================

/**
 * Build date filter that also filters out NULL values
 *
 * @param columnName - The column to filter
 * @param options - Filter options
 * @returns SQL WHERE clause fragment with NULL check
 *
 * @example
 * buildDateFilterWithNull('received_date', { daysBack: 30 })
 * // => "received_date IS NOT NULL AND DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)"
 */
export function buildDateFilterWithNull(
  columnName: string,
  options: DateFilterOptions = {}
): string {
  const dateFilter = buildDateFilter(columnName, options)
  return `${columnName} IS NOT NULL AND ${dateFilter}`
}
