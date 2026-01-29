# Finance Projections Page - BigQuery Integration

## Summary

Successfully integrated live BigQuery data into the Finance Projections page, replacing mock data with real revenue projection analytics from `BCG_RTD_DB.DR_RevProjection`.

## Changes Made

### 1. Query Functions - `/src/lib/bigquery/queries/finance.ts`

Added three new query functions with parameterized SQL for security and role-based filtering:

#### `getRevenueProjections(options)`
- **Source**: `BCG_RTD_DB.DR_RevProjection`
- **Returns**: Revenue projections for 30/60/90/120 days with actuals
- **Features**:
  - Date range filtering (daysBack parameter)
  - Market/region/branch filtering
  - Confidence level tracking
  - Supports up to 500 records

#### `getProjectionAccuracy(options)`
- **Purpose**: Calculate historical projection accuracy metrics
- **Metrics**:
  - Average variance percentage by timeframe
  - Average accuracy score (100 - abs(variance))
  - Total projections vs accurate projections (within 10%)
  - Breakdown for 30/60/90/120 day projections
- **Algorithm**:
  ```sql
  accuracy = 100 - ABS((actual - projected) / projected * 100)
  accurate_count = COUNT WHERE ABS(variance) <= 10%
  ```

#### `getVarianceAnalysis(options)`
- **Purpose**: Analyze variance by market/region/branch
- **Features**:
  - Top 100 variances by absolute percentage
  - Market/region/branch breakdown
  - Confidence level correlation
  - Configurable projection period (default: 30 days)

### 2. API Registration - `/src/app/api/bigquery/query/route.ts`

Registered three new queries:
```typescript
'revenue-projections': getRevenueProjections,
'projection-accuracy': getProjectionAccuracy,
'variance-analysis': getVarianceAnalysis,
```

Updated comment to show 7 finance queries (was 4).

### 3. Permissions - `/src/lib/bigquery/permissions.ts`

Added permissions for exec, market_vp, region_director, and manager roles:
```typescript
'revenue-projections': ['exec', 'market_vp', 'region_director', 'manager'],
'projection-accuracy': ['exec', 'market_vp', 'region_director', 'manager'],
'variance-analysis': ['exec', 'market_vp', 'region_director', 'manager'],
```

### 4. Projections Page - `/src/app/(dashboard)/finance/projections/page.tsx`

**Completely rewritten** to use BigQuery data:

#### Features Added:
- **Data Source Badge**: Shows BigQuery status and response time
- **Date Range Filter**: 3/6/12 month selections
- **Empty State Handling**: Graceful fallback when no data available

#### KPI Cards (4):
1. **30-Day Projection vs Actual** - Shows variance percentage with trending icons
2. **60-Day Projection vs Actual** - Same format as 30-day
3. **90-Day Projection vs Actual** - Same format as 30/60-day
4. **Projection Accuracy Score** - Rolling 90-day average

#### Visualizations:

**Projection vs Actual Trend Chart** (Line Chart):
- Shows historical accuracy over time (last 12 data points)
- 4 lines: Actual Revenue (solid green), 30/60/90-day Projections (dashed)
- Y-axis formatted in millions ($M)
- Tooltip shows all values with currency formatting
- Uses proper dark mode grid styling

**Accuracy by Timeframe** (Bar Chart):
- Shows accuracy percentage for each projection period
- Green bars for accuracy scores
- Domain 0-100%
- Highlights which timeframe performs best

**Accuracy Details Card**:
- Lists all 4 projection periods
- Shows accuracy percentage
- Displays "X of Y within 10%" metric
- Shows average variance

**Variance Analysis Table**:
- Top 20 variances by market/region/branch
- Columns: Market, Region, Branch, Projected, Actual, Variance ($), Variance (%), Confidence, Status
- Color-coded variance indicators:
  - Green: ≤5% (On Target)
  - Yellow: 5-10% (Slight Variance)
  - Red: >10% (High Variance)
- Confidence badges (High/Medium/Low)
- Status badges based on variance

#### Technical Patterns:
- Uses `useMemo` for derived calculations
- Proper TypeScript typing with imported types
- Role-based data filtering (automatic via API)
- Empty state handling for all sections
- Follows existing AR page patterns

### 5. Type Exports - `/src/lib/bigquery/queries/index.ts`

Added exports:
```typescript
export {
  getRevenueProjections,
  getProjectionAccuracy,
  getVarianceAnalysis,
  type RevenueProjectionRecord,
  type ProjectionAccuracyRecord,
  type VarianceAnalysisRecord,
  // ... existing exports
} from './finance'
```

