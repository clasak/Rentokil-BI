"use client"

import { cn } from '@/lib/utils'
import { HealthStatus } from '@/lib/lead-engine-data'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface StageBadgeProps {
  status: HealthStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showLabel?: boolean
  className?: string
}

const statusConfig: Record<HealthStatus, {
  label: string
  bgColor: string
  textColor: string
  borderColor: string
  icon: typeof CheckCircle
}> = {
  healthy: {
    label: 'Healthy',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-300 dark:border-green-700',
    icon: CheckCircle
  },
  at_risk: {
    label: 'At Risk',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    icon: AlertTriangle
  },
  critical: {
    label: 'Critical',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: XCircle
  }
}

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    iconSize: 'h-3 w-3'
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    iconSize: 'h-4 w-4'
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-base',
    iconSize: 'h-5 w-5'
  }
}

export function StageBadge({
  status,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className
}: StageBadgeProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizes.padding,
        sizes.text,
        className
      )}
    >
      {showIcon && <Icon className={sizes.iconSize} />}
      {showLabel && config.label}
    </span>
  )
}

// Simple dot indicator for compact displays
export function HealthDot({ status, className }: { status: HealthStatus; className?: string }) {
  const colors: Record<HealthStatus, string> = {
    healthy: 'bg-green-500',
    at_risk: 'bg-yellow-500',
    critical: 'bg-red-500'
  }

  return (
    <span
      className={cn(
        'inline-block w-2.5 h-2.5 rounded-full',
        colors[status],
        className
      )}
      title={statusConfig[status].label}
    />
  )
}
