/**
 * Test Mode Scenarios
 * Predefined data scenarios for testing dashboard behavior with edge cases,
 * threshold states, and various data conditions.
 */

// Re-export the type from store for convenience
export type TestScenario = 'healthy' | 'critical' | 'warning' | 'empty' | 'max_values' | 'growth_spike'

export interface ScenarioConfig {
  name: string
  description: string
  multipliers: {
    revenue: number
    counts: number
    rates: number
  }
  statusOverride: 'good' | 'warning' | 'critical' | 'neutral' | null
  trendDirection: 'up' | 'down' | 'flat'
  isEmpty: boolean
}

export const TEST_SCENARIOS: Record<TestScenario, ScenarioConfig> = {
  healthy: {
    name: 'Healthy State',
    description: 'All metrics at or above targets with positive trends',
    multipliers: { revenue: 1.1, counts: 1.0, rates: 1.05 },
    statusOverride: null, // Use natural calculation
    trendDirection: 'up',
    isEmpty: false
  },
  critical: {
    name: 'Critical State',
    description: 'All metrics below critical thresholds - test red states',
    multipliers: { revenue: 0.7, counts: 0.6, rates: 0.65 },
    statusOverride: 'critical',
    trendDirection: 'down',
    isEmpty: false
  },
  warning: {
    name: 'Warning State',
    description: 'Metrics hovering at warning thresholds - test yellow states',
    multipliers: { revenue: 0.9, counts: 0.85, rates: 0.88 },
    statusOverride: 'warning',
    trendDirection: 'flat',
    isEmpty: false
  },
  empty: {
    name: 'Empty Data',
    description: 'Zero counts, empty arrays - test empty state rendering',
    multipliers: { revenue: 0, counts: 0, rates: 0 },
    statusOverride: 'neutral',
    trendDirection: 'flat',
    isEmpty: true
  },
  max_values: {
    name: 'Maximum Values',
    description: 'Large numbers (millions, thousands) - test formatting and overflow',
    multipliers: { revenue: 100, counts: 50, rates: 1.0 },
    statusOverride: null,
    trendDirection: 'up',
    isEmpty: false
  },
  growth_spike: {
    name: 'Growth Spike',
    description: 'Dramatic positive movement (+50%) - test strong positive trends',
    multipliers: { revenue: 1.5, counts: 1.4, rates: 1.3 },
    statusOverride: 'good',
    trendDirection: 'up',
    isEmpty: false
  }
}

/**
 * Apply test scenario multiplier to a numeric value
 */
export function applyMultiplier(
  value: number,
  scenario: TestScenario,
  fieldType: 'revenue' | 'counts' | 'rates'
): number {
  const config = TEST_SCENARIOS[scenario]

  if (config.isEmpty) {
    return 0
  }

  const multiplier = config.multipliers[fieldType]
  return value * multiplier
}

/**
 * Apply test scenario to an object with numeric values
 */
export function applyTestScenarioToObject<T extends Record<string, unknown>>(
  baseData: T,
  scenario: TestScenario,
  fieldTypeMap?: Record<keyof T, 'revenue' | 'counts' | 'rates'>
): T {
  const config = TEST_SCENARIOS[scenario]

  if (config.isEmpty) {
    // Return object with all numeric values set to 0
    const result = { ...baseData }
    for (const key in result) {
      if (typeof result[key] === 'number') {
        (result as Record<string, unknown>)[key] = 0
      }
    }
    return result
  }

  const result = { ...baseData }
  for (const key in result) {
    if (typeof result[key] === 'number') {
      // Determine field type - default to 'counts' if not specified
      const fieldType = fieldTypeMap?.[key as keyof T] || 'counts'
      const multiplier = config.multipliers[fieldType]
      ;(result as Record<string, unknown>)[key] = (result[key] as number) * multiplier
    }
  }

  return result
}

/**
 * Get the trend array for sparklines based on scenario
 */
export function generateTrendArray(
  baseValue: number,
  scenario: TestScenario,
  length: number = 12
): number[] {
  const config = TEST_SCENARIOS[scenario]

  if (config.isEmpty) {
    return Array(length).fill(0)
  }

  const trend: number[] = []
  let value = baseValue

  for (let i = 0; i < length; i++) {
    // Add variance based on trend direction
    let variance = 0
    switch (config.trendDirection) {
      case 'up':
        variance = (Math.random() * 0.1) * (i / length) // Gradual increase
        break
      case 'down':
        variance = -(Math.random() * 0.1) * (i / length) // Gradual decrease
        break
      case 'flat':
        variance = (Math.random() * 0.04) - 0.02 // Small random variance
        break
    }

    trend.push(Math.round(value * (1 + variance)))
  }

  return trend
}

/**
 * Get status override for a KPI based on test scenario
 */
export function getStatusForScenario(
  scenario: TestScenario,
  naturalStatus?: 'good' | 'warning' | 'critical' | 'neutral'
): 'good' | 'warning' | 'critical' | 'neutral' {
  const config = TEST_SCENARIOS[scenario]

  // If scenario has a status override, use it
  if (config.statusOverride) {
    return config.statusOverride
  }

  // Otherwise return natural status or 'neutral' as default
  return naturalStatus || 'neutral'
}

/**
 * Check if a category should return null (empty scenario)
 */
export function shouldReturnEmpty(scenario: TestScenario): boolean {
  return TEST_SCENARIOS[scenario].isEmpty
}
