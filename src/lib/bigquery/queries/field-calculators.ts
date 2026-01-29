/**
 * BigQuery Field Calculators
 *
 * SQL snippets for commonly calculated fields used across modules.
 * These help build queries when source tables don't have all required fields.
 */

// =============================================================================
// Conversion Rate Calculations
// =============================================================================

/**
 * Calculate close rate (sold / total)
 * @param soldField - Field name containing sold count
 * @param totalField - Field name containing total count (or use COUNT(*))
 */
export const closeRate = (soldField: string, totalField: string = 'COUNT(*)') =>
  `ROUND(SAFE_DIVIDE(${soldField}, ${totalField}) * 100, 2) as close_rate`

/**
 * Calculate schedule rate (scheduled / SQL)
 */
export const scheduleRate = (scheduledField: string, sqlField: string) =>
  `ROUND(SAFE_DIVIDE(${scheduledField}, ${sqlField}) * 100, 2) as schedule_rate`

/**
 * Calculate fulfillment rate (inspected / scheduled)
 */
export const fulfillmentRate = (inspectedField: string, scheduledField: string) =>
  `ROUND(SAFE_DIVIDE(${inspectedField}, ${scheduledField}) * 100, 2) as fulfillment_rate`

/**
 * Calculate offer rate (proposed / inspected)
 */
export const offerRate = (proposedField: string, inspectedField: string) =>
  `ROUND(SAFE_DIVIDE(${proposedField}, ${inspectedField}) * 100, 2) as offer_rate`

/**
 * Calculate win rate (sold / proposed)
 */
export const winRate = (soldField: string, proposedField: string) =>
  `ROUND(SAFE_DIVIDE(${soldField}, ${proposedField}) * 100, 2) as win_rate`

/**
 * Calculate conversion rate (converted / total)
 */
export const conversionRate = (convertedField: string, totalField: string = 'COUNT(*)') =>
  `ROUND(SAFE_DIVIDE(${convertedField}, ${totalField}) * 100, 2) as conversion_rate`

// =============================================================================
// Date Calculations
// =============================================================================

/**
 * Calculate days to close
 */
export const daysToClose = (closeDateField: string, startDateField: string) =>
  `DATE_DIFF(DATE(${closeDateField}), DATE(${startDateField}), DAY) as days_to_close`

/**
 * Calculate days in backlog (current date - sale date)
 */
export const daysInBacklog = (saleDateField: string) =>
  `DATE_DIFF(CURRENT_DATE(), DATE(${saleDateField}), DAY) as days_in_backlog`

/**
 * Calculate days to cancel
 */
export const daysToCancel = (cancelDateField: string, startDateField: string) =>
  `DATE_DIFF(DATE(${cancelDateField}), DATE(${startDateField}), DAY) as days_to_cancel`

/**
 * Calculate days pending
 */
export const daysPending = (startDateField: string) =>
  `DATE_DIFF(CURRENT_DATE(), DATE(${startDateField}), DAY) as days_pending`

/**
 * Calculate tenure in days
 */
export const tenureDays = (startDateField: string) =>
  `DATE_DIFF(CURRENT_DATE(), DATE(${startDateField}), DAY) as tenure_days`

/**
 * Calculate tenure in years
 */
export const tenureYears = (startDateField: string) =>
  `ROUND(DATE_DIFF(CURRENT_DATE(), DATE(${startDateField}), DAY) / 365.25, 1) as tenure_years`

// =============================================================================
// Aging Bucket Calculations
// =============================================================================

/**
 * Standard AR aging bucket
 */
export const agingBucket = (daysOutstandingField: string) =>
  `CASE
    WHEN ${daysOutstandingField} <= 30 THEN 'Current'
    WHEN ${daysOutstandingField} <= 60 THEN '31-60 Days'
    WHEN ${daysOutstandingField} <= 90 THEN '61-90 Days'
    ELSE '90+ Days'
  END as aging_bucket`

/**
 * Past due bucket (stricter)
 */
export const pastDueBucket = (daysOutstandingField: string) =>
  `CASE
    WHEN ${daysOutstandingField} <= 0 THEN 'Current'
    WHEN ${daysOutstandingField} <= 30 THEN '1-30 Past Due'
    WHEN ${daysOutstandingField} <= 60 THEN '31-60 Past Due'
    WHEN ${daysOutstandingField} <= 90 THEN '61-90 Past Due'
    ELSE '90+ Past Due'
  END as past_due_bucket`

/**
 * Backlog aging bucket
 */
