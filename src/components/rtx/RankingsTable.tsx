'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatNumber, formatCurrency, formatPercent } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type SortDirection = 'asc' | 'desc' | null
export type ValueFormat = 'number' | 'currency' | 'percent' | 'raw'

export interface RankingItem {
  id: string
  rank: number
  name: string
  value: number
  change?: number
  changePercent?: number
  previousRank?: number
  metadata?: Record<string, unknown>
}

export interface RankingsTableProps {
  /** Data items to display */
  data: RankingItem[]
  /** Title for the table */
  title?: string
  /** Column header for the name field */
  nameLabel?: string
  /** Column header for the value field */
  valueLabel?: string
  /** Format for the value column */
  valueFormat?: ValueFormat
  /** Whether to show the change column */
  showChange?: boolean
  /** Whether to show the rank change indicator */
  showRankChange?: boolean
  /** Maximum number of items to display */
  maxItems?: number
  /** Whether sorting is enabled */
  sortable?: boolean
  /** Default sort column */
  defaultSortColumn?: 'rank' | 'name' | 'value' | 'change'
  /** Default sort direction */
  defaultSortDirection?: SortDirection
  /** Callback when a row is clicked */
  onRowClick?: (item: RankingItem) => void
  /** Additional CSS classes */
  className?: string
  /** Whether to highlight top performers (e.g., top 3) */
  highlightTopN?: number
  /** Empty state message */
  emptyMessage?: string
}

function formatValue(value: number, format: ValueFormat): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return formatPercent(value)
    case 'number':
      return formatNumber(value)
    default:
      return String(value)
  }
}

function getChangeIcon(change: number | undefined) {
  if (change === undefined || change === 0) {
    return <Minus className="h-3.5 w-3.5 text-gray-400" />
  }
  if (change > 0) {
    return <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
  }
  return <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
}

function getRankChangeIndicator(currentRank: number, previousRank: number | undefined) {
  if (previousRank === undefined) return null

  const diff = previousRank - currentRank
  if (diff === 0) return null

  if (diff > 0) {
    return (
      <span className="inline-flex items-center text-xs text-green-600 dark:text-green-400">
        <ChevronUp className="h-3 w-3" />
        {diff}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs text-red-600 dark:text-red-400">
      <ChevronDown className="h-3 w-3" />
      {Math.abs(diff)}
    </span>
  )
}

export default function RankingsTable({
  data,
  title,
  nameLabel = 'Name',
  valueLabel = 'Value',
  valueFormat = 'number',
  showChange = true,
  showRankChange = true,
  maxItems,
  sortable = true,
  defaultSortColumn = 'rank',
  defaultSortDirection = 'asc',
  onRowClick,
  className,
  highlightTopN = 3,
  emptyMessage = 'No data available',
}: RankingsTableProps) {
  const [sortColumn, setSortColumn] = useState<'rank' | 'name' | 'value' | 'change'>(defaultSortColumn)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection)

  const handleSort = (column: 'rank' | 'name' | 'value' | 'change') => {
    if (!sortable) return

    if (sortColumn === column) {
      // Toggle direction or reset
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedData = useMemo(() => {
    let sorted = [...data]

    if (sortDirection && sortColumn) {
      sorted.sort((a, b) => {
        let aVal: number | string
        let bVal: number | string

        switch (sortColumn) {
          case 'rank':
            aVal = a.rank
            bVal = b.rank
            break
          case 'name':
            aVal = a.name.toLowerCase()
            bVal = b.name.toLowerCase()
            break
          case 'value':
            aVal = a.value
            bVal = b.value
            break
          case 'change':
            aVal = a.change ?? 0
            bVal = b.change ?? 0
            break
          default:
            return 0
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    if (maxItems) {
      sorted = sorted.slice(0, maxItems)
    }

    return sorted
  }, [data, sortColumn, sortDirection, maxItems])

  const SortIcon = ({ column }: { column: 'rank' | 'name' | 'value' | 'change' }) => {
    if (!sortable) return null

    if (sortColumn !== column || !sortDirection) {
      return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-gray-400" />
    }

    return sortDirection === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1" />
  }

  const headerClasses = cn(
    'cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800',
    'transition-colors duration-200'
  )

  if (data.length === 0) {
    return (
      <div className={cn('p-8 text-center text-gray-500 dark:text-gray-400', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
      {title && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-gray-800/30">
            <TableHead
              className={cn('w-16', sortable && headerClasses)}
              onClick={() => handleSort('rank')}
            >
              <div className="flex items-center">
                Rank
                <SortIcon column="rank" />
              </div>
            </TableHead>
            <TableHead
              className={cn(sortable && headerClasses)}
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center">
                {nameLabel}
                <SortIcon column="name" />
              </div>
            </TableHead>
            <TableHead
              className={cn('text-right', sortable && headerClasses)}
              onClick={() => handleSort('value')}
            >
              <div className="flex items-center justify-end">
                {valueLabel}
                <SortIcon column="value" />
              </div>
            </TableHead>
            {showChange && (
              <TableHead
                className={cn('w-24 text-right', sortable && headerClasses)}
                onClick={() => handleSort('change')}
              >
                <div className="flex items-center justify-end">
                  Change
                  <SortIcon column="change" />
                </div>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((item) => {
            const isTopN = item.rank <= highlightTopN

            return (
              <TableRow
                key={item.id}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
                  isTopN && 'bg-amber-50/50 dark:bg-amber-900/10'
                )}
                onClick={() => onRowClick?.(item)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold',
                        item.rank === 1 && 'bg-amber-400 text-amber-900',
                        item.rank === 2 && 'bg-gray-300 text-gray-700',
                        item.rank === 3 && 'bg-amber-600 text-amber-100',
                        item.rank > 3 && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      )}
                    >
                      {item.rank}
                    </span>
                    {showRankChange && getRankChangeIndicator(item.rank, item.previousRank)}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-900 dark:text-gray-100">{item.name}</span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatValue(item.value, valueFormat)}
                </TableCell>
                {showChange && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {getChangeIcon(item.change)}
                      <span
                        className={cn(
                          'text-sm',
                          item.change === undefined || item.change === 0
                            ? 'text-gray-400'
                            : item.change > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {item.changePercent !== undefined
                          ? `${item.changePercent >= 0 ? '+' : ''}${(item.changePercent * 100).toFixed(1)}%`
                          : item.change !== undefined
                          ? `${item.change >= 0 ? '+' : ''}${formatNumber(item.change)}`
                          : '-'}
                      </span>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
