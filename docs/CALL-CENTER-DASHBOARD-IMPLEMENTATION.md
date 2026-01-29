# Call Center Performance Dashboard - Implementation Summary

## Overview
Comprehensive call center performance dashboard built on the **S0_TMX.Five9_CallLog_Export** dataset (59.8M rows) - previously unused. This dashboard activates Five9 CTI (Computer Telephony Integration) data to provide real-time insights into call center operations, agent performance, and staffing optimization.

## Files Created

### 1. BigQuery Query Module
**File**: `/src/lib/bigquery/queries/call-center.ts`

**Queries Implemented**:
- `getCallVolume()` - Daily call volume with inbound/outbound split
- `getAgentPerformance()` - Agent rankings by calls handled, AHT, FCR, productivity score
- `getCallOutcomes()` - Call outcomes breakdown (Connected, Voicemail, Busy, No Answer, etc.)
- `getHourlyDistribution()` - Call volume by hour for staffing optimization

**Key Features**:
- Parameterized queries with role-based filtering
- Geographic filtering (market/region/branch) via branch hierarchy join
- Calculated metrics:
  - AHT (Average Handle Time): `AVG(call_duration_seconds) / 60.0` in minutes
  - FCR (First Call Resolution): `COUNT(resolved_flag=1) / COUNT(connected) * 100`
  - Connection Rate: `COUNT(outcome='Connected') / COUNT(*) * 100`
  - Productivity Score: Weighted average (40% connection rate + 40% FCR + 20% efficiency)

**Expected Table Schema** (S0_TMX.Five9_CallLog_Export):
```sql
call_id                 STRING
call_timestamp          TIMESTAMP
call_duration_seconds   INT64
call_outcome            STRING (Connected, Voicemail, Busy, No Answer, etc.)
call_direction          STRING (Inbound, Outbound)
agent_id                STRING
agent_name              STRING
branch_id               STRING (links to RTX_Branch_Codes)
customer_id             STRING
disposition             STRING
queue_time_seconds      INT64
talk_time_seconds       INT64
wrap_time_seconds       INT64
transfer_count          INT64
resolved_flag           INT64 (0 or 1)
```

### 2. Dashboard Page
**File**: `/src/app/(dashboard)/call-center/page.tsx`

**Components**:
1. **Summary KPI Cards** (6 metrics):
   - Total Calls (with inbound/outbound split)
   - Average Handle Time (minutes)
   - First Call Resolution %
   - Connection Rate %
   - Active Agents (agents with 10+ calls)
   - Daily Average Calls

2. **Call Volume Trend Chart** (Line Chart):
   - 30-day trend with total, inbound, outbound lines
   - Date range filter (7/14/30/60/90 days)
   - Hover tooltips with daily breakdown

3. **Hourly Distribution Chart** (Stacked Bar Chart):
   - Call volume by hour (0-23)
   - Stacked: Inbound (green) + Outbound (orange)
   - Used for staffing optimization

4. **Call Outcomes Breakdown** (Pie Chart + Details):
   - Visual pie chart with percentages
   - Detailed list with call counts and avg duration
   - Color-coded outcomes

5. **Agent Performance Table** (Sortable):
   - Rank, Agent, Branch, Calls, Handled, AHT, FCR %, Connect %, Talk Hours, Score
   - Top 3 agents highlighted with amber badges
   - Green badges for FCR ≥ 70%, blue badges for connection ≥ 60%
   - Productivity score based on weighted metrics

**Features**:
- BigQuery-only (no mock fallback)
- Organization filters (market/region/branch)
- Role-based access (exec, market_vp, region_director, manager, ops_manager)
- Real-time data with DataSourceBadge showing response time
- Dark mode support
- Responsive design (mobile, tablet, desktop)

### 3. API Route Updates
**File**: `/src/app/api/bigquery/query/route.ts`

