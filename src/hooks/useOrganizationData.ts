'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface OrganizationMarket {
  market_code: string
  market_name: string
  region_count: number
  branch_count: number
}

export interface OrganizationRegion {
  region_code: string
  region_name: string
  market_code: string
  market_name: string
  branch_count: number
}

export interface OrganizationBranch {
  branch_code: string
  branch_name: string
  region_code: string
  region_name: string
  market_code: string
  market_name: string
  brand: string
  city: string
  state: string
}

export interface OrganizationHierarchy {
  markets: OrganizationMarket[]
  regions: OrganizationRegion[]
  branches: OrganizationBranch[]
}

export interface FilterOption {
  value: string
  label: string
}

export interface UseOrganizationDataResult {
  // Raw data
  hierarchy: OrganizationHierarchy | null
  markets: OrganizationMarket[]
  regions: OrganizationRegion[]
  branches: OrganizationBranch[]

  // Filter options (for dropdowns)
  marketOptions: FilterOption[]
  regionOptions: FilterOption[]
  branchOptions: FilterOption[]

  // Filtered options (based on selection)
  getRegionOptionsForMarket: (marketCode: string) => FilterOption[]
  getBranchOptionsForRegion: (regionCode: string) => FilterOption[]
  getBranchOptionsForMarket: (marketCode: string) => FilterOption[]

  // Raw filtered data
  getRegionsForMarket: (marketCode: string) => OrganizationRegion[]
  getBranchesForRegion: (regionCode: string) => OrganizationBranch[]
  getBranchesForMarket: (marketCode: string) => OrganizationBranch[]

  // Lookup helpers
  getMarketByCode: (code: string) => OrganizationMarket | undefined
  getRegionByCode: (code: string) => OrganizationRegion | undefined
  getBranchByCode: (code: string) => OrganizationBranch | undefined
  getMarketByName: (name: string) => OrganizationMarket | undefined
  getRegionByName: (name: string) => OrganizationRegion | undefined

  // State
  isLoading: boolean
  error: string | null
  refetch: () => void

  // Metadata
  counts: {
    markets: number
    regions: number
    branches: number
  }
}

// =============================================================================
// Cache for organization data (singleton pattern)
// =============================================================================

let cachedHierarchy: OrganizationHierarchy | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function isCacheValid(): boolean {
  return cachedHierarchy !== null && Date.now() - cacheTimestamp < CACHE_TTL
}

// =============================================================================
// Hook
// =============================================================================