## Data Flow

```
BCG_RTD_DB.DR_RevProjection (Production BigQuery Table)
                ↓
/src/lib/bigquery/queries/finance.ts
  - getRevenueProjections()
  - getProjectionAccuracy()
  - getVarianceAnalysis()
                ↓
/src/app/api/bigquery/query/route.ts
  - Query registry
  - Permission checks
  - Role-based filtering
                ↓
POST /api/bigquery/query
  - Body: { query: 'revenue-projections', filters: { daysBack: 90 } }
                ↓
/src/app/(dashboard)/finance/projections/page.tsx
  - fetchData() with parallel queries
  - Transform to display format
  - Render KPIs, charts, tables
```

## Table Schema

Expected columns in `BCG_RTD_DB.DR_RevProjection`:
- `projection_date`: DATE - When projection was made
- `market_name`: STRING - Market identifier
- `region_name`: STRING - Region identifier
- `branch_id`: STRING - Branch code
- `projected_revenue_30`: NUMERIC - 30-day projection
- `projected_revenue_60`: NUMERIC - 60-day projection
- `projected_revenue_90`: NUMERIC - 90-day projection
- `projected_revenue_120`: NUMERIC - 120-day projection
- `actual_revenue`: NUMERIC - Actual revenue realized
- `confidence_level`: STRING - 'high' | 'medium' | 'low'

## Formulas

**Variance**:
```
variance_amount = actual_revenue - projected_revenue
variance_pct = (variance_amount / projected_revenue) * 100
```

**Accuracy**:
```
accuracy_pct = MAX(0, 100 - ABS(variance_pct))
```

**Accurate Projections**:
```
accurate = COUNT WHERE ABS(variance_pct) <= 10%
```

## Security Features

1. **Parameterized Queries**: All filters use BigQuery parameters to prevent SQL injection
2. **Role-Based Access**: Only exec, market_vp, region_director, manager can access
3. **Org Unit Filtering**: Automatic filtering by user's assigned market/region/branch
4. **No Mock Fallback**: Financial data must NEVER be fabricated
5. **Limit Enforcement**: Maximum 500 records for projections, 100 for variance

## Design Guidelines Followed

✅ Uses shadcn/ui components (Card, Badge, Table)
✅ Dark mode support with proper grid styling
✅ Recharts visualizations with `cursor={false}`
✅ Role-based data filtering
✅ TrendingUp/TrendingDown icons for variance indicators
✅ Empty state handling (no data available messages)
✅ No hardcoded project IDs (uses BIGQUERY_CONFIG)
✅ Follows AR dashboard patterns
✅ No mock data fallbacks

## Testing Checklist

- [ ] Page loads without errors
- [ ] Data source badge shows "BigQuery"
- [ ] Date range filter updates data
- [ ] KPI cards show correct values
- [ ] Trend chart renders with proper data
- [ ] Accuracy chart shows 4 bars (30/60/90/120 days)
- [ ] Variance table shows top 20 records
- [ ] Confidence badges render correctly
- [ ] Empty states display when no data
- [ ] Role-based filtering works (market VP sees only their market)
- [ ] Dark mode grid lines render correctly
- [ ] Tooltips show formatted currency values

## Files Modified

1. `/src/lib/bigquery/queries/finance.ts` - Added 3 query functions (237 lines added)
2. `/src/app/api/bigquery/query/route.ts` - Registered 3 queries
3. `/src/lib/bigquery/permissions.ts` - Added 3 query permissions
4. `/src/app/(dashboard)/finance/projections/page.tsx` - Complete rewrite (473 lines)
5. `/src/lib/bigquery/queries/index.ts` - Added finance exports

## Performance

- **Parallel Queries**: All 3 queries execute concurrently via `Promise.all()`
- **Response Time Tracking**: Badge shows query execution time
- **Limit Enforcement**: Prevents excessive data transfer
- **Index-Friendly**: Filters on projection_date (likely indexed)

## Future Enhancements

- [ ] Add 120-day projection to KPI cards
- [ ] Implement market/region/branch selector
- [ ] Add export to CSV functionality
- [ ] Create projection accuracy alerts (email when <80%)
- [ ] Add historical accuracy trend (12-month rolling)
- [ ] Implement confidence level breakdown chart
- [ ] Add comparison to prior year projections

## Notes

- No mock data was created - page shows empty state if BigQuery returns no data
- All financial data sourced from production BCG_RTD_DB tables
- Variance formula matches requirements: `((actual - projected) / projected) * 100`
- Accuracy capped at 0-100 range as specified
- Follows Next.js 14 App Router patterns with 'use client'
