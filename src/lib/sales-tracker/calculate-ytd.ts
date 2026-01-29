/**
 * Year-to-Date Calculation Utility
 *
 * Calculates YTD totals from monthly data (January through current month).
 * Used by the sales tracker to show year-to-date progress.
 */

import { MonthlyTotalsDetail, YTDSummary } from '@/types/sales-tracker'

// =============================================================================
// YTD Calculation
// =============================================================================

/**
 * Calculate year-to-date summary from monthly data
 *
 * @param year - The year (e.g., 2026)
 * @param currentMonth - Current month (1-12)
 * @param monthlyData - Array of monthly totals (Jan through current month)
 * @returns YTD summary with totals and progress percentages
 */
export function calculateYTD(
  year: number,
  currentMonth: number,
  monthlyData: MonthlyTotalsDetail[]
): YTDSummary {
  // Initialize YTD summary
  const ytd: YTDSummary = {
    year,
    currentMonth,
    // Proposals YTD
    ytdProposalTermite: 0,
    ytdProposalContract: 0,
    ytdProposalJobWork: 0,
    ytdProposalGrandTotal: 0,
    ytdProposalsCount: 0,
    // Sales YTD
    ytdSalesTermite: 0,
    ytdSalesContract: 0,
    ytdSalesJobWork: 0,
    ytdSalesGrandTotal: 0,
    ytdSalesCount: 0,
    ytdStartedSalesCount: 0,
    // Goals YTD
    ytdISQ: 0,
    ytdPersonalGoal: 0,
    // Progress (calculated at end)
    ytdGoalProgress: 0,
    ytdISQProgress: 0,
  }

  // Sum all months from January through current month
  for (let month = 1; month <= currentMonth; month++) {
    const data = monthlyData.find(m => m.month === month)
    if (!data) continue

    // Proposals
    ytd.ytdProposalTermite += data.proposalTermite
    ytd.ytdProposalContract += data.proposalContract
    ytd.ytdProposalJobWork += data.proposalJobWork
    ytd.ytdProposalGrandTotal += data.proposalGrandTotal
    ytd.ytdProposalsCount += data.totalProposalsCount

    // Sales
    ytd.ytdSalesTermite += data.salesTermite
    ytd.ytdSalesContract += data.salesContract
    ytd.ytdSalesJobWork += data.salesJobWork
    ytd.ytdSalesGrandTotal += data.salesGrandTotal
    ytd.ytdSalesCount += data.totalSalesCount
    ytd.ytdStartedSalesCount += data.totalStartedSalesCount

    // Goals
    ytd.ytdISQ += data.isq
    ytd.ytdPersonalGoal += data.personalGoal
  }

  // Calculate progress percentages
  ytd.ytdGoalProgress = ytd.ytdPersonalGoal > 0
    ? (ytd.ytdSalesGrandTotal / ytd.ytdPersonalGoal) * 100
    : 0

  ytd.ytdISQProgress = ytd.ytdISQ > 0
    ? (ytd.ytdSalesGrandTotal / ytd.ytdISQ) * 100
    : 0

  return ytd
}

/**
 * Get empty YTD summary (for loading states)
 */
export function getEmptyYTD(year: number, currentMonth: number): YTDSummary {
  return {
    year,
    currentMonth,
    ytdProposalTermite: 0,
    ytdProposalContract: 0,
    ytdProposalJobWork: 0,
    ytdProposalGrandTotal: 0,
    ytdProposalsCount: 0,
    ytdSalesTermite: 0,
    ytdSalesContract: 0,
    ytdSalesJobWork: 0,
    ytdSalesGrandTotal: 0,
    ytdSalesCount: 0,
    ytdStartedSalesCount: 0,
    ytdISQ: 0,
    ytdPersonalGoal: 0,
    ytdGoalProgress: 0,
    ytdISQProgress: 0,
  }
}

/**
 * Format YTD percentage for display
 */
export function formatYTDPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`
}

/**
 * Get YTD progress status (for badge colors)
 */
export function getYTDProgressStatus(percentage: number): 'danger' | 'warning' | 'success' {
  if (percentage < 75) return 'danger'
  if (percentage < 90) return 'warning'
  return 'success'
}

/**
 * Get YTD progress badge color classes
 */
export function getYTDProgressBadgeColor(percentage: number): string {
  const status = getYTDProgressStatus(percentage)

  switch (status) {
    case 'danger':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'warning':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  }
}
