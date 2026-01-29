# Sidebar Role-Based Navigation Fix

## Problem

RTX Reports, Governance, and Platform Admin sections were visible to all roles including Executive. The `showGovernance` flag was set to `true` for all executive-level roles, causing admin-only sections to appear for non-admin users.

**Before (broken):**
- Executive sees RTX Reports section
- Executive sees Governance section (Data Dictionary, Platform Admin, etc.)
- All management roles see admin-only content

**After (fixed):**
- Executive sees only: Command Center, Sales, Operations, Finance, People, Forecast, Lead Service Engine, Settings
- Admin sees all sections including RTX Reports and Governance
- Role preview mode correctly hides admin sections

## Root Cause

The sidebar used a `showGovernance` flag returned from `getNavigationForRole()` that was `true` for all roles except `rep` and `technician`. This flag controlled visibility of both RTX Reports and Governance sections, which should be admin-only.

## Solution

Changed the visibility condition for RTX Reports and Governance sections from `showGovernance` (role-based) to `isAdmin` (authentication-based).

### Code Changes

**File: `src/components/layout/Sidebar.tsx`**

1. Changed RTX Reports section visibility:
```diff
- {showGovernance && (
+ {isAdmin && !isPreview && (
```

2. Changed Governance section visibility:
```diff
- {showGovernance && (
+ {isAdmin && !isPreview && (
```

3. Removed unused `showGovernance` destructuring:
```diff
- const { main: navigation, showGovernance } = getNavigationForRole(currentRole)
+ const { main: navigation } = getNavigationForRole(currentRole)
```

## Behavior by Role

| Role | Sees Main Nav | Sees RTX Reports | Sees Governance |
|------|---------------|------------------|-----------------|
| Executive | Command Center, Sales, Ops, Finance, People, Forecast, LSE | No | No |
| Market VP | Command Center, Daily Rollup, Sales, Ops, Finance, People, Forecast, LSE | No | No |
| Region Director | Command Center, Daily Rollup, Weekly WIG, Sales, Ops, Finance, People, Forecast, LSE | No | No |
| Branch Manager | Command Center, Daily Cadence, WIG Scorecard, Sales, Ops, Forecast, LSE | No | No |
| Ops Manager | Command Center, Ops, New Starts, Sales, Finance, Forecast, LSE | No | No |
| Account Executive | My Dashboard, Import Quote, Sales Tracker, New Starts | No | No |
| Technician | My Schedule, Service Tickets, Route | No | No |
| **Admin** | Role-based nav | **Yes** | **Yes** |

## Test Results

- Build: Passing (TypeScript valid)
- Executive role: Only sees business pages
- Admin role: Sees all sections including RTX Reports and Governance
- Role preview: Admin sections hidden during preview
- Navigation: All links functional

## Files Modified

- `src/components/layout/Sidebar.tsx` - Changed visibility conditions for admin-only sections

## Status: COMPLETE

Date: 2026-01-22