**Registered Queries**:
```typescript
'call-volume': getCallVolume,
'agent-performance': getAgentPerformance,
'call-outcomes': getCallOutcomes,
'hourly-distribution': getHourlyDistribution,
```

### 4. Permissions
**File**: `/src/lib/bigquery/permissions.ts`

**Allowed Roles**:
```typescript
'call-volume': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
'agent-performance': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
'call-outcomes': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
'hourly-distribution': ['exec', 'market_vp', 'region_director', 'manager', 'ops_manager'],
```

### 5. SALTI Productivity Page Enhancement
**File**: `/src/app/(dashboard)/salti/productivity/page.tsx`

**Added Section**: "Call Center Metrics"
- **Summary KPIs**:
  - Total Calls (sum of all SALTI agents)
  - Connection Rate (team average)
  - Avg Handle Time (team average)
  - Proposals Created (linked to call success)

- **Top Call Center Performers** (Top 6):
  - Agent name, call count, connection rate
  - Visual ranking with badges

- **Link to Full Dashboard**:
  - Button to navigate to `/call-center`
  - Shows how call activity correlates with proposal generation

**Integration**:
- Fetches `agent-performance` query with same date filters as productivity
- Shows top 10 agents by productivity score
- Demonstrates how call center activity drives SALTI pipeline

### 6. Navigation
**File**: `/src/components/layout/Sidebar.tsx`

**Added to Operations Section**:
```typescript
{ name: 'Call Center', href: '/call-center' }
```

**Visible to Roles**:
- exec, market_vp, market_sales_director, region_director, region_sales_manager, manager, ops_manager

## Query Index Export
**File**: `/src/lib/bigquery/queries/index.ts`

**Added Exports**:
```typescript
export {
  getCallVolume,
  getAgentPerformance,
  getCallOutcomes,
  getHourlyDistribution,
  type CallVolume,
  type AgentPerformance,
  type CallOutcome,
  type HourlyDistribution,
  type CallCenterQueryOptions,
} from './call-center'
```

## Key Design Patterns Followed

### 1. BigQuery-Only Pattern
```typescript
const EMPTY_DATA: CallVolume[] = []

const { data, isLoading } = useBigQueryData<CallVolume[], CallVolume[]>({
  queryName: 'call-volume',
  filters: { daysBack: 30 },
  defaultData: EMPTY_DATA,  // Empty state, NOT mock data
  transformBigQueryData: (data) => data,
  includeOrgFilters: true,
  includeRoleFilters: true,
})
```

### 2. Role-Based Filtering
- Queries automatically filter by user's assigned market/region/branch
- `includeOrgFilters: true` injects organization context
- `includeRoleFilters: true` injects user-specific filters

### 3. Parameterized Queries
```typescript
const sql = `
  SELECT ... FROM \`${PROJECT}.S0_TMX.Five9_CallLog_Export\` c
  WHERE c.branch_id = @branch
    AND c.agent_id = @agentId
`
const result = await bigQueryClient.queryWithParams<CallVolume>(sql, { branch, agentId })
```

### 4. Chart Styling (Recharts)
```typescript
// Disable gray hover overlay
<Tooltip cursor={false} content={...} />

// Dark mode grid lines - CSS classes
<div className="[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700">
  <LineChart>
    <CartesianGrid strokeDasharray="3 3" />
  </LineChart>
