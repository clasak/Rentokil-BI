// IndexedDB-based offline storage for Rentokil BI

const DB_NAME = 'rentokil-bi-offline'
const DB_VERSION = 1

// Store names
const STORES = {
  KPI_CACHE: 'kpi-cache',
  API_CACHE: 'api-cache',
  OFFLINE_ACTIONS: 'offline-actions',
  USER_DATA: 'user-data',
} as const

interface KPICacheEntry {
  slug: string
  value: number
  target?: number
  status?: string
  trend?: string
  timestamp: number
}

interface APICacheEntry {
  url: string
  data: unknown
  timestamp: number
  expiresAt: number
}

interface OfflineAction {
  id?: number
  type: string
  endpoint: string
  method: string
  body?: unknown
  timestamp: number
  synced: boolean
  retryCount: number
}

interface UserDataEntry {
  key: string
  value: unknown
  timestamp: number
}

class OfflineStorage {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    // Return existing init promise if already initializing
    if (this.initPromise) {
      return this.initPromise
    }

    // Return immediately if already initialized
    if (this.db) {
      return
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.log('[OfflineStorage] IndexedDB not available')
      return
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database:', request.error)
        reject(new Error('Failed to open offline database'))
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[OfflineStorage] Database opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // KPI Cache store
        if (!db.objectStoreNames.contains(STORES.KPI_CACHE)) {
          const kpiStore = db.createObjectStore(STORES.KPI_CACHE, { keyPath: 'slug' })
          kpiStore.createIndex('timestamp', 'timestamp')
        }

        // API Cache store
        if (!db.objectStoreNames.contains(STORES.API_CACHE)) {
          const apiStore = db.createObjectStore(STORES.API_CACHE, { keyPath: 'url' })
          apiStore.createIndex('timestamp', 'timestamp')
          apiStore.createIndex('expiresAt', 'expiresAt')
        }

        // Offline Actions Queue
        if (!db.objectStoreNames.contains(STORES.OFFLINE_ACTIONS)) {
          const actionsStore = db.createObjectStore(STORES.OFFLINE_ACTIONS, {
            keyPath: 'id',
            autoIncrement: true,
          })
          actionsStore.createIndex('timestamp', 'timestamp')
          actionsStore.createIndex('synced', 'synced')
          actionsStore.createIndex('type', 'type')
        }

        // User Data store
        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' })
        }

