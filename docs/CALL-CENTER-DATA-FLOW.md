# Call Center Dashboard - Data Flow Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Five9 CTI System                              │
│                  (Call Center Platform)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ ETL Pipeline
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               BigQuery: S0_TMX.Five9_CallLog_Export              │
│                         (59.8M rows)                             │
│                                                                  │
│  Schema:                                                         │
│  - call_id, call_timestamp, call_duration_seconds               │
│  - call_outcome, call_direction (Inbound/Outbound)              │
│  - agent_id, agent_name, branch_id                              │
│  - resolved_flag, queue_time_seconds, talk_time_seconds         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ BigQuery Queries (4)
                         │
        ┌────────────────┼────────────────┬──────────────────┐
        │                │                │                  │
        ▼                ▼                ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ getCallVolume│ │getAgentPerf- │ │ getCallOut-  │ │  getHourly-  │
│              │ │  ormance     │ │   comes      │ │ Distribution │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                 │
       │                │                │                 │
       └────────────────┴────────────────┴─────────────────┘
                                │
                                │ POST /api/bigquery/query
                                │ (with role-based filtering)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│            API Route: /api/bigquery/query/route.ts               │
│                                                                  │
│  QUERY_REGISTRY:                                                 │
│  - 'call-volume' → getCallVolume                                 │
│  - 'agent-performance' → getAgentPerformance                     │
│  - 'call-outcomes' → getCallOutcomes                             │
│  - 'hourly-distribution' → getHourlyDistribution                 │
│                                                                  │
│  Permissions Check (QUERY_PERMISSIONS):                          │
│  - exec, market_vp, region_director, manager, ops_manager       │
│                                                                  │
│  Role-Based Filtering (getRoleBasedFilters):                    │
│  - Market VP → filter by assigned markets                        │
│  - Region Director → filter by assigned regions                  │
│  - Manager → filter by assigned branches                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ JSON Response
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌──────────────────────┐      ┌──────────────────────┐
│  Call Center Page    │      │  SALTI Productivity  │
│  /call-center        │      │  Page Enhancement    │
│                      │      │                      │
│  Components:         │      │  New Section:        │
│  - 6 KPI Cards       │      │  - Call Center       │
│  - Volume Trend      │      │    Metrics           │
│  - Hourly Dist.      │      │  - Top Performers    │
│  - Outcomes Pie      │      │  - Link to Full      │
│  - Agent Table       │      │    Dashboard         │
└──────────────────────┘      └──────────────────────┘
```

## Query Execution Flow

### 1. Call Volume Query
```typescript
useBigQueryData({
  queryName: 'call-volume',
  filters: { daysBack: 30 },
  includeOrgFilters: true  // Auto-inject market/region/branch
})
  ↓
POST /api/bigquery/query
  { query: 'call-volume', filters: { daysBack: 30, market: 'NE' } }
  ↓
QUERY_REGISTRY['call-volume']
  ↓
getCallVolume({ daysBack: 30, market: 'NE' })
  ↓
BigQuery:
  SELECT
    FORMAT_DATE('%Y-%m-%d', DATE(call_timestamp)) as call_date,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN call_direction = 'Inbound' THEN 1 END) as inbound_calls,
    COUNT(CASE WHEN call_direction = 'Outbound' THEN 1 END) as outbound_calls,
    ...
  FROM `bidata-sharedus-production.S0_TMX.Five9_CallLog_Export` c
  LEFT JOIN `bidata-sharedus-production.S4.Dim_Branch_BranchID_NA_T1_Vw` b
    ON c.branch_id = b.RTX_Branch_Codes
  WHERE call_timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND b.RTX_Market_Code = @market
  ↓
Returns: CallVolume[]
  ↓
Dashboard renders: Line chart with 30-day trend
```

### 2. Agent Performance Query
```typescript
useBigQueryData({
  queryName: 'agent-performance',
  filters: { daysBack: 30, limit: 50 },
  includeOrgFilters: true
})
  ↓
POST /api/bigquery/query
  ↓
getAgentPerformance({ daysBack: 30, limit: 50, market: 'NE' })
  ↓
