/**
 * Organizational Hierarchy Helper Module
 *
 * Provides functions for navigating the organizational hierarchy
 * and supporting hierarchical KPI aggregation.
 *
 * Hierarchy:
 *   Exec (company-wide)
 *     → Market Director (market level)
 *       → Region Director (region level)
 *         → Branch Manager (branch level)
 *           → Sales Manager / Ops Manager (team level)
 *             → Rep / Technician (individual level)
 */

import { Role, User, Market, Branch, Region } from '@/types'
import {
  OrgNode,
  AggregationLevel,
  HierarchyLevel,
  ROLE_TO_HIERARCHY_LEVEL,
  HIERARCHY_LEVEL_ORDER,
} from '@/types/hierarchy'
import {
  getMarkets,
  getRegions,
  getBranches,
  getUsers,
  getUserById,
  getRegionsByMarket,
  getBranchesByRegion,
} from './data'

/**
 * Build the complete organizational hierarchy tree
 */
export function getOrganizationalHierarchy(): OrgNode {
  const markets = getMarkets()
  const regions = getRegions()
  const branches = getBranches()
  const users = getUsers()

  // Root node (company level)
  const root: OrgNode = {
    id: 'company',
    name: 'Rentokil North America',
    level: 'company',
    children: [],
  }

  // Build market nodes
  root.children = markets.map(market => {
    const marketRegions = regions.filter(r => r.marketId === market.id)

    const marketNode: OrgNode = {
      id: market.id,
      name: market.name,
      level: 'market',
      parentId: 'company',
      marketId: market.id,
      children: [],
    }

    // Build region nodes under each market
    marketNode.children = marketRegions.map(region => {
      const regionBranches = branches.filter(b => b.regionId === region.id)

      const regionNode: OrgNode = {
        id: region.id,
        name: region.name,
        level: 'region',
        parentId: market.id,
        marketId: market.id,
        regionId: region.id,
        children: [],
      }

      // Build branch nodes under each region
      regionNode.children = regionBranches.map(branch => {
        const branchUsers = users.filter(u =>
          u.assignedBranches.includes(branch.id)
        )

        // Get managers in this branch
        const branchManager = branchUsers.find(u => u.role === 'manager')
        const salesManager = branchUsers.find(u => u.role === 'sales_manager')
        const opsManager = branchUsers.find(u => u.role === 'ops_manager')

        const branchNode: OrgNode = {
          id: branch.id,
          name: branch.name,
          level: 'branch',
          parentId: region.id,
          marketId: market.id,
          regionId: region.id,
          branchId: branch.id,
          userId: branchManager?.id,
          children: [],
        }

        // Build team nodes (Sales Manager's team and Ops Manager's team)
        const teamNodes: OrgNode[] = []

        if (salesManager) {
          const reps = branchUsers.filter(u => u.role === 'rep')
          const salesTeamNode: OrgNode = {
            id: `${branch.id}-sales-team`,
            name: 'Sales Team',
            level: 'team',
            parentId: branch.id,
            marketId: market.id,
            regionId: region.id,
            branchId: branch.id,
            role: 'sales_manager',
            userId: salesManager.id,
            children: reps.map(rep => ({
              id: rep.id,
              name: rep.name,
              level: 'individual',
              parentId: `${branch.id}-sales-team`,
              marketId: market.id,
              regionId: region.id,
              branchId: branch.id,
              role: 'rep',
              userId: rep.id,
            })),
          }
          teamNodes.push(salesTeamNode)
        }

        if (opsManager) {
          const technicians = branchUsers.filter(u => u.role === 'technician')
          const opsTeamNode: OrgNode = {
            id: `${branch.id}-ops-team`,
            name: 'Operations Team',
            level: 'team',
            parentId: branch.id,
            marketId: market.id,
            regionId: region.id,
            branchId: branch.id,
            role: 'ops_manager',
            userId: opsManager.id,
            children: technicians.map(tech => ({
              id: tech.id,
              name: tech.name,
              level: 'individual',
              parentId: `${branch.id}-ops-team`,
              marketId: market.id,
              regionId: region.id,
              branchId: branch.id,
              role: 'technician',
              userId: tech.id,
            })),
          }
          teamNodes.push(opsTeamNode)
        }

        branchNode.children = teamNodes
        return branchNode
      })

      return regionNode
    })

    return marketNode
  })

  return root
}

/**
 * Get all subordinate user IDs for a given user based on their role
 */
