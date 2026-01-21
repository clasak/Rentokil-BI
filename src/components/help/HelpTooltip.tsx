'use client'

import * as React from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface HelpTooltipProps {
  content: string | React.ReactNode
  title?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children?: React.ReactNode
  className?: string
}

export function HelpTooltip({
  content,
  title,
  side = 'top',
  children,
  className,
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children ? (
            <span className={cn('inline-flex', className)}>{children}</span>
          ) : (
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full',
                className
              )}
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-[300px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        >
          <div className="space-y-1">
            {title && (
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {title}
              </p>
            )}
            {typeof content === 'string' ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {content}
              </p>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {content}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
