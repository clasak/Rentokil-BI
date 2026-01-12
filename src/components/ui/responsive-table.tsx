"use client"

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Column definition for responsive table
 */
interface Column<T> {
  /** Unique key for the column */
  key: keyof T | string
  /** Header text */
  header: string
  /** Custom render function */
  render?: (item: T, index: number) => ReactNode
  /** Hide on mobile devices */
  mobileHidden?: boolean
  /** Priority: 1 = always show, 2 = tablet+, 3 = desktop only */
  priority?: 1 | 2 | 3
  /** Column alignment */
  align?: 'left' | 'center' | 'right'
  /** Column width class */
  width?: string
}

interface ResponsiveTableProps<T> {
  /** Data array */
  data: T[]
  /** Column definitions */
  columns: Column<T>[]
  /** Function to extract unique key from item */
  keyExtractor: (item: T, index: number) => string
  /** Click handler for row */
  onRowClick?: (item: T, index: number) => void
  /** Custom mobile card renderer */
  mobileCardRenderer?: (item: T, index: number) => ReactNode
  /** Empty state message */
  emptyMessage?: string
  /** Loading state */
  isLoading?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Responsive table component that renders as cards on mobile
 * and as a traditional table on desktop
 */
export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  mobileCardRenderer,
  emptyMessage = 'No data available',
  isLoading = false,
  className,
}: ResponsiveTableProps<T>) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Get value from item, supporting nested keys like 'user.name'
  const getValue = (item: T, key: keyof T | string): unknown => {
    const keyStr = String(key)
    if (keyStr.includes('.')) {
      return keyStr.split('.').reduce((obj, k) => (obj as Record<string, unknown>)?.[k], item as unknown)
    }
    return (item as Record<string, unknown>)[keyStr]
  }

  // Filter columns based on priority for mobile
  const primaryColumns = columns.filter(c => c.priority === 1 || (!c.priority && !c.mobileHidden))
  const secondaryColumns = columns.filter(c => (c.priority === 2 || c.priority === 3) && !c.mobileHidden)
  const desktopColumns = columns.filter(c => !c.mobileHidden)

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("text-center py-12 text-gray-500 dark:text-gray-400", className)}>
        {emptyMessage}
      </div>
    )
  }

  // Mobile card view
  const renderMobileCards = () => (
    <div className="space-y-3 md:hidden">
      {data.map((item, index) => {
        const key = keyExtractor(item, index)
        const isExpanded = expandedRow === key
        const hasSecondary = secondaryColumns.length > 0

        // Use custom renderer if provided
        if (mobileCardRenderer) {
          return (
            <Card
              key={key}
              className={cn(
                "overflow-hidden",
                onRowClick && "cursor-pointer active:scale-[0.99] transition-transform"
              )}
              onClick={() => onRowClick?.(item, index)}
            >
              <CardContent className="p-4">
                {mobileCardRenderer(item, index)}
              </CardContent>
            </Card>
          )
        }

        // Default card rendering
        return (
          <Card key={key} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Primary info - always visible */}
              <div
                className={cn(
                  "p-4",
                  (onRowClick || hasSecondary) && "cursor-pointer"
                )}
                onClick={() => {
                  if (onRowClick) {
                    onRowClick(item, index)
                  } else if (hasSecondary) {
                    setExpandedRow(isExpanded ? null : key)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    {primaryColumns.map((col) => (
                      <div key={String(col.key)} className={col.key === primaryColumns[0].key ? 'font-medium' : 'text-sm text-gray-600 dark:text-gray-400'}>
                        {col.render
                          ? col.render(item, index)
                          : String(getValue(item, col.key) ?? '')}
                      </div>
                    ))}
                  </div>
                  {!onRowClick && hasSecondary && (
                    <button
                      className="p-1 -m-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable secondary info */}
              {isExpanded && hasSecondary && (
                <div className="px-4 pb-4 pt-0 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    {secondaryColumns.map((col) => (
                      <div key={String(col.key)}>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          {col.header}
                        </div>
                        <div className="text-sm font-medium">
                          {col.render
                            ? col.render(item, index)
                            : String(getValue(item, col.key) ?? '-')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  // Desktop table view
  const renderTable = () => (
    <div className="hidden md:block overflow-auto rounded-lg border dark:border-gray-700">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
            {desktopColumns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  "h-12 px-4 font-medium text-gray-500 dark:text-gray-400",
                  col.align === 'center' && "text-center",
                  col.align === 'right' && "text-right",
                  col.align !== 'center' && col.align !== 'right' && "text-left",
                  col.width
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={keyExtractor(item, index)}
              className={cn(
                "border-b dark:border-gray-700 transition-colors",
                "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(item, index)}
            >
              {desktopColumns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn(
                    "p-4",
                    col.align === 'center' && "text-center",
                    col.align === 'right' && "text-right"
                  )}
                >
                  {col.render
                    ? col.render(item, index)
                    : String(getValue(item, col.key) ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className={className}>
      {renderMobileCards()}
      {renderTable()}
    </div>
  )
}