export function getSubordinateUserIds(userId: string, role: Role): string[] {
  const users = getUsers()
  const user = getUserById(userId)
  if (!user) return []

  const subordinates: string[] = []

  switch (role) {
    case 'exec':
      // Executives see everyone
      return users.filter(u => u.id !== userId).map(u => u.id)

    case 'market_director':
    case 'market_sales_director':
      // Market directors/sales directors see everyone in their assigned markets
      return users
        .filter(u =>
          u.id !== userId &&
          u.assignedMarkets.some(m => user.assignedMarkets.includes(m))
        )
        .map(u => u.id)

    case 'region_director':
      // Region directors see everyone in their assigned regions
      return users
        .filter(u =>
          u.id !== userId &&
          u.assignedRegions.some(r => user.assignedRegions.includes(r))
        )
        .map(u => u.id)

    case 'manager':
      // Branch managers see everyone in their branch
      return users
        .filter(u =>
          u.id !== userId &&
          u.assignedBranches.some(b => user.assignedBranches.includes(b))
        )
        .map(u => u.id)

    case 'sales_manager':
      // Sales managers see their assigned reps
      return user.assignedReps || []

    case 'ops_manager':
      // Ops managers see their assigned technicians
      return user.assignedTechnicians || []

    case 'rep':
    case 'technician':
      // Individual contributors have no subordinates
      return []

    default:
      return []
  }
}

/**
 * Get direct subordinate entities (branches, regions, or users) for a role
 */
export function getDirectSubordinates(
  userId: string,
  role: Role
): { type: 'branch' | 'region' | 'market' | 'user'; entities: (Branch | Region | Market | User)[] } {
  const user = getUserById(userId)
  if (!user) return { type: 'user', entities: [] }

  const markets = getMarkets()
  const regions = getRegions()
  const branches = getBranches()
  const users = getUsers()

  switch (role) {
    case 'exec':
      // Executives see markets as direct subordinates
      return { type: 'market', entities: markets }

    case 'market_director':
    case 'market_sales_director':
      // Market directors/sales directors see regions in their market
      return {
        type: 'region',
        entities: regions.filter(r => user.assignedMarkets.includes(r.marketId)),
      }

    case 'region_director':
      // Region directors see branches in their region
      return {
        type: 'branch',
        entities: branches.filter(b => user.assignedRegions.includes(b.regionId)),
      }

    case 'manager':
      // Branch managers see users (reps & technicians) in their branch
      return {
        type: 'user',
        entities: users.filter(u =>
          (u.role === 'rep' || u.role === 'technician') &&
          u.assignedBranches.some(b => user.assignedBranches.includes(b))
        ),
      }

    case 'sales_manager':
      // Sales managers see their assigned reps
      return {
        type: 'user',
        entities: users.filter(u => user.assignedReps?.includes(u.id)),
      }

    case 'ops_manager':
      // Ops managers see their assigned technicians
      return {
        type: 'user',
        entities: users.filter(u => user.assignedTechnicians?.includes(u.id)),
      }

    default:
      return { type: 'user', entities: [] }
  }
}

/**
 * Get the aggregation path from a user up to the company level
 */
export function getAggregationPath(userId: string, role: Role): AggregationLevel[] {
  const user = getUserById(userId)
  if (!user) return []

  const path: AggregationLevel[] = []
  const markets = getMarkets()
  const regions = getRegions()
  const branches = getBranches()

  // Start with current level based on role
  const currentLevel = ROLE_TO_HIERARCHY_LEVEL[role]

  // Add user's level
  if (currentLevel === 'individual' || currentLevel === 'team') {
    path.push({
      level: currentLevel,
      id: userId,
      name: user.name,
      entityType: 'user',
      parentId: user.assignedBranches[0],
    })
  }

  // Add branch level (if applicable)
  if (HIERARCHY_LEVEL_ORDER[currentLevel] <= HIERARCHY_LEVEL_ORDER['branch']) {
    const branch = branches.find(b => user.assignedBranches.includes(b.id))
    if (branch) {
      path.push({
        level: 'branch',
        id: branch.id,
        name: branch.name,
        entityType: 'branch',
        parentId: branch.regionId,
      })
    }
  }

  // Add region level (if applicable)
  if (HIERARCHY_LEVEL_ORDER[currentLevel] <= HIERARCHY_LEVEL_ORDER['region']) {
    const region = regions.find(r => user.assignedRegions.includes(r.id))
    if (region) {
      path.push({
        level: 'region',
        id: region.id,
        name: region.name,
        entityType: 'region',
        parentId: region.marketId,
      })
    }
  }

  // Add market level (if applicable)
  if (HIERARCHY_LEVEL_ORDER[currentLevel] <= HIERARCHY_LEVEL_ORDER['market']) {
    const market = markets.find(m => user.assignedMarkets.includes(m.id))
    if (market) {
      path.push({
        level: 'market',
        id: market.id,
        name: market.name,
        entityType: 'market',
        parentId: 'company',
      })
    }
  }

  // Add company level (always)
  path.push({
    level: 'company',
    id: 'company',
    name: 'Rentokil North America',
    entityType: 'company',
  })

  return path
}

/**
 * Get parent manager's user ID for a given user
 */
