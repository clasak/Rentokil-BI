import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

export function getDeltaColor(delta: number): string {
  if (delta > 0) return "text-green-600"
  if (delta < 0) return "text-red-600"
  return "text-gray-500"
}

export function getDeltaIcon(delta: number): string {
  if (delta > 0) return "↑"
  if (delta < 0) return "↓"
  return "→"
}

export function getStatusColor(status: 'good' | 'warning' | 'critical' | 'neutral'): string {
  switch (status) {
    case 'good': return 'bg-green-100 text-green-800 border-green-200'
    case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay))
}

export function isOverdue(date: Date): boolean {
  return date < new Date()
}