export const backlogAgingBucket = (daysSinceSold: string) =>
  `CASE
    WHEN ${daysSinceSold} <= 2 THEN 'Within 48hr'
    WHEN ${daysSinceSold} <= 7 THEN '3-7 Days'
    WHEN ${daysSinceSold} <= 14 THEN '8-14 Days'
    ELSE '14+ Days'
  END as backlog_bucket`

// =============================================================================
// Productivity Metrics
// =============================================================================

/**
 * Calculate productivity score (weighted composite)
 * Formula: (inspections + proposals*2 + sales*3) / days worked
 */
export const productivityScore = (
  inspectionsField: string,
  proposalsField: string,
  salesField: string,
  daysField: string
) =>
  `ROUND((${inspectionsField} + ${proposalsField} * 2 + ${salesField} * 3) / NULLIF(${daysField}, 0), 2) as productivity_score`

/**
 * Calculate per-day metric
 */
export const perDay = (totalField: string, daysField: string, metricName: string) =>
  `ROUND(${totalField} / NULLIF(${daysField}, 0), 2) as ${metricName}_per_day`

/**
 * Calculate efficiency score (completed / assigned)
 */
export const efficiencyScore = (completedField: string, assignedField: string) =>
  `ROUND(SAFE_DIVIDE(${completedField}, ${assignedField}) * 100, 2) as efficiency_score`

/**
 * Calculate completion rate
 */
export const completionRate = (completedField: string, totalField: string) =>
  `ROUND(SAFE_DIVIDE(${completedField}, ${totalField}) * 100, 2) as completion_rate`

// =============================================================================
// Financial Calculations
// =============================================================================

/**
 * Calculate average deal size
 */
export const avgDealSize = (revenueField: string, countField: string) =>
  `ROUND(SAFE_DIVIDE(${revenueField}, ${countField}), 2) as avg_deal_size`

/**
 * Calculate YoY change percentage
 */
export const yoyChange = (currentField: string, priorField: string) =>
  `ROUND(SAFE_DIVIDE(${currentField} - ${priorField}, NULLIF(${priorField}, 0)) * 100, 2) as yoy_change`

/**
 * Calculate variance to target
 */
export const varianceToTarget = (actualField: string, targetField: string) =>
  `ROUND(SAFE_DIVIDE(${actualField} - ${targetField}, NULLIF(${targetField}, 0)) * 100, 2) as variance_pct`

/**
 * Calculate revenue per stop
 */
export const revenuePerStop = (revenueField: string, stopsField: string) =>
  `ROUND(SAFE_DIVIDE(${revenueField}, ${stopsField}), 2) as revenue_per_stop`

// =============================================================================
// Ranking Calculations (use in window function context)
// =============================================================================

/**
 * Calculate rank by field
 */
export const rankBy = (orderByField: string, direction: 'ASC' | 'DESC' = 'DESC') =>
  `ROW_NUMBER() OVER (ORDER BY ${orderByField} ${direction}) as rank`

/**
 * Calculate rank within partition
 */
export const rankWithin = (
  partitionField: string,
  orderByField: string,
  direction: 'ASC' | 'DESC' = 'DESC'
) =>
  `ROW_NUMBER() OVER (PARTITION BY ${partitionField} ORDER BY ${orderByField} ${direction}) as rank`

// =============================================================================
// Common SQL Builders
// =============================================================================

/**
 * Build date filter clause
 */
export function buildDateFilter(
  dateField: string,
  daysBack: number,
  isTimestamp: boolean = true
): string {
  const fieldRef = isTimestamp ? `DATE(${dateField})` : dateField
  return `${fieldRef} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
}

/**
 * Build optional filter clause
 */
export function buildOptionalFilter(
  field: string,
  paramName: string,
  value: unknown
): string {
  if (!value) return ''
  return ` AND ${field} = @${paramName}`
}

/**
 * Build COALESCE for null handling
 */
export function coalesce(field: string, defaultValue: string = "'Unknown'"): string {
  return `COALESCE(${field}, ${defaultValue})`
}

/**
 * Build SAFE_DIVIDE for division
 */
export function safeDivide(numerator: string, denominator: string): string {
  return `SAFE_DIVIDE(${numerator}, ${denominator})`
}

/**
 * Build percentage calculation
 */
export function percentage(numerator: string, denominator: string, decimals: number = 2): string {
  return `ROUND(SAFE_DIVIDE(${numerator}, ${denominator}) * 100, ${decimals})`
}
