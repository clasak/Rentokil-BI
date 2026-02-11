/**
 * Integration tests for useBigQueryData hook
 *
 * Tests critical hook behavior to prevent regression on:
 * - Error handling and state management
 * - Empty data handling with defaultData
 * - Data transformation pipeline
 * - Organization filter injection
 * - Role-based filter injection
 * - Refetch functionality
 * - Loading state transitions
 *
 * @requires vitest @testing-library/react @testing-library/user-event
 *
 * Setup: See /docs/TESTING_SETUP.md for installation instructions
 */

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBigQueryData } from '../useBigQueryData'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Zustand store
vi.mock('@/store', () => ({
  useAppStore: vi.fn(() => ({
    organizationFilters: {
      selectedMarket: 'TEST_MARKET',
      selectedRegion: 'TEST_REGION',
      selectedBranch: 'TEST_BRANCH',
    },
    filters: {},
    currentUser: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'rep',
    },
    previewedEmployee: null,
    isPreviewingRole: false,
  })),
}))

// Mock role-filters module
vi.mock('@/lib/bigquery/role-filters', () => ({
  getRoleBasedFilters: vi.fn(() => ({})),
  getEffectiveUserForFiltering: vi.fn((user) => user),
  shouldApplyRoleFilters: vi.fn(() => false),
}))

