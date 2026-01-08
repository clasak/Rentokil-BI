"use client"

import { TooltipProps } from 'recharts'

interface ChartTooltipProps extends TooltipProps<number, string> {
  formatter?: (value: number, name?: string) => string
  valueLabel?: string
}

export function ChartTooltip({ active, payload, label, formatter, valueLabel }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const isDark = document.documentElement.classList.contains('dark')

  return (
    <div
      style={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: isDark
          ? '0 0 20px rgba(255, 255, 255, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.3)'
          : '0 0 15px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      {label && (
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
          {label}
        </p>
      )}
      {payload.map((entry, index) => {
        const value = entry.value as number
        const name = entry.name as string || valueLabel || ''
        const formattedValue = formatter ? formatter(value, name) : value.toLocaleString()

        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {entry.color && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                }}
              />
            )}
            <span style={{ color: isDark ? '#f3f4f6' : '#111827', fontWeight: 600 }}>
              {formattedValue}
            </span>
            {name && (
              <span style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>
                {name}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
