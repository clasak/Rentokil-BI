/**
 * YTD Summary Card Component
 *
 * Displays year-to-date totals for proposals and sales (January through current month).
 * Auto-calculates from monthly data, shows progress against goals.
 */

'use client'

import { YTDSummary, formatCurrency } from '@/types/sales-tracker'
import {
  formatYTDPercentage,
  getYTDProgressBadgeColor,
} from '@/lib/sales-tracker/calculate-ytd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// =============================================================================
// Component Props
// =============================================================================

interface YTDSummaryCardProps {
  ytd: YTDSummary
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function YTDSummaryCard({ ytd, isLoading = false }: YTDSummaryCardProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentMonthName = monthNames[ytd.currentMonth - 1]

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Year-to-Date Summary</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{ytd.year} Year-to-Date</CardTitle>
            <CardDescription>
              January - {currentMonthName}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            YTD Summary
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Proposals YTD */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400">
              Proposals YTD
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Termite:</span>
                <span className="font-medium">{formatCurrency(ytd.ytdProposalTermite)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Contract:</span>
                <span className="font-medium">{formatCurrency(ytd.ytdProposalContract)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Job Work:</span>
                <span className="font-medium">{formatCurrency(ytd.ytdProposalJobWork)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t dark:border-gray-700">
                <span className="font-semibold">Grand Total:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(ytd.ytdProposalGrandTotal)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Count:</span>
                <span>{ytd.ytdProposalsCount} proposals</span>
              </div>
            </div>
          </div>

          {/* Sales YTD */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400">
              Sales YTD
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Termite:</span>
                <span className="font-medium">{formatCurrency(ytd.ytdSalesTermite)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Contract:</span>
                <span className="font-medium">{formatCurrency(ytd.ytdSalesContract)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Job Work:</span>
                <span className="font-medium">{formatCurrency(ytd.ytdSalesJobWork)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t dark:border-gray-700">
                <span className="font-semibold">Grand Total:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(ytd.ytdSalesGrandTotal)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Count:</span>
                <span>{ytd.ytdSalesCount} sales ({ytd.ytdStartedSalesCount} started)</span>
              </div>
            </div>
          </div>

          {/* Goals & Progress */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400">
              Goals & Progress
            </h3>
            <div className="space-y-4">
              {/* Personal Goal Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Personal Goal YTD:</span>
                  <span className="font-medium">{formatCurrency(ytd.ytdPersonalGoal)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progress</span>
                    <Badge className={getYTDProgressBadgeColor(ytd.ytdGoalProgress)}>
                      {formatYTDPercentage(ytd.ytdGoalProgress)}
                    </Badge>
                  </div>
                  <Progress value={Math.min(ytd.ytdGoalProgress, 100)} className="h-2" />
                </div>
              </div>

              {/* ISQ Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">ISQ YTD:</span>
                  <span className="font-medium">{formatCurrency(ytd.ytdISQ)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progress</span>
                    <Badge className={getYTDProgressBadgeColor(ytd.ytdISQProgress)}>
                      {formatYTDPercentage(ytd.ytdISQProgress)}
                    </Badge>
                  </div>
                  <Progress value={Math.min(ytd.ytdISQProgress, 100)} className="h-2" />
                </div>
              </div>

              {/* Actual vs Goal */}
              <div className="pt-2 border-t dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Actual YTD:</span>
                  <span className="font-bold">{formatCurrency(ytd.ytdSalesGrandTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Remaining to Goal:</span>
                  <span>
                    {formatCurrency(Math.max(0, ytd.ytdPersonalGoal - ytd.ytdSalesGrandTotal))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
