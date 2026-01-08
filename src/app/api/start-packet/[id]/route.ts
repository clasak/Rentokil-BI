import { NextRequest, NextResponse } from 'next/server'
import type { StartPacket, StartPacketStatus } from '@/types/salesforce-quote'

// In-memory storage for demo mode (shared with main route)
// In production, this would use Supabase
const startPackets: Map<string, StartPacket> = new Map()

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/start-packet/[id]
 * Retrieve a specific start packet by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params
    const startPacket = startPackets.get(id)

    if (!startPacket) {
      return NextResponse.json(
        {
          success: false,
          startPacket: null,
          message: 'Start packet not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      startPacket,
    })
  } catch (error) {
    console.error('[Start Packet] Get error:', error)
    return NextResponse.json(
      {
        success: false,
        startPacket: null,
        message: error instanceof Error ? error.message : 'Failed to get start packet',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/start-packet/[id]
 * Update a start packet
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params
    const updates = await request.json()

    const existing = startPackets.get(id)
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          startPacket: null,
          message: 'Start packet not found',
        },
        { status: 404 }
      )
    }

    const updated: StartPacket = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      createdAt: existing.createdAt, // Prevent creation date change
      updatedAt: new Date().toISOString(),
    }

    startPackets.set(id, updated)

    console.log('[Start Packet] Updated:', id, {
      status: updated.status,
      emailSent: updated.emailSent,
    })

    return NextResponse.json({
      success: true,
      startPacket: updated,
      message: 'Start packet updated successfully',
    })
  } catch (error) {
    console.error('[Start Packet] Update error:', error)
    return NextResponse.json(
      {
        success: false,
        startPacket: null,
        message: error instanceof Error ? error.message : 'Failed to update start packet',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/start-packet/[id]
 * Delete a start packet
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!startPackets.has(id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Start packet not found',
        },
        { status: 404 }
      )
    }

    startPackets.delete(id)

    console.log('[Start Packet] Deleted:', id)

    return NextResponse.json({
      success: true,
      message: 'Start packet deleted successfully',
    })
  } catch (error) {
    console.error('[Start Packet] Delete error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete start packet',
      },
      { status: 500 }
    )
  }
}
