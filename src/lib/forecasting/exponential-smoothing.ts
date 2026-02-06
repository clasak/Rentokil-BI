/**
 * Exponential Smoothing Forecasting Algorithm
 *
 * Implements Single Exponential Smoothing (SES) for time series forecasting
 * with scenario generation (base, upside, downside) based on historical variance.
 */

import { addWeeks, format } from 'date-fns'

export interface ForecastPoint {
  date: Date
  base: number
  upside: number
  downside: number
  actual?: number
  confidenceLower: number
  confidenceUpper: number
}

export interface ForecastAssumption {
  name: string
  baseValue: number
  upsideValue: number
  downsideValue: number
  unit: string
}

export interface BacktestResult {
  weekEnding: Date
  predicted: number
  actual: number
  error: number
  errorPercent: number
}

export interface ForecastConfig {
  alpha: number // Smoothing parameter (0-1), higher = more weight on recent data
  horizonWeeks: number // Number of weeks to forecast
  scenarioStdDevs: number // Standard deviations for upside/downside scenarios
}

const DEFAULT_CONFIG: ForecastConfig = {
  alpha: 0.3,
  horizonWeeks: 8,
  scenarioStdDevs: 1.0,
}

/**
 * Calculate exponential smoothing forecast
 */
export function calculateExponentialSmoothing(
  historicalData: number[],
  horizonWeeks: number,
  alpha: number = 0.3
): number[] {
  if (historicalData.length === 0) return []

  const forecast: number[] = []
  let smoothed = historicalData[0] // Initialize with first observation

  // Smooth historical data
  for (let i = 1; i < historicalData.length; i++) {
    smoothed = alpha * historicalData[i] + (1 - alpha) * smoothed
  }

  // Project forward
  for (let i = 0; i < horizonWeeks; i++) {
    forecast.push(smoothed)
  }

  return forecast
}

/**
 * Calculate standard deviation of time series
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Perform backtest on historical data
 */
export function performBacktest(
  historicalData: { week_ending: string; total_revenue: number }[],
  config: ForecastConfig = DEFAULT_CONFIG
): BacktestResult[] {
  const testWeeks = 12 // Test last 12 weeks
  const trainingSize = historicalData.length - testWeeks

  if (trainingSize < 10) return [] // Not enough data for backtest

  const results: BacktestResult[] = []

  for (let i = trainingSize; i < historicalData.length; i++) {
    const trainingData = historicalData.slice(0, i).map(d => d.total_revenue)
    const forecast = calculateExponentialSmoothing(trainingData, 1, config.alpha)
    const actual = historicalData[i].total_revenue
    const predicted = forecast[0]
    const error = Math.abs(actual - predicted)
    const errorPercent = actual > 0 ? error / actual : 0

    results.push({
      weekEnding: new Date(historicalData[i].week_ending),
      predicted,
      actual,
      error,
      errorPercent,
    })
  }

  return results
}

/**
 * Generate forecast with scenarios
 */
export function generateForecast(
  historicalData: { week_ending: string; total_revenue: number }[],
  config: ForecastConfig = DEFAULT_CONFIG
): {
  forecast: ForecastPoint[]
  assumptions: ForecastAssumption[]
  backtest: BacktestResult[]
} {
  if (historicalData.length === 0) {
    return { forecast: [], assumptions: [], backtest: [] }
  }

  const revenueValues = historicalData.map(d => d.total_revenue)
  const avgRevenue = revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length
  const stdDev = calculateStdDev(revenueValues)

  // Calculate base forecast
  const baseForecast = calculateExponentialSmoothing(
    revenueValues,
    config.horizonWeeks + historicalData.length,
    config.alpha
  )

  // Get last historical date
  const lastDate = new Date(historicalData[historicalData.length - 1].week_ending)

  // Generate forecast points
  const forecast: ForecastPoint[] = []

  // Include historical data with actuals
  for (let i = 0; i < historicalData.length; i++) {
    const date = new Date(historicalData[i].week_ending)
    const baseValue = i < baseForecast.length ? baseForecast[i] : avgRevenue
    const upper = baseValue + (config.scenarioStdDevs * stdDev)
    const lower = Math.max(0, baseValue - (config.scenarioStdDevs * stdDev))

    forecast.push({
      date,
      base: baseValue,
      upside: upper,
      downside: lower,
      actual: historicalData[i].total_revenue,
      confidenceUpper: upper,
      confidenceLower: lower,
    })
  }

  // Add future forecast points
  for (let i = 0; i < config.horizonWeeks; i++) {
    const date = addWeeks(lastDate, i + 1)
    const baseValue = baseForecast[historicalData.length + i] || avgRevenue
    const upper = baseValue + (config.scenarioStdDevs * stdDev)
    const lower = Math.max(0, baseValue - (config.scenarioStdDevs * stdDev))

    forecast.push({
      date,
      base: baseValue,
      upside: upper,
      downside: lower,
      confidenceUpper: upper,
      confidenceLower: lower,
    })
  }

  // Generate assumptions
  const growthRate = historicalData.length > 1
    ? (revenueValues[revenueValues.length - 1] - revenueValues[0]) / revenueValues[0]
    : 0

  const assumptions: ForecastAssumption[] = [
    {
      name: 'Weekly Revenue (Avg)',
      baseValue: avgRevenue,
      upsideValue: avgRevenue * 1.15,
      downsideValue: avgRevenue * 0.85,
      unit: '$',
    },
    {
      name: 'Revenue Growth Rate',
      baseValue: growthRate,
      upsideValue: growthRate * 1.25,
      downsideValue: growthRate * 0.75,
      unit: '%',
    },
    {
      name: 'Volatility (StdDev)',
      baseValue: stdDev,
      upsideValue: stdDev * 0.85,
      downsideValue: stdDev * 1.15,
      unit: '$',
    },
    {
      name: 'Smoothing Factor (α)',
      baseValue: config.alpha,
      upsideValue: config.alpha,
      downsideValue: config.alpha,
      unit: '',
    },
  ]

  // Perform backtest
  const backtest = performBacktest(historicalData, config)

  return { forecast, assumptions, backtest }
}
