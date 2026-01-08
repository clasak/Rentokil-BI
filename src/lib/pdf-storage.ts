/**
 * PDF Storage Utility
 *
 * IndexedDB-based storage for PDF files in demo mode.
 * In production, this would use Supabase Storage.
 */

import type { PDFStorageMetadata } from '@/types/salesforce-quote'

const DB_NAME = 'rentokil-bi-pdf-storage'
const DB_VERSION = 1
const STORE_NAME = 'pdfs'
const METADATA_STORE = 'metadata'

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open database'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store for PDF blobs
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }

      // Create object store for metadata
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' })
        metadataStore.createIndex('startPacketId', 'startPacketId', { unique: false })
        metadataStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
      }
    }
  })
}

/**
 * Generate a unique storage key
 */
export function generateStorageKey(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `pdf-${timestamp}-${random}`
}

/**
 * Store a PDF file in IndexedDB
 */
export async function storePdf(
  file: File,
  startPacketId?: string
): Promise<PDFStorageMetadata> {
  const db = await openDatabase()
  const key = generateStorageKey()

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()

  // Store the PDF blob
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.put({
      key,
      data: arrayBuffer,
      mimeType: file.type,
    })

    request.onerror = () => reject(new Error('Failed to store PDF'))
    request.onsuccess = () => resolve()
  })

  // Create and store metadata
  const metadata: PDFStorageMetadata = {
    key,
    filename: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    startPacketId: startPacketId || null,
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readwrite')
    const store = transaction.objectStore(METADATA_STORE)

    const request = store.put(metadata)

    request.onerror = () => reject(new Error('Failed to store metadata'))
    request.onsuccess = () => resolve()
  })

  db.close()

  console.log('[PDF Storage] Stored PDF:', { key, filename: file.name, size: file.size })

  return metadata
}

/**
 * Retrieve a PDF file from IndexedDB
 */
export async function retrievePdf(key: string): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
  const db = await openDatabase()

  const result = await new Promise<{ data: ArrayBuffer; mimeType: string } | null>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.get(key)

    request.onerror = () => reject(new Error('Failed to retrieve PDF'))
    request.onsuccess = () => {
      if (request.result) {
        resolve({
          data: request.result.data,
          mimeType: request.result.mimeType,
        })
      } else {
        resolve(null)
      }
    }
  })

  db.close()
  return result
}

/**
 * Get metadata for a stored PDF
 */
export async function getPdfMetadata(key: string): Promise<PDFStorageMetadata | null> {
  const db = await openDatabase()

  const result = await new Promise<PDFStorageMetadata | null>((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readonly')
    const store = transaction.objectStore(METADATA_STORE)

    const request = store.get(key)

    request.onerror = () => reject(new Error('Failed to retrieve metadata'))
    request.onsuccess = () => {
      resolve(request.result || null)
    }
  })

  db.close()
  return result
}

/**
 * List all stored PDFs
 */
export async function listStoredPdfs(): Promise<PDFStorageMetadata[]> {
  const db = await openDatabase()

  const results = await new Promise<PDFStorageMetadata[]>((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readonly')
    const store = transaction.objectStore(METADATA_STORE)

    const request = store.getAll()

    request.onerror = () => reject(new Error('Failed to list PDFs'))
    request.onsuccess = () => {
      resolve(request.result || [])
    }
  })

  db.close()
  return results
}

/**
 * Get PDFs associated with a start packet
 */
export async function getPdfsForStartPacket(startPacketId: string): Promise<PDFStorageMetadata[]> {
  const db = await openDatabase()

  const results = await new Promise<PDFStorageMetadata[]>((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readonly')
    const store = transaction.objectStore(METADATA_STORE)
    const index = store.index('startPacketId')

    const request = index.getAll(startPacketId)

    request.onerror = () => reject(new Error('Failed to get PDFs for start packet'))
    request.onsuccess = () => {
      resolve(request.result || [])
    }
  })

  db.close()
  return results
}

/**
 * Delete a stored PDF
 */
export async function deletePdf(key: string): Promise<boolean> {
  const db = await openDatabase()

  // Delete from both stores
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)
      request.onerror = () => reject(new Error('Failed to delete PDF'))
      request.onsuccess = () => resolve()
    }),
    new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readwrite')
      const store = transaction.objectStore(METADATA_STORE)
      const request = store.delete(key)
      request.onerror = () => reject(new Error('Failed to delete metadata'))
      request.onsuccess = () => resolve()
    }),
  ])

  db.close()

  console.log('[PDF Storage] Deleted PDF:', key)

  return true
}

/**
 * Update metadata to associate PDF with a start packet
 */
export async function associatePdfWithStartPacket(
  key: string,
  startPacketId: string
): Promise<PDFStorageMetadata | null> {
  const metadata = await getPdfMetadata(key)
  if (!metadata) return null

  const updatedMetadata: PDFStorageMetadata = {
    ...metadata,
    startPacketId,
  }

  const db = await openDatabase()

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readwrite')
    const store = transaction.objectStore(METADATA_STORE)

    const request = store.put(updatedMetadata)

    request.onerror = () => reject(new Error('Failed to update metadata'))
    request.onsuccess = () => resolve()
  })

  db.close()

  return updatedMetadata
}

/**
 * Create a downloadable blob URL from stored PDF
 */
export async function createPdfBlobUrl(key: string): Promise<string | null> {
  const pdf = await retrievePdf(key)
  if (!pdf) return null

  const blob = new Blob([pdf.data], { type: pdf.mimeType })
  return URL.createObjectURL(blob)
}

/**
 * Clean up old PDFs (older than specified days)
 */
export async function cleanupOldPdfs(maxAgeDays: number = 30): Promise<number> {
  const allPdfs = await listStoredPdfs()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

  let deletedCount = 0

  for (const pdf of allPdfs) {
    const uploadedAt = new Date(pdf.uploadedAt)
    if (uploadedAt < cutoffDate) {
      await deletePdf(pdf.key)
      deletedCount++
    }
  }

  if (deletedCount > 0) {
    console.log(`[PDF Storage] Cleaned up ${deletedCount} old PDFs`)
  }

  return deletedCount
}

/**
 * Get total storage usage
 */
export async function getStorageUsage(): Promise<{ count: number; totalSize: number }> {
  const allPdfs = await listStoredPdfs()

  return {
    count: allPdfs.length,
    totalSize: allPdfs.reduce((sum, pdf) => sum + pdf.size, 0),
  }
}

/**
 * Check if IndexedDB is available
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.indexedDB
}
