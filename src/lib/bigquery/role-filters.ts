/**
 * Role-Based Query Filters
 *
 * Generates BigQuery filters based on the current user's role and assigned scope.
 * This ensures each role only sees data relevant to their position:
 * - AE: Their own sales/proposals (by SalesPerson name)
 * - Technician: Their own routes/tickets (by employee ID)
 * - Branch Manager: Their assigned branch
 * - Region Director/Sales Manager: Their assigned region(s)
 * - Market VP/Sales Director: Their assigned market(s)
 * - Exec: No filtering (sees all)
 */

import type { User, Role } from '@/types'

export interface RoleBasedFilters {
  salesPerson?: string
  technicianId?: string
  employeeId?: string
  branchCode?: string
  regionCode?: string
  marketCode?: string
  _denyAll?: boolean // Unknown roles get maximum restriction to prevent privilege escalation
}

/**
 * Generate BigQuery filters based on user's role and assigned scope.
 * Returns filters that should be automatically applied to queries.
 *
 * @param user - The current user (or previewed employee for admins)
 * @returns Filters to merge into BigQuery query options
 */
export function getRoleBasedFilters(user: User | null): RoleBasedFilters {
  if (!user) return {}

  const role = user.role as Role

  // For synthetic preview users (name starts with "Preview"), don't apply identity filters
  // This allows admins to preview roles without having to select a specific employee
  const isPreviewUser = user.name?.startsWith('Preview ') ?? false

  switch (role) {
    // Individual contributor roles - filter by user identity
    case 'rep':
      // AE sees only their own data - filter by name since BigQuery uses SalesPerson
      // Skip filter for preview users (they don't have real data in BigQuery)
      if (isPreviewUser) {
        return {}
      }
      return {
        salesPerson: user.name,
      }

    case 'technician':
      // Technician sees only their routes/tickets
      // Skip filter for preview users (they don't have real data in BigQuery)
      if (isPreviewUser) {
        return {}
      }
      return {
        technicianId: user.id,
        employeeId: user.id,
      }

    // Management roles - filter by assigned org hierarchy
    case 'manager':
      // Branch Manager sees only their assigned branch(es)
      if (user.assignedBranches && user.assignedBranches.length > 0) {
        return {
          branchCode: user.assignedBranches[0], // Primary branch
        }
      }
      return {}

    case 'sales_manager':
      // Sales Manager sees their team's data (branch-scoped)
      if (user.assignedBranches && user.assignedBranches.length > 0) {
        return {
          branchCode: user.assignedBranches[0],
        }
      }
      return {}

    case 'ops_manager':
      // Ops Manager sees their assigned branch's technicians
      if (user.assignedBranches && user.assignedBranches.length > 0) {
        return {
          branchCode: user.assignedBranches[0],
        }
      }
      return {}

    case 'region_director':
    case 'region_sales_manager':
      // Region roles see all branches in their region(s)
      if (user.assignedRegions && user.assignedRegions.length > 0) {
        return {
          regionCode: user.assignedRegions[0], // Primary region
        }
      }
      return {}

    case 'market_vp':
    case 'market_sales_director':
      // Market roles see all regions/branches in their market(s)
      if (user.assignedMarkets && user.assignedMarkets.length > 0) {
        return {
          marketCode: user.assignedMarkets[0], // Primary market
        }
      }
      return {}

    case 'exec':
      // Executive/admin sees all data - no automatic filtering
      // Org-level filtering (market/region/branch) is handled separately via includeOrgFilters
      return {}

    default:
      // Unknown roles get maximum restriction - deny all data by default
      // This prevents privilege escalation from corrupted/invalid role values
      return {
        _denyAll: true,
      }
  }
}

/**
 * Determine if a role should have automatic data filtering applied.
 * Returns false for roles that should see all data (none by default now).
 * All roles including exec now see their own data by default.
 */
export function shouldApplyRoleFilters(role: Role): boolean {
  // All roles now have automatic filtering to their own data
  // Even exec/admin see their own data by default (can search for others via UI)
  return true
}

/**
 * Get the effective user for query filtering.
 * For admins in preview mode, returns the previewed employee.
 * Otherwise returns the current logged-in user.
 *
 * @param currentUser - The actual logged-in user
 * @param previewedEmployee - The employee being previewed (admin mode)
 * @param isPreviewingRole - Whether admin is in role preview mode
 */
export function getEffectiveUserForFiltering(
  currentUser: User | null,
  previewedEmployee: User | null,
  isPreviewingRole: boolean
): User | null {
  if (isPreviewingRole && previewedEmployee) {
    return previewedEmployee
  }
  return currentUser
}