export function useOrganizationData(options?: {
  includeAll?: boolean
}): UseOrganizationDataResult {
  const { includeAll = false } = options || {}

  const [hierarchy, setHierarchy] = useState<OrganizationHierarchy | null>(
    cachedHierarchy
  )
  const [isLoading, setIsLoading] = useState(!isCacheValid())
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    // Return cached data if valid
    if (isCacheValid() && !includeAll) {
      setHierarchy(cachedHierarchy)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = includeAll
        ? '/api/organization/hierarchy?includeAll=true'
        : '/api/organization/hierarchy'

      const response = await fetch(url)
      const result = await response.json()

      if (result.success && result.data) {
        const newHierarchy = result.data as OrganizationHierarchy

        // Update cache (only for standard requests)
        if (!includeAll) {
          cachedHierarchy = newHierarchy
          cacheTimestamp = Date.now()
        }

        setHierarchy(newHierarchy)
        setError(null)
      } else {
        console.error('[useOrganizationData] API error:', result.error)
        setError(result.error || 'Failed to load organization data')
      }
    } catch (err) {
      console.error('[useOrganizationData] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [includeAll])

  useEffect(() => {
    fetchData()

    // Listen for data source changes (from admin panel)
    const handleDataSourceChange = () => {
      cachedHierarchy = null // Invalidate cache
      cacheTimestamp = 0
      fetchData()
    }

    window.addEventListener('data-source-changed', handleDataSourceChange)
    return () => {
      window.removeEventListener('data-source-changed', handleDataSourceChange)
    }
  }, [fetchData])

  // =============================================================================
  // Memoized filter options (for dropdowns)
  // =============================================================================

  const marketOptions = useMemo<FilterOption[]>(() => {
    if (!hierarchy) return [{ value: 'all', label: 'All Markets' }]
    return [
      { value: 'all', label: 'All Markets' },
      ...hierarchy.markets.map((m) => ({
        value: m.market_code,
        label: m.market_name,
      })),
    ]
  }, [hierarchy])

  const regionOptions = useMemo<FilterOption[]>(() => {
    if (!hierarchy) return [{ value: 'all', label: 'All Regions' }]
    return [
      { value: 'all', label: 'All Regions' },
      ...hierarchy.regions.map((r) => ({
        value: r.region_code,
        label: r.region_name,
      })),
    ]
  }, [hierarchy])

  const branchOptions = useMemo<FilterOption[]>(() => {
    if (!hierarchy) return [{ value: 'all', label: 'All Branches' }]
    return [
      { value: 'all', label: 'All Branches' },
      ...hierarchy.branches.map((b) => ({
        value: b.branch_code,
        label: b.branch_name,
      })),
    ]
  }, [hierarchy])

  // =============================================================================
  // Filtered data helpers
  // =============================================================================

  const getRegionsForMarket = useCallback(
    (marketCode: string): OrganizationRegion[] => {
      if (!hierarchy || marketCode === 'all') return hierarchy?.regions || []
      return hierarchy.regions.filter((r) => r.market_code === marketCode)
    },
    [hierarchy]
  )

  const getBranchesForRegion = useCallback(
    (regionCode: string): OrganizationBranch[] => {
      if (!hierarchy || regionCode === 'all') return hierarchy?.branches || []
      return hierarchy.branches.filter((b) => b.region_code === regionCode)
    },
    [hierarchy]
  )

  const getBranchesForMarket = useCallback(
    (marketCode: string): OrganizationBranch[] => {
      if (!hierarchy || marketCode === 'all') return hierarchy?.branches || []
      return hierarchy.branches.filter((b) => b.market_code === marketCode)
    },
    [hierarchy]
  )

  // =============================================================================
  // Filtered options helpers (for cascading dropdowns)
  // =============================================================================

  const getRegionOptionsForMarket = useCallback(
    (marketCode: string): FilterOption[] => {
      const regions = getRegionsForMarket(marketCode)
      return [
        { value: 'all', label: 'All Regions' },
        ...regions.map((r) => ({
          value: r.region_code,
          label: r.region_name,
        })),
      ]
    },
    [getRegionsForMarket]
  )

  const getBranchOptionsForRegion = useCallback(
    (regionCode: string): FilterOption[] => {
      const branches = getBranchesForRegion(regionCode)
      return [
        { value: 'all', label: 'All Branches' },
        ...branches.map((b) => ({
          value: b.branch_code,
          label: b.branch_name,
        })),
      ]
    },
    [getBranchesForRegion]
  )

  const getBranchOptionsForMarket = useCallback(
    (marketCode: string): FilterOption[] => {
      const branches = getBranchesForMarket(marketCode)
      return [
        { value: 'all', label: 'All Branches' },
        ...branches.map((b) => ({
          value: b.branch_code,
          label: b.branch_name,
        })),
      ]
    },
    [getBranchesForMarket]
  )

  // =============================================================================
  // Lookup helpers
  // =============================================================================

  const getMarketByCode = useCallback(
    (code: string): OrganizationMarket | undefined => {
      return hierarchy?.markets.find((m) => m.market_code === code)
    },
    [hierarchy]
  )

  const getRegionByCode = useCallback(
    (code: string): OrganizationRegion | undefined => {
      return hierarchy?.regions.find((r) => r.region_code === code)
    },
    [hierarchy]
  )

  const getBranchByCode = useCallback(
    (code: string): OrganizationBranch | undefined => {
      return hierarchy?.branches.find((b) => b.branch_code === code)
    },
    [hierarchy]
  )

  const getMarketByName = useCallback(
    (name: string): OrganizationMarket | undefined => {
      return hierarchy?.markets.find(
        (m) => m.market_name.toLowerCase() === name.toLowerCase()
      )
    },
    [hierarchy]
  )

  const getRegionByName = useCallback(
    (name: string): OrganizationRegion | undefined => {
      return hierarchy?.regions.find(
        (r) => r.region_name.toLowerCase() === name.toLowerCase()
      )
    },
    [hierarchy]
  )

  // =============================================================================
  // Deduplicated arrays (source data may have duplicates)
  // =============================================================================

  const uniqueMarkets = useMemo(() => {
    if (!hierarchy?.markets) return []
    const seen = new Set<string>()
    return hierarchy.markets.filter((m) => {
      if (seen.has(m.market_code)) return false
      seen.add(m.market_code)
      return true
    })
  }, [hierarchy])

  const uniqueRegions = useMemo(() => {
    if (!hierarchy?.regions) return []
    const seen = new Set<string>()
    return hierarchy.regions.filter((r) => {
      if (seen.has(r.region_code)) return false
      seen.add(r.region_code)
      return true
    })
  }, [hierarchy])

  const uniqueBranches = useMemo(() => {
    if (!hierarchy?.branches) return []
    const seen = new Set<string>()
    return hierarchy.branches.filter((b) => {
      if (seen.has(b.branch_code)) return false
      seen.add(b.branch_code)
      return true
    })
  }, [hierarchy])

  // =============================================================================
  // Counts
  // =============================================================================

  const counts = useMemo(
    () => ({
      markets: uniqueMarkets.length,
      regions: uniqueRegions.length,
      branches: uniqueBranches.length,
    }),
    [uniqueMarkets, uniqueRegions, uniqueBranches]
  )

  return {
    hierarchy,
    markets: uniqueMarkets,
    regions: uniqueRegions,
    branches: uniqueBranches,
    marketOptions,
    regionOptions,
    branchOptions,
    getRegionOptionsForMarket,
    getBranchOptionsForRegion,
    getBranchOptionsForMarket,
    getRegionsForMarket,
    getBranchesForRegion,
    getBranchesForMarket,
    getMarketByCode,
    getRegionByCode,
    getBranchByCode,
    getMarketByName,
    getRegionByName,
    isLoading,
    error,
    refetch: fetchData,
    counts,
  }
}

// =============================================================================
// Utility: Clear cache (for admin use)
// =============================================================================

export function clearOrganizationCache(): void {
  cachedHierarchy = null
  cacheTimestamp = 0
}
