'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { DataSourceStatus } from '@/components/ui/data-source-badge'
import { useAppStore } from '@/store'
import { getRoleBasedFilters, getEffectiveUserForFiltering, shouldApplyRoleFilters } from '@/lib/bigquery/role-filters'

// Configuration
const QUERY_TIMEOUT_MS = 30000 // 30 second timeout
const CACHE_TTL_MS = 60_000 // 1 minute cache TTL

// Simple client-side query cache to prevent redundant BigQuery calls
// on re-renders, tab switches, and navigation between pages
interface CacheEntry {
  data: unknown
  timestamp: number
  metadata?: { responseTime: number; timestamp: string; source: string }
}

const queryCache = new Map<string, CacheEntry>()

function getCacheKey(queryName: string, filters: Record<string, unknown>): string {
  return `${queryName}:${JSON.stringify(filters)}`
}

function getCachedResult(key: string): CacheEntry | null {
  const entry = queryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    queryCache.delete(key)
    return null
  }
  return entry
}

function setCacheResult(key: string, data: unknown, metadata?: CacheEntry['metadata']): void {
  queryCache.set(key, { data, timestamp: Date.now(), metadata })
  // Evict old entries if cache grows too large (prevent memory leak)
  if (queryCache.size > 200) {
    const oldest = [...queryCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)
    for (let i = 0; i < 50; i++) queryCache.delete(oldest[i][0])
  }
}

interface BigQueryResponse<T> {
  success: boolean
  data: T
  metadata?: {
    responseTime: number
    timestamp: string
    source: string
  }
  error?: string
  errorCode?: string
  errorType?: 'auth' | 'network' | 'query' | 'timeout' | 'empty'
  queryName?: string
  suggestion?: string
  originalError?: string
}

interface UseBigQueryDataOptions<T, M> {
  queryName: string
  filters?: Record<string, unknown>
  transformBigQueryData: (data: T) => M
  /** Default/empty data to show while loading or on error. Required - no mock fallback. */
  defaultData: M
  enabled?: boolean
  /** Whether to auto-inject organization hierarchy filters (market/region/branch). Defaults to true. */
  includeOrgFilters?: boolean
  /** Whether to auto-inject role-based user filters (salesPerson, technicianId, etc.). Defaults to true. */
  includeRoleFilters?: boolean
}

interface UseBigQueryDataResult<M> {
  data: M
  isLoading: boolean
  dataSource: DataSourceStatus
  responseTime?: number
  queryTimestamp?: string
  error?: string
  errorType?: 'auth' | 'network' | 'query' | 'timeout' | 'empty'
  isEmpty: boolean
  refetch: () => void
}