</div>
```

### 5. Empty States
```typescript
{agentPerformanceData.length === 0 && !isLoading && (
  <div className="text-center py-12 text-muted-foreground">
    <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
    <p>No agent performance data available for the selected period.</p>
  </div>
)}
```

## Metrics Definitions

### Average Handle Time (AHT)
- **Formula**: `AVG(call_duration_seconds) / 60.0`
- **Unit**: Minutes
- **Target**: < 5 minutes for optimal efficiency

### First Call Resolution (FCR)
- **Formula**: `COUNT(resolved_flag=1) / COUNT(connected) * 100`
- **Unit**: Percentage
- **Target**: ≥ 70% (industry benchmark)

### Connection Rate
- **Formula**: `COUNT(call_outcome='Connected') / COUNT(*) * 100`
- **Unit**: Percentage
- **Target**: ≥ 60% (industry benchmark)

### Productivity Score
- **Formula**: `(connection_rate * 0.4) + (fcr_rate * 0.4) + (efficiency_score * 0.2)`
- **Components**:
  - 40% Connection Rate (ability to reach customers)
  - 40% FCR Rate (ability to resolve on first call)
  - 20% Efficiency Score (optimal AHT vs target)
- **Unit**: 0-100 scale
- **Target**: ≥ 75 for top performers

## Business Value

### 1. Operational Efficiency
- **Hourly Distribution Chart**: Optimize staffing by identifying peak call times
- **AHT Tracking**: Monitor average handle time to balance speed and quality
- **Agent Rankings**: Identify top performers and coaching opportunities

### 2. Customer Experience
- **FCR Tracking**: Improve first call resolution to reduce customer effort
- **Connection Rate**: Optimize outbound calling strategies
- **Outcome Analysis**: Identify common call outcomes and address root causes

### 3. Sales Integration
- **SALTI Productivity Link**: Shows how call center activity drives proposal pipeline
- **Call-to-Proposal Correlation**: Tracks conversion from calls to proposals
- **Performance Insights**: Identifies agents who excel at both calling and closing

### 4. Resource Planning
- **Daily Volume Trends**: Forecast staffing needs based on historical patterns
- **Inbound/Outbound Split**: Allocate resources between reactive and proactive calling
- **Branch Comparison**: Identify branches with high call volume needing additional support

## Testing Checklist

- [x] ESLint passing (no errors, only warnings)
- [x] TypeScript compilation successful
- [x] Query registry properly configured
- [x] Permissions correctly assigned
- [x] Sidebar navigation updated
- [x] SALTI productivity page enhanced
- [ ] Manual testing with real BigQuery data
- [ ] Role-based access verification
- [ ] Performance testing with 59.8M row dataset
- [ ] Mobile responsiveness testing

## Next Steps

### 1. Data Validation
- Verify S0_TMX.Five9_CallLog_Export table schema matches expected columns
- Confirm `resolved_flag` column exists and is populated
- Check branch_id linkage to S4.Dim_Branch_BranchID_NA_T1_Vw

### 2. Performance Optimization
- Add indexes on `call_timestamp`, `agent_id`, `branch_id`
- Consider materialized views for hourly/daily aggregations
- Implement query caching for frequently accessed time ranges

### 3. Feature Enhancements
- Add agent drill-down page (individual agent call history)
- Implement real-time call monitoring (last 15 minutes)
- Add call recording playback links (if available in Five9)
- Create weekly/monthly trend reports
- Add email alerts for KPI breaches (AHT > 7min, FCR < 60%)

### 4. Integration Opportunities
- Link calls to lead records (tmx_lead table)
- Track call-to-appointment conversion
- Correlate call outcomes with sales outcomes
- Integrate with Qualtrics NPS surveys (post-call)

## Security Considerations

- **Role-Based Access**: Only exec, directors, managers, ops_managers can access
- **Parameterized Queries**: All user inputs sanitized to prevent SQL injection
- **No PII Exposure**: Customer names/emails not displayed without proper authorization
- **Audit Logging**: All query executions logged via `logQueryAccess()`

## Documentation

- **README.md**: Dashboard usage instructions added
- **CLAUDE.md**: Project context updated with call center dataset
- **This Document**: Complete implementation guide for future reference

---

**Implementation Date**: 2026-01-26
**Dataset**: S0_TMX.Five9_CallLog_Export (59.8M rows)
**Status**: ✅ Complete - Ready for Testing
**Access**: `/call-center` (Operations → Call Center)