BigQuery:
  SELECT
    agent_id,
    agent_name,
    branch_id,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN call_outcome = 'Connected' THEN 1 END) as calls_handled,
    ROUND(AVG(call_duration_seconds) / 60.0, 2) as avg_handle_time_minutes,
    -- FCR calculation
    ROUND(
      COUNT(CASE WHEN resolved_flag = 1 THEN 1 END) /
      NULLIF(COUNT(CASE WHEN call_outcome = 'Connected' THEN 1 END), 0) * 100,
      1
    ) as first_call_resolution_rate,
    -- Connection rate
    ROUND(COUNT(CASE WHEN call_outcome = 'Connected' THEN 1 END) / COUNT(*) * 100, 1) as connection_rate,
    -- Productivity score (weighted formula)
    ROUND(
      (connection_rate * 0.4) +
      (fcr_rate * 0.4) +
      (efficiency_score * 0.2),
      1
    ) as productivity_score
  FROM `bidata-sharedus-production.S0_TMX.Five9_CallLog_Export`
  WHERE call_timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY agent_id, agent_name, branch_id
  HAVING total_calls >= 10
  ORDER BY productivity_score DESC
  LIMIT 50
  ↓
Returns: AgentPerformance[]
  ↓
Dashboard renders: Agent performance table with rankings
```

### 3. Call Outcomes Query
```typescript
useBigQueryData({
  queryName: 'call-outcomes',
  filters: { daysBack: 30 }
})
  ↓
getCallOutcomes({ daysBack: 30, market: 'NE' })
  ↓
BigQuery:
  WITH total_calls AS (
    SELECT COUNT(*) as total
    FROM `bidata-sharedus-production.S0_TMX.Five9_CallLog_Export`
    WHERE call_timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  )
  SELECT
    call_outcome as outcome,
    COUNT(*) as call_count,
    ROUND(COUNT(*) / (SELECT total FROM total_calls) * 100, 1) as percentage,
    ROUND(AVG(call_duration_seconds) / 60.0, 2) as avg_duration_minutes
  FROM `bidata-sharedus-production.S0_TMX.Five9_CallLog_Export`
  WHERE call_timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY call_outcome
  ORDER BY call_count DESC
  ↓
Returns: CallOutcome[]
  ↓
Dashboard renders: Pie chart + details list
```

### 4. Hourly Distribution Query
```typescript
useBigQueryData({
  queryName: 'hourly-distribution',
  filters: { daysBack: 30 }
})
  ↓
getHourlyDistribution({ daysBack: 30 })
  ↓
BigQuery:
  SELECT
    EXTRACT(HOUR FROM call_timestamp) as hour_of_day,
    COUNT(*) as call_count,
    COUNT(CASE WHEN call_direction = 'Inbound' THEN 1 END) as inbound_count,
    COUNT(CASE WHEN call_direction = 'Outbound' THEN 1 END) as outbound_count,
    ROUND(AVG(call_duration_seconds) / 60.0, 2) as avg_handle_time_minutes,
    ROUND(
      COUNT(CASE WHEN call_outcome = 'Connected' THEN 1 END) / COUNT(*) * 100,
      1
    ) as connection_rate
  FROM `bidata-sharedus-production.S0_TMX.Five9_CallLog_Export`
  WHERE call_timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY EXTRACT(HOUR FROM call_timestamp)
  ORDER BY hour_of_day
  ↓
Returns: HourlyDistribution[]
  ↓
Dashboard renders: Stacked bar chart (24 hours)
```

## Role-Based Filtering

### Market VP
```
User Role: market_vp
Assigned Markets: ['NE', 'SE']
  ↓
Query Filters: { market: 'NE' }
  ↓
BigQuery WHERE clause:
  AND b.RTX_Market_Code IN ('NE', 'SE')
  ↓
Result: Only sees call data for Northeast and Southeast markets
```

### Region Director
```
User Role: region_director
Assigned Regions: ['FLSE', 'GA']
  ↓
Query Filters: { region: 'FLSE' }
  ↓
BigQuery WHERE clause:
  AND b.RTX_Region_Code IN ('FLSE', 'GA')
  ↓
Result: Only sees call data for Florida Southeast and Georgia regions
```

### Branch Manager
```
User Role: manager
Assigned Branches: ['1001', '1002']
  ↓
Query Filters: { branch: '1001' }
  ↓