        console.log('[OfflineStorage] Database schema created/upgraded')
      }
    })

    return this.initPromise
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInit(): Promise<boolean> {
    await this.init()
    return this.db !== null
  }

  // ============================================
  // KPI CACHE OPERATIONS
  // ============================================

  /**
   * Cache KPI data
   */
  async cacheKPIs(kpis: Omit<KPICacheEntry, 'timestamp'>[]): Promise<void> {
    if (!(await this.ensureInit())) return

    const transaction = this.db!.transaction([STORES.KPI_CACHE], 'readwrite')
    const store = transaction.objectStore(STORES.KPI_CACHE)
    const timestamp = Date.now()

    for (const kpi of kpis) {
      store.put({ ...kpi, timestamp })
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get all cached KPIs
   */
  async getCachedKPIs(): Promise<KPICacheEntry[]> {
    if (!(await this.ensureInit())) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.KPI_CACHE], 'readonly')
      const store = transaction.objectStore(STORES.KPI_CACHE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a single cached KPI
   */
  async getCachedKPI(slug: string): Promise<KPICacheEntry | null> {
    if (!(await this.ensureInit())) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.KPI_CACHE], 'readonly')
      const store = transaction.objectStore(STORES.KPI_CACHE)
      const request = store.get(slug)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // ============================================
  // API CACHE OPERATIONS
  // ============================================

  /**
   * Cache API response
   */
  async cacheAPIResponse(url: string, data: unknown, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    if (!(await this.ensureInit())) return

    const timestamp = Date.now()
    const entry: APICacheEntry = {
      url,
      data,
      timestamp,
      expiresAt: timestamp + ttlMs,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.API_CACHE], 'readwrite')
      const store = transaction.objectStore(STORES.API_CACHE)
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get cached API response (returns null if expired)
   */
  async getCachedAPIResponse<T = unknown>(url: string): Promise<T | null> {
    if (!(await this.ensureInit())) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.API_CACHE], 'readonly')
      const store = transaction.objectStore(STORES.API_CACHE)
      const request = store.get(url)

      request.onsuccess = () => {
        const entry = request.result as APICacheEntry | undefined
        if (!entry) {
          resolve(null)
          return
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
          // Delete expired entry
          this.deleteAPICache(url)
          resolve(null)
          return
        }

        resolve(entry.data as T)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete cached API response
   */
  async deleteAPICache(url: string): Promise<void> {
    if (!(await this.ensureInit())) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.API_CACHE], 'readwrite')
      const store = transaction.objectStore(STORES.API_CACHE)
      const request = store.delete(url)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear expired API cache entries
   */
  async clearExpiredAPICache(): Promise<number> {
    if (!(await this.ensureInit())) return 0

    const now = Date.now()
    let deletedCount = 0

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.API_CACHE], 'readwrite')
      const store = transaction.objectStore(STORES.API_CACHE)
      const index = store.index('expiresAt')
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        }
      }

      transaction.oncomplete = () => resolve(deletedCount)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // ============================================
  // OFFLINE ACTIONS QUEUE
  // ============================================

  /**
   * Queue an action to be synced when online
   */
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<number> {
    if (!(await this.ensureInit())) throw new Error('Database not initialized')

    const entry: Omit<OfflineAction, 'id'> = {
      ...action,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.OFFLINE_ACTIONS], 'readwrite')
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS)
      const request = store.add(entry)

      request.onsuccess = () => resolve(request.result as number)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all pending (unsynced) actions
   */
  async getPendingActions(): Promise<OfflineAction[]> {
    if (!(await this.ensureInit())) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.OFFLINE_ACTIONS], 'readonly')
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS)
      const results: OfflineAction[] = []
      const request = store.openCursor()

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const action = cursor.value as OfflineAction
          if (!action.synced) {
            results.push(action)
          }
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Mark an action as synced
   */
  async markActionSynced(id: number): Promise<void> {
    if (!(await this.ensureInit())) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.OFFLINE_ACTIONS], 'readwrite')
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const action = getRequest.result as OfflineAction | undefined
        if (action) {
          action.synced = true
          const putRequest = store.put(action)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Increment retry count for an action
   */
  async incrementRetryCount(id: number): Promise<number> {
    if (!(await this.ensureInit())) return 0

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.OFFLINE_ACTIONS], 'readwrite')
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const action = getRequest.result as OfflineAction | undefined
        if (action) {
          action.retryCount++
          const putRequest = store.put(action)
          putRequest.onsuccess = () => resolve(action.retryCount)
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve(0)
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Delete an action from the queue
   */
  async deleteAction(id: number): Promise<void> {
    if (!(await this.ensureInit())) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.OFFLINE_ACTIONS], 'readwrite')
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all synced actions
   */
  async clearSyncedActions(): Promise<number> {
    if (!(await this.ensureInit())) return 0

    let deletedCount = 0

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.OFFLINE_ACTIONS], 'readwrite')
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS)
      const request = store.openCursor()

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const action = cursor.value as OfflineAction
          if (action.synced) {
            cursor.delete()
            deletedCount++
          }
          cursor.continue()
        }
      }

      transaction.oncomplete = () => resolve(deletedCount)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // ============================================
  // USER DATA OPERATIONS
  // ============================================

  /**
   * Save user data
   */
  async saveUserData(key: string, value: unknown): Promise<void> {
    if (!(await this.ensureInit())) return

    const entry: UserDataEntry = {
      key,
      value,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.USER_DATA], 'readwrite')
      const store = transaction.objectStore(STORES.USER_DATA)
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get user data
   */
  async getUserData<T = unknown>(key: string): Promise<T | null> {
    if (!(await this.ensureInit())) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.USER_DATA], 'readonly')
      const store = transaction.objectStore(STORES.USER_DATA)
      const request = store.get(key)

      request.onsuccess = () => {
        const entry = request.result as UserDataEntry | undefined
        resolve(entry ? (entry.value as T) : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete user data
   */
  async deleteUserData(key: string): Promise<void> {
    if (!(await this.ensureInit())) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.USER_DATA], 'readwrite')
      const store = transaction.objectStore(STORES.USER_DATA)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    if (!(await this.ensureInit())) return

    const stores = Object.values(STORES)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite')

      for (const storeName of stores) {
        transaction.objectStore(storeName).clear()
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    kpiCount: number
    apiCacheCount: number
    pendingActionsCount: number
    userDataCount: number
  }> {
    if (!(await this.ensureInit())) {
      return { kpiCount: 0, apiCacheCount: 0, pendingActionsCount: 0, userDataCount: 0 }
    }

    const counts = await Promise.all([
      this.getCount(STORES.KPI_CACHE),
      this.getCount(STORES.API_CACHE),
      this.getCount(STORES.OFFLINE_ACTIONS),
      this.getCount(STORES.USER_DATA),
    ])

    return {
      kpiCount: counts[0],
      apiCacheCount: counts[1],
      pendingActionsCount: counts[2],
      userDataCount: counts[3],
    }
  }

  private async getCount(storeName: string): Promise<number> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(0)
    })
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage()
