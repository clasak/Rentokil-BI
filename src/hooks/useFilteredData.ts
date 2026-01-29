'use client'

import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { filterByOrganizationHierarchy } from '@/lib/data'

interface FilteredDataOptions {
  /** Whether to apply organization hierarchy filters. Defaults to true. */
  applyOrgFilters?: boolean
}

/**
 * Hook that filters data by the global organization hierarchy filters (market -> region -> branch).
 * Use this hook to filter mock/client-side data in dashboard components.
 *
 * @example
 * ```tsx
 * const accounts = getAccounts()
 * const filteredAccounts = useFilteredData(accounts)
 * ```
 *
 * @param data - Array of items with optional marketId, regionId, branchId properties
 * @param options - Filtering options
 * @returns Filtered array based on global organization filters
 */
export function useFilteredData<T extends { marketId?: string; regionId?: string; branchId?: string }>(
  data: T[],
  options: FilteredDataOptions = {}
): T[] {
  const { applyOrgFilters = true } = options
  const [mounted, setMounted] = useState(false)
  const { organizationFilters } = useAppStore()

  // Hydration guard
  useEffect(() => {
    setMounted(true)
  }, [])

  return useMemo(() => {
    // Don't filter until mounted to avoid hydration mismatch
    if (!mounted || !applyOrgFilters) {
      return data
    }

    return filterByOrganizationHierarchy(data, organizationFilters)
  }, [data, organizationFilters, applyOrgFilters, mounted])
}

/**
 * Hook that returns the current organization filter state.
 * Useful for components that need to know if any filters are active.
 */
export function useOrganizationFilters() {
  const [mounted, setMounted] = useState(false)
  const {
    organizationFilters,
    setOrganizationMarket,
    setOrganizationRegion,
    setOrganizationBranch,
    clearOrganizationFilters,
  } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const hasActiveFilters = mounted && (
    organizationFilters.selectedMarket !== null ||
    organizationFilters.selectedRegion !== null ||
    organizationFilters.selectedBranch !== null
  )

  return {
    ...organizationFilters,
    hasActiveFilters,
    setMarket: setOrganizationMarket,
    setRegion: setOrganizationRegion,
    setBranch: setOrganizationBranch,
    clearFilters: clearOrganizationFilters,
    mounted,
  }
}
