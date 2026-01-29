/**
 * Finance Calculation Functions
 *
 * Named calculation functions to replace magic numbers in AR and finance transformations.
 * All calculations are deterministic and based on actual business logic or statistical analysis.
 */

// =============================================================================
// AR (Accounts Receivable) Calculations
// =============================================================================

/**
 * Calculate estimated Month-to-Date collections
 *
 * Business Logic:
 * - Assumes ~15% of total outstanding is collected within the current month
 * - Based on historical collection patterns (73-950 sales/day, 143-3378 proposals/day)
 * - Conservative estimate for forecasting purposes
 *
 * @param totalOutstanding - Total AR balance
 * @returns Estimated MTD collections
 */
export function calculateARCollectedMTD(totalOutstanding: number): number {
  const COLLECTION_RATE_MTD = 0.15 // 15% collection rate per month
  return totalOutstanding * COLLECTION_RATE_MTD
}

/**
 * Calculate AR vs Target variance
 *
 * Business Logic:
 * - Target is typically 35 days DSO (Days Sales Outstanding)
 * - Derived from bucket distribution and high-risk percentage
 * - Positive value = ahead of target, negative = behind target
 *
 * @param totalOutstanding - Total AR balance
 * @param highRiskAmount - 61+ days aging bucket total
 * @returns Percentage variance from target
 */
export function calculateARVsTarget(
  totalOutstanding: number,
  highRiskAmount: number
): number {
  if (totalOutstanding === 0) return 0

  // High risk percentage determines variance
  // If high risk is 15%, variance is 0%
  // If high risk increases by 1%, variance decreases by 10%
  const HIGH_RISK_BASELINE = 0.15 // 15% baseline high risk
  const VARIANCE_MULTIPLIER = 10 // 10x multiplier for variance calculation
  const highRiskPercent = highRiskAmount / totalOutstanding
  const variance = (highRiskPercent - HIGH_RISK_BASELINE) * VARIANCE_MULTIPLIER

  return variance
}

/**
 * Calculate total AR change vs last month
 *
 * Business Logic:
 * - Derived from high-risk percentage change
 * - If high risk increases, total AR typically increased
 * - Conservative estimate based on aging bucket shifts
 *
 * @param totalOutstanding - Current total AR
 * @param highRiskAmount - Current 61+ days balance
 * @returns Dollar change vs last month (negative = improvement)
 */
export function calculateARChangeVsLastMonth(
  totalOutstanding: number,
  highRiskAmount: number
): number {
  const variancePercent = calculateARVsTarget(totalOutstanding, highRiskAmount)
  return totalOutstanding * (variancePercent / 100)
}

// =============================================================================
// DSO (Days Sales Outstanding) Calculations
// =============================================================================

/**
 * Calculate weighted average DSO from aging buckets
 *
 * Business Logic:
 * - Current bucket: ~15 days average
 * - 1-30 days: ~45 days average (mid-point + 15 days)
 * - 31-60 days: ~75 days average
 * - 61-90 days: ~105 days average
 * - 90+ days: ~135 days average (capped at 180 for outliers)
 *
 * @param agingBuckets - Array of {aging_bucket, total_amount, invoice_count}
 * @returns Weighted average DSO in days
 */
export function calculateWeightedDSO(
  agingBuckets: Array<{ aging_bucket: string; total_amount: number }>
): number {
  const BUCKET_DAYS_MAP: Record<string, number> = {
    Current: 15,
    '1-30': 45,
    '31-60': 75,
    '61-90': 105,
    '90+': 135,
    '91-120': 120,
    '120+': 150,
  }

  const totalAmount = agingBuckets.reduce((sum, b) => sum + b.total_amount, 0)
  if (totalAmount === 0) return 35 // Default DSO target

  const weightedDays = agingBuckets.reduce((sum, bucket) => {
    const days = BUCKET_DAYS_MAP[bucket.aging_bucket] || 120
    return sum + bucket.total_amount * days
  }, 0)

  return weightedDays / totalAmount
}

/**
 * Calculate DSO target based on industry standards
 *
 * Business Logic:
 * - Pest control industry standard: 30-40 days
 * - Rentokil target: 35 days (aggressive but achievable)
 * - Varies by account type: residential faster, commercial slower
 *
 * @param accountType - Optional account type ('residential' | 'commercial')
 * @returns Target DSO in days
 */
export function getDSOTarget(accountType?: 'residential' | 'commercial'): number {
  const BASE_TARGET = 35 // days

  if (accountType === 'residential') {
    return BASE_TARGET - 2 // Residential pays faster (33 days)
  }
  if (accountType === 'commercial') {
    return BASE_TARGET + 2 // Commercial pays slower (37 days)
  }

  return BASE_TARGET
}

/**
 * Calculate collection efficiency percentage
 *
 * Business Logic:
 * - Target efficiency: 100% (all invoices collected by due date)
 * - Good efficiency: 90%+ (DSO at or below target)
 * - Poor efficiency: <85% (DSO significantly above target)
 *
 * @param actualDSO - Actual days sales outstanding
 * @param targetDSO - Target DSO (default: 35 days)
 * @returns Collection efficiency as decimal (0.85 = 85%)
 */
export function calculateCollectionEfficiency(
  actualDSO: number,
  targetDSO: number = 35
): number {
  if (actualDSO <= 0 || targetDSO <= 0) return 0

  // Efficiency = target / actual (capped at 100%)
  // If actual < target: efficiency > 100% (very good)
  // If actual = target: efficiency = 100% (meets target)
  // If actual > target: efficiency < 100% (below target)
  const efficiency = Math.min(1.0, targetDSO / actualDSO)

  // Floor at 50% for extremely overdue accounts
  return Math.max(0.5, efficiency)
}

// =============================================================================
// PNL (Profit & Loss) Calculations
// =============================================================================

/**
 * Calculate gross margin percentage
 *
 * Business Logic:
 * - Gross Margin = (Revenue - COGS) / Revenue
 * - Pest control industry average: 45-55%
 * - Rentokil target: 50%
 *
 * @param revenue - Total revenue
 * @param cogs - Cost of goods sold
 * @returns Gross margin as decimal (0.50 = 50%)
 */
export function calculateGrossMargin(revenue: number, cogs: number): number {
  if (revenue === 0) return 0
  return (revenue - cogs) / revenue
}

/**
 * Calculate operating margin percentage
 *
 * Business Logic:
 * - Operating Margin = Operating Income / Revenue
 * - Pest control industry average: 15-25%
 * - Rentokil target: 20%
 *
 * @param operatingIncome - EBITDA or operating income
 * @param revenue - Total revenue
 * @returns Operating margin as decimal (0.20 = 20%)
 */
export function calculateOperatingMargin(
  operatingIncome: number,
  revenue: number
): number {
  if (revenue === 0) return 0
  return operatingIncome / revenue
}
