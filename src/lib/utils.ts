import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Safe math utilities to prevent NaN/Infinity
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value)
}

export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (!isValidNumber(numerator) || !isValidNumber(denominator) || denominator === 0) {
    return fallback
  }
  const result = numerator / denominator
  return isValidNumber(result) ? result : fallback
}

export function safePercent(value: number, total: number, fallback: number = 0): number {
  return safeDivide(value, total, fallback)
}

export function safeDeltaPercent(current: number, previous: number, fallback: number = 0): number {
  if (!isValidNumber(current) || !isValidNumber(previous) || previous === 0) {
    return fallback
  }
  return safeDivide(current - previous, previous, fallback)
}

// Clamp a value to a valid range
export function clampValue(value: number, min: number, max: number): number {
  if (!isValidNumber(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function formatCurrency(value: number, placeholder: string = '—'): string {
  if (!isValidNumber(value)) return placeholder
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number, decimals: number = 1, placeholder: string = '—'): string {
  if (!isValidNumber(value)) return placeholder
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatDeltaPercent(value: number, decimals: number = 1): string {
  if (!isValidNumber(value)) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number, placeholder: string = '—'): string {
  if (!isValidNumber(value)) return placeholder
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatCompactNumber(value: number, placeholder: string = '—'): string {
  if (!isValidNumber(value)) return placeholder
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
