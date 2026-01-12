import { NextResponse } from 'next/server'
import { KPI_DICTIONARY, TOP_10_KPIS } from '@/lib/kpis'
import crypto from 'crypto'

interface KPIDefinitionExport {
  slug: string
  name: string
  category: string
  definition: string
  formula?: string
  calculationNotes?: string
  primarySource: string
  refreshCadence: string
  owner: string
  target?: number
  warningThreshold?: number
  criticalThreshold?: number
  higherIsBetter: boolean
  format: string
}

interface DefinitionsResponse {
  success: boolean
  timestamp: string
  hash: string
  kpi_count: number
  definitions: KPIDefinitionExport[]
  top10: string[]
}

/**
 * GET /api/governance/definitions
 * Returns current KPI definitions for Tina governance agent
 *
 * Used by Tina to:
 * - Snapshot current definitions
 * - Compare against previous snapshots
 * - Detect unauthorized changes
 */
export async function GET(): Promise<NextResponse<DefinitionsResponse>> {
  try {
    // Extract relevant fields for governance tracking
    const definitions: KPIDefinitionExport[] = KPI_DICTIONARY.map(kpi => ({
      slug: kpi.slug,
      name: kpi.name,
      category: kpi.category,
      definition: kpi.definition,
      formula: kpi.formula,
      calculationNotes: kpi.calculationNotes,
      primarySource: kpi.primarySource,
      refreshCadence: kpi.refreshCadence,
      owner: kpi.owner,
      target: kpi.target,
      warningThreshold: kpi.warningThreshold,
      criticalThreshold: kpi.criticalThreshold,
      higherIsBetter: kpi.higherIsBetter,
      format: kpi.format,
    }))

    // Create hash of definitions for quick comparison
    const definitionsString = JSON.stringify(definitions)
    const hash = crypto
      .createHash('sha256')
      .update(definitionsString)
      .digest('hex')
      .substring(0, 16) // Short hash for readability

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      hash,
      kpi_count: definitions.length,
      definitions,
      top10: TOP_10_KPIS,
    })
  } catch (error) {
    console.error('[Governance Definitions API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        hash: '',
        kpi_count: 0,
        definitions: [],
        top10: [],
      },
      { status: 500 }
    )
  }
}
