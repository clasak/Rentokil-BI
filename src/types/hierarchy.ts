// Hierarchical KPI aggregation types for cascading data flow
// Rep → Branch Manager → Region Director → Market Director → Exec

import { Role, KPIValue, AggregationType, WeightField } from './index'

// Re-export for convenience
export type { AggregationType, WeightField } from './index'

/**
 * Hierarchical level in the organization
 */
export type HierarchyLevel =
  | 'individual'   // Rep, Technician
  | 'team'         // Sales Manager's team, Ops Manager's technicians
  | 'branch'       // Branch Manager's branch
  | 'region'       // Region Director's region
  | 'market'       // Market Director's market
  | 'company'      // Executive - entire company

/**
 * Mapping of roles to their hierarchy level
 */
export const ROLE_TO_HIERARCHY_LEVEL: Record<Role, HierarchyLevel> = {
  'rep': 'individual',
  'technician': 'individual',
  'sales_manager': 'team',
  'ops_manager': 'team',
  'manager': 'branch',
  'region_director': 'region',
  'market_director': 'market',
  'exec': 'company',
}

/**
 * Hierarchy level order for aggregation (lower = more granular)
 */
export const HIERARCHY_LEVEL_ORDER: Record<HierarchyLevel, number> = {
  'individual': 0,
  'team': 1,
  'branch': 2,
  'region': 3,
  'market': 4,
  'company': 5,
}

/**
 * Node in the organizational hierarchy tree
 */
export interface OrgNode {
  id: string
  name: string
  level: HierarchyLevel
  role?: Role
  parentId?: string
  children?: OrgNode[]
  // Metadata for filtering/aggregation
  marketId?: string
  regionId?: string
  branchId?: string
  userId?: string
}

/**
 * Aggregation path from a node up to the root
 */
export interface AggregationLevel {
  level: HierarchyLevel
  id: string
  name: string
  parentId?: string
  entityType: 'user' | 'branch' | 'region' | 'market' | 'company'
}

/**
 * KPI value with hierarchical context
 */
export interface HierarchicalKPIValue extends KPIValue {
  // Aggregation metadata
  aggregationType: AggregationType
  weightField?: WeightField
  // Breakdown info
  subordinateCount?: number
  totalWeight?: number  // For weighted averages
}

/**
 * Result of hierarchical KPI calculation
 */
export interface HierarchicalKPIResult {
  // Current level info
  level: AggregationLevel

  // KPIs at this level (aggregated from subordinates if applicable)
  kpis: HierarchicalKPIValue[]

  // Subordinate breakdown (if manager+ role)
  subordinates?: SubordinateKPIResult[]

  // Contribution to parent (if applicable)
  contributionPercent?: number
}

/**
 * KPI result for a subordinate entity
 */
export interface SubordinateKPIResult {
  // Entity identification
  subordinateId: string
  subordinateName: string
  subordinateType: 'user' | 'branch' | 'region' | 'market'
  subordinateRole?: Role

  // KPIs for this subordinate
  kpis: HierarchicalKPIValue[]

  // Contribution to parent's totals
  contributionPercent: number

  // Can drill down further?
  hasSubordinates: boolean
  subordinateCount?: number
}

/**
 * Configuration for how a KPI should be aggregated
 */
export interface KPIAggregationConfig {
  slug: string
  aggregationType: AggregationType
  weightField?: WeightField
  // Custom aggregation function name (for complex cases)
  customAggregator?: string
}

/**
 * Summary of aggregation for a hierarchy level
 */
export interface AggregationSummary {
  level: HierarchyLevel
  totalEntities: number
  reportingEntities: number
  aggregatedValue: number
  previousValue: number
  delta: number
  deltaPercent: number
  topContributors: {
    id: string
    name: string
    value: number
    percent: number
  }[]
  bottomContributors: {
    id: string
    name: string
    value: number
    percent: number
  }[]
}

/**
 * Request for hierarchical KPI data
 */
export interface HierarchicalKPIRequest {
  role: Role
  userId: string
  kpiSlugs?: string[]  // Optional filter to specific KPIs
  includeSubordinates?: boolean
  subordinateDepth?: number  // How many levels deep to include (default: 1)
  asOfDate?: Date
}

/**
 * Response from hierarchical KPI endpoint
 */
export interface HierarchicalKPIResponse {
  request: HierarchicalKPIRequest
  result: HierarchicalKPIResult
  generatedAt: Date
  cacheKey?: string
}
