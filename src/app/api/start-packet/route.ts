import { NextRequest, NextResponse } from 'next/server'
import type { StartPacket, StartPacketCreateResponse } from '@/types/salesforce-quote'

// In-memory storage for demo mode
// In production, this would use Supabase
const startPackets: Map<string, StartPacket> = new Map()

function generateId(): string {
  return `SP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * POST /api/start-packet
 * Create a new start packet from parsed Salesforce quote data
 */
export async function POST(request: NextRequest): Promise<NextResponse<StartPacketCreateResponse>> {
  try {
    const data = await request.json()

    const id = generateId()
    const now = new Date().toISOString()

    const startPacket: StartPacket = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      pdfStorageKey: data.pdfStorageKey || null,
      emailSent: false,
      emailSentAt: null,
    }

    // Store in memory (demo mode)
    startPackets.set(id, startPacket)

    console.log('[Start Packet] Created:', id, {
      accountName: startPacket.accountName,
      initialTotal: startPacket.combinedInitialTotal,
      monthlyTotal: startPacket.servicesMonthlyTotal,
    })

    return NextResponse.json({
      success: true,
      startPacket,
      message: 'Start packet created successfully',
    })
  } catch (error) {
    console.error('[Start Packet] Create error:', error)
    return NextResponse.json(
      {
        success: false,
        startPacket: null as unknown as StartPacket,
        message: error instanceof Error ? error.message : 'Failed to create start packet',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/start-packet
 * List all start packets (for demo purposes)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const packets = Array.from(startPackets.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      startPackets: packets,
      count: packets.length,
    })
  } catch (error) {
    console.error('[Start Packet] List error:', error)
    return NextResponse.json(
      {
        success: false,
        startPackets: [],
        count: 0,
        message: error instanceof Error ? error.message : 'Failed to list start packets',
      },
      { status: 500 }
    )
  }
}