export function getParentManagerId(userId: string): string | null {
  const user = getUserById(userId)
  if (!user) return null

  const users = getUsers()

  switch (user.role) {
    case 'rep':
      // Rep's parent is their Sales Manager
      const salesManager = users.find(u =>
        u.role === 'sales_manager' &&
        u.assignedReps?.includes(userId)
      )
      return salesManager?.id || null

    case 'technician':
      // Technician's parent is their Ops Manager
      const opsManager = users.find(u =>
        u.role === 'ops_manager' &&
        u.assignedTechnicians?.includes(userId)
      )
      return opsManager?.id || null

    case 'sales_manager':
    case 'ops_manager':
      // Team managers' parent is their Branch Manager
      const branchManager = users.find(u =>
        u.role === 'manager' &&
        u.assignedBranches.some(b => user.assignedBranches.includes(b))
      )
      return branchManager?.id || null

    case 'manager':
      // Branch Manager's parent is their Region Director
      const regionDirector = users.find(u =>
        u.role === 'region_director' &&
        u.assignedRegions.some(r => user.assignedRegions?.includes(r))
      )
      return regionDirector?.id || null

    case 'region_director':
      // Region Director's parent is their Market Director (or Market Sales Director)
      const marketDirector = users.find(u =>
        (u.role === 'market_director' || u.role === 'market_sales_director') &&
        u.assignedMarkets.some(m => user.assignedMarkets.includes(m))
      )
      return marketDirector?.id || null

    case 'market_sales_director':
      // Market Sales Director's parent is Market Director
      const mktDirector = users.find(u =>
        u.role === 'market_director' &&
        u.assignedMarkets.some(m => user.assignedMarkets.includes(m))
      )
      return mktDirector?.id || null

    case 'market_director':
      // Market Director's parent is Executive
      const exec = users.find(u => u.role === 'exec')
      return exec?.id || null

    case 'exec':
      // Executives have no parent
      return null

    default:
      return null
  }
}

/**
 * Get all users at a specific hierarchy level within a scope
 */
export function getUsersAtLevel(
  level: HierarchyLevel,
  scopeId?: string,
  scopeType?: 'market' | 'region' | 'branch'
): User[] {
  const users = getUsers()

  // Map hierarchy level to roles
  const levelRoles: Record<HierarchyLevel, Role[]> = {
    individual: ['rep', 'technician'],
    team: ['sales_manager', 'ops_manager'],
    branch: ['manager'],
    region: ['region_director'],
    market: ['market_director', 'market_sales_director'],
    company: ['exec'],
  }

  const targetRoles = levelRoles[level]
  let filteredUsers = users.filter(u => targetRoles.includes(u.role))

  // Apply scope filtering if provided
  if (scopeId && scopeType) {
    filteredUsers = filteredUsers.filter(u => {
      switch (scopeType) {
        case 'market':
          return u.assignedMarkets.includes(scopeId)
        case 'region':
          return u.assignedRegions.includes(scopeId)
        case 'branch':
          return u.assignedBranches.includes(scopeId)
        default:
          return true
      }
    })
  }

  return filteredUsers
}

/**
 * Check if a user can see another user's data based on hierarchy
 */
export function canViewSubordinate(viewerUserId: string, targetUserId: string): boolean {
  const viewer = getUserById(viewerUserId)
  const target = getUserById(targetUserId)

  if (!viewer || !target) return false
  if (viewerUserId === targetUserId) return true

  const viewerLevel = HIERARCHY_LEVEL_ORDER[ROLE_TO_HIERARCHY_LEVEL[viewer.role]]
  const targetLevel = HIERARCHY_LEVEL_ORDER[ROLE_TO_HIERARCHY_LEVEL[target.role]]

  // Viewer must be at a higher level than target
  if (viewerLevel <= targetLevel) return false

  // Check if target is in viewer's scope
  switch (viewer.role) {
    case 'exec':
      return true

    case 'market_director':
    case 'market_sales_director':
      return target.assignedMarkets.some(m => viewer.assignedMarkets.includes(m))

    case 'region_director':
      return target.assignedRegions.some(r => viewer.assignedRegions.includes(r))

    case 'manager':
      return target.assignedBranches.some(b => viewer.assignedBranches.includes(b))

    case 'sales_manager':
      return viewer.assignedReps?.includes(targetUserId) || false

    case 'ops_manager':
      return viewer.assignedTechnicians?.includes(targetUserId) || false

    default:
      return false
  }
}

/**
 * Get the hierarchy level name for display
 */
export function getHierarchyLevelDisplayName(level: HierarchyLevel): string {
  const displayNames: Record<HierarchyLevel, string> = {
    individual: 'Individual',
    team: 'Team',
    branch: 'Branch',
    region: 'Region',
    market: 'Market',
    company: 'Company',
  }
  return displayNames[level]
}

/**
 * Get subordinate count at each level for a user
 */
export function getSubordinateCounts(userId: string, role: Role): Record<HierarchyLevel, number> {
  const subordinateIds = getSubordinateUserIds(userId, role)
  const users = getUsers()

  const counts: Record<HierarchyLevel, number> = {
    individual: 0,
    team: 0,
    branch: 0,
    region: 0,
    market: 0,
    company: 0,
  }

  subordinateIds.forEach(subId => {
    const sub = users.find(u => u.id === subId)
    if (sub) {
      const level = ROLE_TO_HIERARCHY_LEVEL[sub.role]
      counts[level]++
    }
  })

  return counts
}