export function useBigQueryData<T, M>({
  queryName,
  filters = {},
  transformBigQueryData,
  defaultData,
  enabled = true,
  includeOrgFilters = true,
  includeRoleFilters = true,
}: UseBigQueryDataOptions<T, M>): UseBigQueryDataResult<M> {
  // Hydration guard - must wait for client mount
  const [mounted, setMounted] = useState(false)

  // Get organization filters, date filters, and user context from global store
  // Use individual selectors to ensure re-renders when these specific values change
  const organizationFilters = useAppStore((state) => state.organizationFilters)
  const globalFilters = useAppStore((state) => state.filters)
  const currentUser = useAppStore((state) => state.currentUser)
  const previewedEmployee = useAppStore((state) => state.previewedEmployee)
  const isPreviewingRole = useAppStore((state) => state.isPreviewingRole)

  // Get effective user for role-based filtering (real user or previewed employee)
  const effectiveUser = getEffectiveUserForFiltering(currentUser, previewedEmployee, isPreviewingRole)

  // Memoize defaultData to prevent infinite re-render loops
  // Uses JSON.stringify to create stable reference for object/array defaults
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDefaultData = useMemo(() => defaultData, [JSON.stringify(defaultData)])

  // Start with default data and loading state
  const [data, setData] = useState<M>(stableDefaultData)
  const [isLoading, setIsLoading] = useState(true)
  const [dataSource, setDataSource] = useState<DataSourceStatus>('loading')
  const [responseTime, setResponseTime] = useState<number | undefined>()
  const [queryTimestamp, setQueryTimestamp] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [errorType, setErrorType] = useState<'auth' | 'network' | 'query' | 'timeout' | 'empty' | undefined>()
  const [isEmpty, setIsEmpty] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Use refs to store transform function to prevent re-render loops
  const transformRef = useRef(transformBigQueryData)
  transformRef.current = transformBigQueryData

  // Merge organization filters and role-based filters with provided filters
  const effectiveFilters = useMemo(() => {
    const merged = { ...filters }

    // Add role-based filters (user identity filtering)
    if (includeRoleFilters && effectiveUser && shouldApplyRoleFilters(effectiveUser.role)) {
      const roleFilters = getRoleBasedFilters(effectiveUser)
      // Only add role filters that aren't already explicitly set
      Object.entries(roleFilters).forEach(([key, value]) => {
        if (value !== undefined && merged[key] === undefined) {
          merged[key] = value
        }
      })
    }

    // Add organization hierarchy filters (manual selections from UI)
    // NOTE: Add BOTH naming conventions for backward compatibility:
    // - Queries may use either 'market' or 'marketCode' (same for region/branch)
    // - This ensures filters work regardless of query implementation
    if (includeOrgFilters) {
      if (organizationFilters.selectedMarket) {
        merged.market = organizationFilters.selectedMarket
        merged.marketCode = organizationFilters.selectedMarket // Alternative name for compatibility
      }
      if (organizationFilters.selectedRegion) {
        merged.region = organizationFilters.selectedRegion
        merged.regionCode = organizationFilters.selectedRegion // Alternative name for compatibility
      }
      if (organizationFilters.selectedBranch) {
        merged.branch = organizationFilters.selectedBranch
        merged.branchCode = organizationFilters.selectedBranch // Alternative name for compatibility
      }
    }

    // Add global date range filter (convert to daysBack if not explicitly set)
    // Only apply if no explicit daysBack, startDate, or endDate is already provided
    if (globalFilters?.dateRange && !merged.daysBack && !merged.startDate && !merged.endDate) {
      const start = globalFilters.dateRange.start
      const end = globalFilters.dateRange.end
      // Calculate days between start and end dates
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      merged.daysBack = diffDays > 0 ? diffDays : 30 // Default to 30 if invalid range
    }

    return merged
  }, [filters, organizationFilters, globalFilters, includeOrgFilters, includeRoleFilters, effectiveUser])

  // Memoize filters to prevent infinite re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => effectiveFilters, [JSON.stringify(effectiveFilters)])

  // Hydration fix: Only run after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = useCallback(async () => {
    // Don't fetch until mounted (hydration guard)
    if (!mounted) return

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (!enabled) {
      setData(stableDefaultData)
      setDataSource('loading')
      setIsLoading(false)
      return
    }

    // Check client-side cache before making network request
    const cacheKey = getCacheKey(queryName, stableFilters)
    const cached = getCachedResult(cacheKey)
    if (cached) {
      const transformed = transformRef.current(cached.data as T)
      setData(transformed)
      setDataSource('bigquery')
      setResponseTime(cached.metadata?.responseTime)
      setQueryTimestamp(cached.metadata?.timestamp)
      setError(undefined)
      setErrorType(undefined)
      const dataIsEmpty = Array.isArray(cached.data)
        ? (cached.data as unknown[]).length === 0
        : Object.keys((cached.data as object) || {}).length === 0
      setIsEmpty(dataIsEmpty)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setDataSource('loading')
    setError(undefined)
    setErrorType(undefined)
    setIsEmpty(false)

    // Create abort controller for timeout
    const controller = new AbortController()
    abortControllerRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)

    try {
      const response = await fetch('/api/bigquery/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryName, filters: stableFilters }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Handle authentication errors (401 Unauthorized)
      if (response.status === 401) {
        console.warn(`[useBigQueryData] Unauthorized access for query "${queryName}". Redirecting to login.`)
        setDataSource('error')
        setError('Session expired. Redirecting to login...')
        setErrorType('auth')
        setData(stableDefaultData)
        setIsEmpty(false)
        setIsLoading(false)

        // Redirect to login after brief delay
        setTimeout(() => {
          window.location.href = '/login'
        }, 1500)
        return
      }

      // Handle forbidden errors (403 Forbidden)
      if (response.status === 403) {
        const forbiddenResult: BigQueryResponse<T> = await response.json()
        console.warn(`[useBigQueryData] Access denied for query "${queryName}":`, forbiddenResult.error)
        setDataSource('error')
        setError(forbiddenResult.error || 'Access denied: You do not have permission to view this data.')
        setErrorType('auth')
        setData(stableDefaultData)
        setIsEmpty(false)
        setIsLoading(false)
        return
      }

      // Handle server errors (500+) - try to parse JSON error body, fall back to status text
      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`
        let errorCode = 'SERVER_ERROR'
        try {
          const errorResult: BigQueryResponse<T> = await response.json()
          errorMessage = errorResult.error || errorMessage
          errorCode = errorResult.errorCode || errorCode
        } catch {
          // Response body is not JSON (e.g. HTML error page) - use status text
          errorMessage = `Server error: ${response.statusText || response.status}`
        }
        console.error(`[useBigQueryData] Query "${queryName}" server error ${response.status}: ${errorCode}`)
        setDataSource('error')
        setError(errorMessage)
        setErrorType('query')
        setData(stableDefaultData)
        setIsEmpty(false)
        setIsLoading(false)
        return
      }

      const result: BigQueryResponse<T> = await response.json()

      if (result.success) {
        // Query succeeded - data may be null for single-record queries with no matches
        if (result.data !== undefined && result.data !== null) {
          setCacheResult(cacheKey, result.data, result.metadata)
          const transformed = transformRef.current(result.data)
          setData(transformed)

          const dataIsEmpty = Array.isArray(result.data)
            ? result.data.length === 0
            : Object.keys(result.data || {}).length === 0
          setIsEmpty(dataIsEmpty)
        } else {
          // Success but no data (e.g. no matching records) - use default, not error
          setData(stableDefaultData)
          setIsEmpty(true)
        }

        setDataSource('bigquery')
        setResponseTime(result.metadata?.responseTime)
        setQueryTimestamp(result.metadata?.timestamp)
        setError(undefined)
        setErrorType(undefined)
      } else {
        // BigQuery query failed (200 response but success=false)
        const errorCode = result.errorCode || 'UNKNOWN_ERROR'

        // Log error code for debugging (safe - no sensitive info)
        console.error(`[useBigQueryData] Query "${queryName}" failed: ${errorCode}`)

        // In development, log additional details if available
        if (process.env.NODE_ENV !== 'production' && result.suggestion) {
          console.error(`[useBigQueryData] Suggestion: ${result.suggestion}`)
        }

        // Set user-friendly error message (already sanitized by API)
        setDataSource('error')
        setError(result.error || 'An error occurred while fetching data')
        setErrorType(result.errorType || 'query')
        setData(stableDefaultData)
        setIsEmpty(false)
      }
    } catch (err) {
      clearTimeout(timeoutId)

      // Handle AbortError silently - this is expected when component unmounts or filters change
      if (err instanceof Error && err.name === 'AbortError') {
        setIsLoading(false)
        setErrorType('timeout')
        return
      }

      // Determine error type and message
      let errorMsg: string
      let errType: 'network' | 'query' = 'network'
      if (err instanceof SyntaxError) {
        // JSON parse error - server returned non-JSON response (e.g. HTML error page)
        errorMsg = 'Server returned an invalid response. The server may be restarting.'
        errType = 'query'
      } else if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
        errorMsg = 'Network error. Please check your connection.'
      } else {
        errorMsg = err instanceof Error ? err.message : 'Network error'
      }
      console.error(`[useBigQueryData] Error for "${queryName}":`, errorMsg)

      setDataSource('error')
      setError(errorMsg)
      setErrorType(errType)
      setData(stableDefaultData)
      setIsEmpty(false)
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryName, stableFilters, enabled, mounted, stableDefaultData])

  useEffect(() => {
    fetchData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [fetchData])

  return {
    data,
    isLoading,
    dataSource,
    responseTime,
    queryTimestamp,
    error,
    errorType,
    isEmpty,
    refetch: fetchData,
  }
}
