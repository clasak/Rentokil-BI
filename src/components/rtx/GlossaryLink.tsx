'use client'

import * as React from 'react'
import Link from 'next/link'
import { BookOpen, ExternalLink, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type GlossaryModule =
  | 'sales'
  | 'ops'
  | 'finance'
  | 'people'
  | 'lead-engine'
  | 'forecast'
  | 'governance'

export interface GlossaryLinkProps {
  /** Optional module filter to highlight specific KPIs */
  module?: GlossaryModule
  /** Optional specific KPI slug to navigate to */
  kpiSlug?: string
  /** Link text (defaults to "View Glossary") */
  label?: string
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Visual variant */
  variant?: 'link' | 'button' | 'icon' | 'subtle'
  /** Whether to show an icon */
  showIcon?: boolean
  /** Custom icon to display */
  icon?: 'book' | 'help' | 'external'
  /** Whether the link opens in a new tab */
  openInNewTab?: boolean
}

const moduleLabels: Record<GlossaryModule, string> = {
  sales: 'Sales',
  ops: 'Operations',
  finance: 'Finance',
  people: 'People',
  'lead-engine': 'Lead Engine',
  forecast: 'Forecast',
  governance: 'Governance',
}

export default function GlossaryLink({
  module,
  kpiSlug,
  label,
  className,
  size = 'default',
  variant = 'link',
  showIcon = true,
  icon = 'book',
  openInNewTab = false,
}: GlossaryLinkProps) {
  // Build the URL
  let href = '/governance/kpi-dictionary'
  const params = new URLSearchParams()

  if (module) {
    params.set('module', module)
  }
  if (kpiSlug) {
    params.set('kpi', kpiSlug)
  }

  const queryString = params.toString()
  if (queryString) {
    href += `?${queryString}`
  }

  // Default label based on context
  const displayLabel = label || (module
    ? `${moduleLabels[module]} KPIs`
    : kpiSlug
      ? 'View Definition'
      : 'View Glossary')

  const IconComponent = {
    book: BookOpen,
    help: HelpCircle,
    external: ExternalLink,
  }[icon]

  const sizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base',
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const variantClasses = {
    link: cn(
      'inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400',
      'hover:text-blue-700 dark:hover:text-blue-300',
      'hover:underline underline-offset-2',
      'transition-colors duration-200'
    ),
    button: cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-md',
      'bg-gray-100 dark:bg-gray-800',
      'text-gray-700 dark:text-gray-300',
      'hover:bg-gray-200 dark:hover:bg-gray-700',
      'border border-gray-200 dark:border-gray-700',
      'transition-colors duration-200'
    ),
    icon: cn(
      'inline-flex items-center justify-center p-1.5 rounded-md',
      'text-gray-500 dark:text-gray-400',
      'hover:text-gray-700 dark:hover:text-gray-200',
      'hover:bg-gray-100 dark:hover:bg-gray-800',
      'transition-colors duration-200'
    ),
    subtle: cn(
      'inline-flex items-center gap-1.5',
      'text-gray-500 dark:text-gray-400',
      'hover:text-gray-700 dark:hover:text-gray-200',
      'transition-colors duration-200'
    ),
  }

  const linkProps = openInNewTab
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}

  if (variant === 'icon') {
    return (
      <Link
        href={href}
        className={cn(variantClasses.icon, className)}
        title={displayLabel}
        {...linkProps}
      >
        <IconComponent className={iconSizeClasses[size]} />
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...linkProps}
    >
      {showIcon && (
        <IconComponent className={iconSizeClasses[size]} />
      )}
      <span>{displayLabel}</span>
      {openInNewTab && icon !== 'external' && (
        <ExternalLink className={cn(iconSizeClasses[size], 'opacity-50')} />
      )}
    </Link>
  )
}
