/**
 * BigQuery Query Result Cache
 *
 * Simple in-memory cache for BigQuery query results.
 * Reduces API calls and improves dashboard performance.
 *
 * Features:
 * - TTL-based expiration (default 5 minutes)
 * - Key-based cache entries (query name + filters)
 * - Manual cache clear support
 * - Size limits to prevent memory issues
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// Maximum cache entries to prevent memory issues
const MAX_CACHE_ENTRIES = 100

// Cache storage
const cache = new Map<string, CacheEntry<unknown>>()

/**
 * Generate a cache key from query name and filters
 */
export function getCacheKey(queryName: string, filters?: Record<string, unknown>): string {
  if (!filters || Object.keys(filters).length === 0) {
    return queryName
  }
  // Sort keys for consistent cache keys regardless of filter order
  const sortedFilters = Object.keys(filters)
    .sort()
    .map((key) => `${key}=${JSON.stringify(filters[key])}`)
    .join('&')
  return `${queryName}?${sortedFilters}`
}

/**
 * Get cached data if available and not expired
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) {
    return null
  }

  const now = Date.now()
  if (now - entry.timestamp > entry.ttl) {
    // Entry expired, remove it
    cache.delete(key)
    return null
  }

  return entry.data as T
}

/**
 * Get cached data using query name and filters
 */
export function getCachedQuery<T>(
  queryName: string,
  filters?: Record<string, unknown>
): T | null {
  const key = getCacheKey(queryName, filters)
  return getCached<T>(key)
}

/**
 * Set cache entry with TTL
 * @param key Cache key
 * @param data Data to cache
 * @param ttlMs Time to live in milliseconds (default: 5 minutes)
 */
export function setCache<T>(key: string, data: T, ttlMs: number = 300000): void {
  // Enforce max cache size
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Remove oldest entry (first entry in Map)
    const firstKey = cache.keys().next().value
    if (firstKey) {
      cache.delete(firstKey)
    }
  }

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  })
}

/**
 * Set cache entry using query name and filters
 */
export function setCacheQuery<T>(
  queryName: string,
  filters: Record<string, unknown> | undefined,
  data: T,
  ttlMs: number = 300000
): void {
  const key = getCacheKey(queryName, filters)
  setCache(key, data, ttlMs)
}

/**
 * Clear a specific cache entry
 */
export function clearCacheEntry(key: string): void {
  cache.delete(key)
}

/**
 * Clear cache entry by query name and filters
 */
export function clearCacheQuery(
  queryName: string,
  filters?: Record<string, unknown>
): void {
  const key = getCacheKey(queryName, filters)
  cache.delete(key)
}

/**
 * Clear all cached entries
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Clear all cached entries matching a query name prefix
 * Useful for invalidating all variants of a query
 */
export function clearCacheByPrefix(prefix: string): void {
  const keysToDelete: string[] = []
  cache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach((key) => cache.delete(key))
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  maxSize: number
  keys: string[]
} {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_ENTRIES,
    keys: Array.from(cache.keys()),
  }
}

/**
 * Check if a cache entry exists and is valid
 */
export function isCached(key: string): boolean {
  return getCached(key) !== null
}

/**
 * Get cache entry age in milliseconds
 * Returns null if entry doesn't exist
 */
export function getCacheAge(key: string): number | null {
  const entry = cache.get(key)
  if (!entry) {
    return null
  }
  return Date.now() - entry.timestamp
}

// Export cache TTL constants for consistent usage
export const CACHE_TTL = {
  SHORT: 60000, // 1 minute
  MEDIUM: 300000, // 5 minutes (default)
  LONG: 900000, // 15 minutes
  VERY_LONG: 3600000, // 1 hour
} as const