describe('useBigQueryData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Error Handling', () => {
    it('should return error state when API fails with network error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: 'Network error',
          errorCode: 'NETWORK_ERROR',
          timestamp: new Date().toISOString(),
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.dataSource).toBe('error')
      }, { timeout: 5000 })
    })

    it('should return error state when API returns error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: 'Database connection failed',
          errorCode: 'QUERY_FAILED',
          timestamp: new Date().toISOString(),
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.dataSource).toBe('error')
      }, { timeout: 5000 })
    })

    it('should return error when query name is not registered', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: 'Query not found: invalid-query',
          errorCode: 'UNKNOWN_QUERY',
          timestamp: new Date().toISOString(),
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'invalid-query',
          defaultData: { items: [] },
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.dataSource).toBe('error')
      }, { timeout: 5000 })
    })
  })

  describe('Empty State Handling', () => {
    it('should return defaultData when API returns empty array', async () => {
      const defaultData = { items: [], total: 0, summary: 'No data' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          query: 'test-query',
          data: [],
          metadata: {
            responseTime: 150,
            timestamp: new Date().toISOString(),
            source: 'bigquery',
          },
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData,
          transformBigQueryData: (raw) => ({
            items: raw,
            total: raw.length,
            summary: raw.length === 0 ? 'No data' : 'Has data',
          }),
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(defaultData)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.dataSource).toBe('bigquery')
      }, { timeout: 5000 })
    })

    it('should return defaultData on initial load', () => {
      const defaultData = { value: 0 }

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData,
        })
      )

      expect(result.current.data).toEqual(defaultData)
      expect(result.current.isLoading).toBe(true)
      expect(result.current.dataSource).toBe('loading')
    })
  })

  describe('Data Transformation', () => {
    it('should call transformBigQueryData with raw API response', async () => {
      const rawData = [
        { id: 1, name: 'Test 1', value: 100 },
        { id: 2, name: 'Test 2', value: 200 },
      ]

      const transformFn = vi.fn((raw) => ({
        items: raw.map((item: any) => ({
          ...item,
          displayName: item.name.toUpperCase(),
        })),
        count: raw.length,
      }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          query: 'test-query',
          data: rawData,
          metadata: {
            responseTime: 200,
            timestamp: new Date().toISOString(),
            source: 'bigquery',
          },
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [], count: 0 },
          transformBigQueryData: transformFn,
        })
      )

      await waitFor(() => {
        expect(transformFn).toHaveBeenCalledWith(rawData)
        expect(result.current.data).toEqual({
          items: [
            { id: 1, name: 'Test 1', value: 100, displayName: 'TEST 1' },
            { id: 2, name: 'Test 2', value: 200, displayName: 'TEST 2' },
          ],
          count: 2,
        })
      }, { timeout: 5000 })
    })

    it('should return defaultData if transform throws error', async () => {
      const defaultData = { items: [] }
      const transformFn = vi.fn(() => {
        throw new Error('Transform failed')
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          query: 'test-query',
          data: [{ id: 1 }],
          metadata: {
            responseTime: 100,
            timestamp: new Date().toISOString(),
            source: 'bigquery',
          },
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData,
          transformBigQueryData: transformFn,
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.data).toEqual(defaultData)
      }, { timeout: 5000 })
    })
  })

  describe('Organization Filter Injection', () => {
    it('should inject market/region/branch when includeOrgFilters=true', async () => {
      const capturedRequest = { body: '' }

      mockFetch.mockImplementationOnce(async (url, options) => {
        capturedRequest.body = options?.body || ''
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            query: 'test-query',
            data: [],
            metadata: {
              responseTime: 100,
              timestamp: new Date().toISOString(),
              source: 'bigquery',
            },
          }),
        }
      })

      renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          filters: { customFilter: 'value' },
          includeOrgFilters: true,
        })
      )

      await waitFor(() => {
        const parsedBody = JSON.parse(capturedRequest.body)
        expect(parsedBody.filters).toMatchObject({
          customFilter: 'value',
          market: 'TEST_MARKET',
          region: 'TEST_REGION',
          branch: 'TEST_BRANCH',
        })
      }, { timeout: 5000 })
    })

    it('should NOT inject org filters when includeOrgFilters=false', async () => {
      const capturedRequest = { body: '' }

      mockFetch.mockImplementationOnce(async (url, options) => {
        capturedRequest.body = options?.body || ''
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            query: 'test-query',
            data: [],
            metadata: {
              responseTime: 100,
              timestamp: new Date().toISOString(),
              source: 'bigquery',
            },
          }),
        }
      })

      renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          filters: { customFilter: 'value' },
          includeOrgFilters: false,
        })
      )

      await waitFor(() => {
        const parsedBody = JSON.parse(capturedRequest.body)
        expect(parsedBody.filters).toEqual({
          customFilter: 'value',
        })
        expect(parsedBody.filters.market).toBeUndefined()
        expect(parsedBody.filters.region).toBeUndefined()
        expect(parsedBody.filters.branch).toBeUndefined()
      }, { timeout: 5000 })
    })
  })

  describe('Role-Based Filter Injection', () => {
    it('should inject role filters when includeRoleFilters=true', async () => {
      const capturedRequest = { body: '' }

      mockFetch.mockImplementationOnce(async (url, options) => {
        capturedRequest.body = options?.body || ''
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            query: 'test-query',
            data: [],
            metadata: {
              responseTime: 100,
              timestamp: new Date().toISOString(),
              source: 'bigquery',
            },
          }),
        }
      })

      renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          includeRoleFilters: true,
          transformBigQueryData: (raw) => ({ items: raw }),
        })
      )

      await waitFor(() => {
        const parsedBody = JSON.parse(capturedRequest.body)
        expect(parsedBody.role).toBe('rep')
        expect(parsedBody.userId).toBe('test-user-id')
      }, { timeout: 5000 })
    })

    it('should NOT inject role filters when includeRoleFilters=false', async () => {
      const capturedRequest = { body: '' }

      mockFetch.mockImplementationOnce(async (url, options) => {
        capturedRequest.body = options?.body || ''
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            query: 'test-query',
            data: [],
            metadata: {
              responseTime: 100,
              timestamp: new Date().toISOString(),
              source: 'bigquery',
            },
          }),
        }
      })

      renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          includeRoleFilters: false,
          transformBigQueryData: (raw) => ({ items: raw }),
        })
      )

      await waitFor(() => {
        const parsedBody = JSON.parse(capturedRequest.body)
        expect(parsedBody.role).toBeUndefined()
        expect(parsedBody.userId).toBeUndefined()
      }, { timeout: 5000 })
    })
  })

  describe('Refetch Functionality', () => {
    it('should trigger new API call when refetch() is called', async () => {
      let callCount = 0

      mockFetch.mockImplementation(async () => {
        callCount++
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            query: 'test-query',
            data: [{ id: callCount }],
            metadata: {
              responseTime: 100,
              timestamp: new Date().toISOString(),
              source: 'bigquery',
            },
          }),
        }
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          transformBigQueryData: (raw) => ({ items: raw }),
        })
      )

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 5000 })

      expect(callCount).toBe(1)
      expect(result.current.data.items).toEqual([{ id: 1 }])

      // Trigger refetch
      result.current.refetch()

      await waitFor(() => {
        expect(callCount).toBe(2)
        expect(result.current.data.items).toEqual([{ id: 2 }])
      }, { timeout: 5000 })
    })

    it('should maintain loading state during refetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          query: 'test-query',
          data: [],
          metadata: {
            responseTime: 100,
            timestamp: new Date().toISOString(),
            source: 'bigquery',
          },
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
        })
      )

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 5000 })

      // Trigger refetch and check loading state
      result.current.refetch()

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 5000 })
    })
  })

  describe('Loading State Transitions', () => {
    it('should transition from loading to loaded state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          query: 'test-query',
          data: [{ id: 1 }],
          metadata: {
            responseTime: 150,
            timestamp: new Date().toISOString(),
            source: 'bigquery',
          },
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          transformBigQueryData: (raw) => ({ items: raw }),
        })
      )

      // Initial state
      expect(result.current.isLoading).toBe(true)
      expect(result.current.dataSource).toBe('loading')

      // After load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.dataSource).toBe('bigquery')
        expect(result.current.data.items).toEqual([{ id: 1 }])
      }, { timeout: 5000 })
    })

    it('should include response time in loaded state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          query: 'test-query',
          data: [],
          metadata: {
            responseTime: 250,
            timestamp: new Date().toISOString(),
            source: 'bigquery',
          },
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          transformBigQueryData: (raw) => ({ items: raw }),
        })
      )

      await waitFor(() => {
        expect(result.current.responseTime).toBe(250)
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 5000 })
    })

    it('should handle dataSource badge correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          query: 'test-query',
          data: [],
          metadata: {
            responseTime: 100,
            timestamp: new Date().toISOString(),
            source: 'cache',
          },
        }),
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          transformBigQueryData: (raw) => ({ items: raw }),
        })
      )

      await waitFor(() => {
        expect(result.current.dataSource).toBe('cache')
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 5000 })
    })
  })

  describe('Complex Integration Scenarios', () => {
    it('should handle complete flow: filters + transform + org filters + role filters', async () => {
      const capturedRequest = { body: '' }

      mockFetch.mockImplementationOnce(async (url, options) => {
        capturedRequest.body = options?.body || ''
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            query: 'test-query',
            data: [
              { id: 1, name: 'Test 1', value: 100 },
              { id: 2, name: 'Test 2', value: 200 },
            ],
            metadata: {
              responseTime: 300,
              timestamp: new Date().toISOString(),
              source: 'bigquery',
            },
          }),
        }
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { total: 0, items: [] },
          filters: { status: 'active', limit: 10 },
          includeOrgFilters: true,
          includeRoleFilters: true,
          transformBigQueryData: (raw) => ({
            total: raw.reduce((sum: number, item: any) => sum + item.value, 0),
            items: raw.map((item: any) => ({
              ...item,
              label: `${item.name} ($${item.value})`,
            })),
          }),
        })
      )

      await waitFor(() => {
        // Verify API request
        const parsedBody = JSON.parse(capturedRequest.body)
        expect(parsedBody).toMatchObject({
          query: 'test-query',
          filters: {
            status: 'active',
            limit: 10,
            market: 'TEST_MARKET',
            region: 'TEST_REGION',
            branch: 'TEST_BRANCH',
          },
          role: 'rep',
          userId: 'test-user-id',
        })

        // Verify transformed data
        expect(result.current.data).toEqual({
          total: 300,
          items: [
            { id: 1, name: 'Test 1', value: 100, label: 'Test 1 ($100)' },
            { id: 2, name: 'Test 2', value: 200, label: 'Test 2 ($200)' },
          ],
        })

        // Verify metadata
        expect(result.current.responseTime).toBe(300)
        expect(result.current.dataSource).toBe('bigquery')
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeUndefined()
      }, { timeout: 5000 })
    })

    it('should handle error recovery after successful refetch', async () => {
      let attempt = 0

      mockFetch.mockImplementation(async () => {
        attempt++
        if (attempt === 1) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: false,
              error: 'First attempt failed',
              errorCode: 'NETWORK_ERROR',
              timestamp: new Date().toISOString(),
            }),
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            query: 'test-query',
            data: [{ id: 1 }],
            metadata: {
              responseTime: 100,
              timestamp: new Date().toISOString(),
              source: 'bigquery',
            },
          }),
        }
      })

      const { result } = renderHook(() =>
        useBigQueryData({
          queryName: 'test-query',
          defaultData: { items: [] },
          transformBigQueryData: (raw) => ({ items: raw }),
        })
      )

      // Wait for initial error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.dataSource).toBe('error')
      }, { timeout: 5000 })

      // Refetch should succeed
      result.current.refetch()

      await waitFor(() => {
        expect(result.current.error).toBeUndefined()
        expect(result.current.data.items).toEqual([{ id: 1 }])
        expect(result.current.dataSource).toBe('bigquery')
      }, { timeout: 5000 })
    })
  })
})
