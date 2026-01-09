/**
 * PDF Parse API Route
 *
 * Handles Start Packet PDF uploads, extracts text, and returns structured data.
 * In production, this would use a PDF parsing library like pdf-parse or pdf.js.
 * For the demo, we simulate extraction with mock data.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  processStartPacketPDF,
  parseMockStartPacket,
  type PDFUploadResult,
  type ParserOptions,
} from '@/services/pdf-parser'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // Handle form data upload (actual PDF file)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const options: ParserOptions = {
        skipValidation: formData.get('skipValidation') === 'true',
        debug: formData.get('debug') === 'true',
        autoCorrect: formData.get('autoCorrect') !== 'false',
      }

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        )
      }

      // Validate file type
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          { success: false, error: 'File must be a PDF' },
          { status: 400 }
        )
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'File size must be less than 10MB' },
          { status: 400 }
        )
      }

      // In production, we would use pdf-parse or similar library here
      // For the demo, we'll simulate with mock data based on filename
      const fileName = file.name.toLowerCase()

      // Determine scenario based on filename hints
      let scenario: 'commercial' | 'residential' | 'termite' = 'commercial'
      if (fileName.includes('residential') || fileName.includes('home') || fileName.includes('house')) {
        scenario = 'residential'
      } else if (fileName.includes('termite') || fileName.includes('wdo') || fileName.includes('sentricon')) {
        scenario = 'termite'
      }

      // Get mock parsed data
      const mockParsed = parseMockStartPacket(scenario)

      // Override with actual filename
      mockParsed.meta.pdfFileName = file.name
      mockParsed.meta.extractedAt = new Date().toISOString()

      // Process through the full pipeline
      const result = await processStartPacketPDF(
        '', // In production, this would be extracted text
        file.name,
        mockParsed.meta.pdfPageCount,
        options
      )

      // Use mock data since we can't actually parse the PDF in this demo
      result.parsedData = mockParsed

      return NextResponse.json(result)
    }

    // Handle JSON request (for testing with pre-extracted text)
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { text, fileName, pageCount, options, useMock, mockScenario } = body

      // For demo/testing: return mock data
      if (useMock) {
        const scenario = mockScenario || 'commercial'
        const mockParsed = parseMockStartPacket(scenario)
        const result = await processStartPacketPDF(
          '',
          mockParsed.meta.pdfFileName,
          mockParsed.meta.pdfPageCount,
          options || {}
        )
        result.parsedData = mockParsed
        return NextResponse.json(result)
      }

      // Process actual text
      if (!text) {
        return NextResponse.json(
          { success: false, error: 'No text provided for parsing' },
          { status: 400 }
        )
      }

      const result = await processStartPacketPDF(
        text,
        fileName || 'uploaded.pdf',
        pageCount || 1,
        options || {}
      )

      return NextResponse.json(result)
    }

    return NextResponse.json(
      { success: false, error: 'Invalid content type. Use multipart/form-data or application/json' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[PDF Parse API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing PDF',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'PDF Parser',
    version: '1.0.0',
    supportedFormats: ['pdf'],
    maxFileSize: '10MB',
    endpoints: {
      POST: {
        'multipart/form-data': 'Upload PDF file directly',
        'application/json': 'Send pre-extracted text or request mock data',
      },
    },
    mockScenarios: ['commercial', 'residential', 'termite'],
  })
}
