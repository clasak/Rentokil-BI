'use client'

import * as React from 'react'
import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ExportFormat = 'csv' | 'excel' | 'pdf'

export interface ExportOption {
  id: ExportFormat
  label: string
  icon: React.ReactNode
  description?: string
}

export interface ExportButtonProps {
  /** Callback when an export format is selected */
  onExport?: (format: ExportFormat) => void | Promise<void>
  /** Available export formats */
  formats?: ExportFormat[]
  /** Whether the export is currently in progress */
  isLoading?: boolean
  /** Currently loading format (if specific format is loading) */
  loadingFormat?: ExportFormat | null
  /** Whether the button is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost'
  /** Label for the button */
  label?: string
}

const exportOptions: Record<ExportFormat, ExportOption> = {
  csv: {
    id: 'csv',
    label: 'CSV',
    icon: <FileText className="h-4 w-4" />,
    description: 'Comma-separated values',
  },
  excel: {
    id: 'excel',
    label: 'Excel',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    description: 'Microsoft Excel (.xlsx)',
  },
  pdf: {
    id: 'pdf',
    label: 'PDF',
    icon: <FileText className="h-4 w-4" />,
    description: 'Portable Document Format',
  },
}

export default function ExportButton({
  onExport,
  formats = ['csv', 'excel', 'pdf'],
  isLoading = false,
  loadingFormat = null,
  disabled = false,
  className,
  size = 'default',
  variant = 'outline',
  label = 'Export',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false)
    await onExport?.(format)
  }

  const availableOptions = formats.map((format) => exportOptions[format])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isLoading}
          className={cn('gap-2', className)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>{isLoading ? 'Exporting...' : label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        {availableOptions.map((option, index) => (
          <React.Fragment key={option.id}>
            <DropdownMenuItem
              onClick={() => handleExport(option.id)}
              disabled={loadingFormat === option.id}
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {loadingFormat === option.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <span className="text-gray-500 dark:text-gray-400">
                  {option.icon}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
            {index < availableOptions.length - 1 && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
