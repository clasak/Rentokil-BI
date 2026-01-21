"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Download,
  FileSpreadsheet,
  FileText,
  Image,
  Loader2,
  Mail,
  Printer,
} from 'lucide-react'

type ExportFormat = 'excel' | 'csv' | 'pdf' | 'png' | 'email' | 'print'

interface ExportButtonProps {
  onExport: (format: ExportFormat) => Promise<void>
  formats?: ExportFormat[]
  disabled?: boolean
  className?: string
}

const FORMAT_OPTIONS: Record<ExportFormat, { icon: React.ElementType; label: string }> = {
  excel: { icon: FileSpreadsheet, label: 'Export to Excel' },
  csv: { icon: FileText, label: 'Export to CSV' },
  pdf: { icon: FileText, label: 'Export to PDF' },
  png: { icon: Image, label: 'Export as Image' },
  email: { icon: Mail, label: 'Email Report' },
  print: { icon: Printer, label: 'Print' },
}

export function ExportButton({
  onExport,
  formats = ['excel', 'csv', 'pdf'],
  disabled = false,
  className,
}: ExportButtonProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setLoading(format)
    try {
      await onExport(format)
    } finally {
      setLoading(null)
    }
  }

  const primaryFormats = formats.filter(f => ['excel', 'csv', 'pdf'].includes(f))
  const secondaryFormats = formats.filter(f => ['png', 'email', 'print'].includes(f))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || loading !== null}
          className={cn('gap-2', className)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {primaryFormats.map((format) => {
          const { icon: Icon, label } = FORMAT_OPTIONS[format]
          const isLoading = loading === format

          return (
            <DropdownMenuItem
              key={format}
              onClick={() => handleExport(format)}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {label}
            </DropdownMenuItem>
          )
        })}

        {secondaryFormats.length > 0 && primaryFormats.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {secondaryFormats.map((format) => {
          const { icon: Icon, label } = FORMAT_OPTIONS[format]
          const isLoading = loading === format

          return (
            <DropdownMenuItem
              key={format}
              onClick={() => handleExport(format)}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple export button without dropdown
interface SimpleExportButtonProps {
  onExport: () => Promise<void>
  format?: ExportFormat
  disabled?: boolean
  className?: string
}

export function SimpleExportButton({
  onExport,
  format = 'excel',
  disabled = false,
  className,
}: SimpleExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const { icon: Icon, label } = FORMAT_OPTIONS[format]

  const handleExport = async () => {
    setLoading(true)
    try {
      await onExport()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || loading}
      className={cn('gap-2', className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {label}
    </Button>
  )
}
