import { NextRequest, NextResponse } from 'next/server'

/**
 * RTX API Authentication
 *
 * Validates requests to internal RTX API endpoints.
 * These endpoints should only be called by:
 * - n8n workflows (using INTERNAL_API_KEY)
 * - Internal services
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const auth = validateRTXApiRequest(request)
 *   if (!auth.valid) return auth.error!
 *   // ... rest of handler
 * }
 * ```
 */

export interface RTXAuthResult {
  valid: boolean
  // Using 'never' return type allows this to be assigned to any NextResponse<T>
  // since a function returning 'never' is compatible with any return type
  error?: NextResponse<never>
}

/**
 * Validate an incoming request to RTX API endpoints
 *
 * @param request - The incoming NextRequest
 * @param options - Optional configuration
 * @returns Object with valid flag and optional error response
 */
export function validateRTXApiRequest(
  request: NextRequest,
  options: { allowPublicRead?: boolean } = {}
): RTXAuthResult {
  const { allowPublicRead = false } = options

  // Allow public GET requests if specified (for dashboard consumption)
  if (allowPublicRead && request.method === 'GET') {
    return { valid: true }
  }

  // Get the internal API key from environment
  const internalKey = process.env.INTERNAL_API_KEY

  // Skip auth in development mode or if no key is configured
  // This allows local development without key setup
  if (process.env.NODE_ENV === 'development') {
    return { valid: true }
  }

  // If no key is configured in production, log warning but allow
  // This supports gradual rollout
  if (!internalKey) {
    console.warn('[RTX Auth] INTERNAL_API_KEY not configured - authentication bypassed')
    return { valid: true }
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          message: 'Authorization header required',
          code: 'AUTH_MISSING'
        },
        { status: 401 }
      ) as NextResponse<never>
    }
  }

  // Validate Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          message: 'Invalid authorization format. Use: Bearer <token>',
          code: 'AUTH_FORMAT_INVALID'
        },
        { status: 401 }
      ) as NextResponse<never>
    }
  }

  const token = authHeader.slice(7) // Remove 'Bearer ' prefix

  // Validate token matches internal key
  if (token !== internalKey) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          message: 'Invalid API key',
          code: 'AUTH_INVALID'
        },
        { status: 401 }
      ) as NextResponse<never>
    }
  }

  return { valid: true }
}

/**
 * Generate headers for internal API calls
 * Use this when calling RTX endpoints from server-side code
 */
export function getInternalAuthHeaders(): Record<string, string> {
  const internalKey = process.env.INTERNAL_API_KEY

  if (!internalKey) {
    return {}
  }

  return {
    Authorization: `Bearer ${internalKey}`
  }
}