BigQuery WHERE clause:
  AND c.branch_id IN ('1001', '1002')
  ↓
Result: Only sees call data for branches 1001 and 1002
```

### Operations Manager
```
User Role: ops_manager
Assigned Branches: ['1001', '1002', '1003']
  ↓
Query Filters: { branch: '1001' }
  ↓
BigQuery WHERE clause:
  AND c.branch_id IN ('1001', '1002', '1003')
  ↓
Result: Only sees call data for assigned operations branches
```

## Integration with SALTI Dashboard

```
SALTI Productivity Page (/salti/productivity)
  │
  ├─ Fetch: 'salti-productivity' query
  │    └─ Returns: SALTIProductivity[] (inspections, proposals, sales)
  │
  ├─ Fetch: 'agent-performance' query
  │    └─ Returns: AgentPerformance[] (calls, AHT, FCR, connection rate)
  │
  └─ Render: Call Center Metrics Section
       │
       ├─ KPI: Total Calls Made by SALTI Agents
       ├─ KPI: Average Connection Rate
       ├─ KPI: Average Handle Time
       ├─ KPI: Proposals Created (from SALTI data)
       │
       ├─ Top 6 Call Performers (ranked by productivity score)
       │
       └─ Link: "View Full Call Center Dashboard" → /call-center
```

### Business Logic: Call-to-Proposal Correlation
```
Hypothesis: Higher call volume + better connection rates → More proposals created

Metrics:
- Total Calls (from Five9_CallLog_Export)
- Connection Rate (% of calls connected)
- Proposals Generated (from tmx_lead.proposed_date)
- Sales Closed (from tmx_lead.sold_date)

Analysis:
IF agent.total_calls > 100
   AND agent.connection_rate > 60%
   AND agent.first_call_resolution_rate > 70%
THEN expect higher proposals_generated

Dashboard shows:
- Top callers by volume and connection rate
- Correlation visualization between calls and proposals
- Link to full call center dashboard for deep dive
```

## Performance Optimization

### Query Optimization
```
1. Indexes on Five9_CallLog_Export:
   - call_timestamp (for date filtering)
   - agent_id (for agent performance)
   - branch_id (for geographic filtering)
   - call_outcome (for outcome analysis)

2. Partitioning Strategy:
   - Partition by DATE(call_timestamp)
   - Reduces scan size for date-range queries
   - Example: 30-day query scans 30 partitions vs full 59.8M rows

3. Materialized Views (Future):
   - Daily aggregates: call_volume_daily
   - Hourly aggregates: call_volume_hourly
   - Agent metrics: agent_performance_daily
   - Pre-computed productivity scores
```

### Caching Strategy
```
1. API Route Caching:
   - Cache key: query_name + filters + user_role
   - TTL: 5 minutes for real-time dashboards
   - Invalidate on: Data refresh events

2. Client-Side Caching:
   - useBigQueryData hook caches responses
   - React Query cache (15 minutes)
   - Manual refresh button bypasses cache

3. BigQuery BI Engine:
   - Cache frequent queries in memory
   - Reduces query latency from seconds to milliseconds
   - Automatic management by BigQuery
```

## Security & Compliance

### Data Access Control
```
1. Query Permissions (QUERY_PERMISSIONS):
   ✓ exec, market_vp, region_director, manager, ops_manager only
   ✗ rep, technician cannot access call center data

2. Row-Level Security:
   - Market VPs: Filter by assigned markets
   - Region Directors: Filter by assigned regions
   - Managers: Filter by assigned branches

3. Column-Level Security:
   - PII columns (customer_email, customer_phone) NOT exposed
   - Agent performance visible to managers+
   - Individual call details require additional permissions
```

### Audit Logging
```
All query executions logged via logQueryAccess():
- Timestamp
- User ID
- Role
- Query name
- Filters applied
- Rows returned
- Response time

Example log:
{
  "timestamp": "2026-01-26T12:00:00Z",
  "userId": "user@rentokil.com",
  "role": "market_vp",
  "query": "agent-performance",
  "filters": { "daysBack": 30, "market": "NE" },
  "rowsReturned": 42,
  "responseTimeMs": 1247
}
```

---

**Data Flow Version**: 1.0
**Last Updated**: 2026-01-26
**Status**: Production-Ready
