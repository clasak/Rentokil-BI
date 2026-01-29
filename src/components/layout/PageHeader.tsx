'use client'

import { Breadcrumb, BreadcrumbItem } from '@/components/ui/breadcrumb'
import { DataSourceBadge, DataSourceStatus } from '@/components/ui/data-source-badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle } from 'lucide-react'

interface PageHeaderProps {
  title: string
  breadcrumbs: BreadcrumbItem[]
  dataSource?: DataSourceStatus
  responseTime?: number
  error?: string
  onRefresh?: () => void
  isLoading?: boolean
  children?: React.ReactNode
}

export function PageHeader({
  title,
  breadcrumbs,
  dataSource,
  responseTime,
  error,
  onRefresh,
  isLoading,
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-2 mb-6">
      <Breadcrumb items={breadcrumbs} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-gray-100">{title}</h1>
        <div className="flex items-center gap-3">
          {dataSource && (
            <DataSourceBadge status={dataSource} responseTime={responseTime} />
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          )}
          {children}
        </div>
      </div>
      {dataSource === 'error' && error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="ml-auto"
            >
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
