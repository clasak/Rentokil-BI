# Data Quality Historical Tracking - Phase 3 Complete ✅

## Overview

Phase 3 implementation is now complete with both **backend infrastructure** and **UI visualizations** for historical data quality tracking.

---

## What Was Built

### Backend Infrastructure (✅ Complete)

1. **BigQuery Historical Table** (`sql/data_quality_history.sql`)
   - Partitioned by snapshot_date for performance
   - Clustered by dimension for fast queries
   - 3-year data retention
   - Tracks 1-day, 7-day, and 30-day score changes
   - Automatic alert detection (>5% drops)

2. **Data Quality Functions** (`src/lib/bigquery/queries/data-quality.ts`)
   - `saveDataQualitySnapshot()` - Saves daily snapshots with change calculations
   - `getDataQualityHistoricalTrends()` - Retrieves 30/90-day trends
   - `getDataQualityPeriodComparisons()` - WoW/MoM comparisons
   - `getDataQualityAlerts()` - Active quality alerts

3. **API Endpoints** (`src/app/api/bigquery/query/route.ts`)
   - `data-quality-historical-trends` - Get trend data for sparklines
   - `data-quality-period-comparisons` - Get WoW/MoM changes
   - `data-quality-alerts` - Get active alerts

### UI Visualizations (✅ Complete)

**Enhanced Data Quality Scorecard** (`src/app/(dashboard)/admin/components/DataQualityScorecard.tsx`)

#### 1. Active Alerts Banner
- Shows all active quality alerts at the top
- Red warning banner with bell icon
- Lists each dimension with alert reason
- Auto-hides when no alerts

```tsx
{alerts.length > 0 && (
  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200">
    <Bell className="h-5 w-5 text-red-600" />
    {alerts.length} Active Quality Alerts
  </div>
)}
```

#### 2. Mini Sparklines (30-day trends)
- 30-day trend chart on each dimension card
- Color-coded: green (target met), amber (close), red (below)
- Built with Recharts for smooth rendering
- Shows score trajectory at a glance

```tsx
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={trendData}>
    <Line type="monotone" dataKey="score" stroke={scoreColor} />
  </LineChart>
</ResponsiveContainer>
```

#### 3. WoW/MoM Change Badges
- Week-over-week (7-day) change indicator
- Month-over-month (30-day) change indicator
- Green ↑ for improvements, Red ↓ for declines, Gray → for stable
- Tooltips explain what WoW/MoM means

```tsx
<div className="flex items-center gap-3">
  <div>WoW: {getChangeIndicator(week_over_week_change)}</div>
  <div>MoM: {getChangeIndicator(month_over_month_change)}</div>
</div>
```

#### 4. Alert Indicators on Cards
- Animated bell icon on cards with active alerts
- Red border highlight for alerted dimensions
- Pulse animation to draw attention
- Tooltip shows "Quality alert active"

#### 5. Enhanced Visual Hierarchy
- Dimension cards are clickable (drill-down to details)
- Hover effects with "View Details" link
- Color-coded progress bars and scores
- Dark mode support throughout

---

## Visual Examples

### Before Phase 3
```
┌─────────────────────────────────────┐
│ Data Quality Scorecard              │
├─────────────────────────────────────┤
│ Completeness     88%                │
│ Target: 90%                         │
│ Progress bar                        │
│ Issue: Missing customer IDs         │
└─────────────────────────────────────┘
```

### After Phase 3
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ 2 Active Quality Alerts                         │
│ Completeness: Dropped 6.3% in the past 7 days      │
│ Timeliness: Dropped 5.8% in the past 7 days        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Completeness 🔔                     │
│ 88%                    Target: 90%  │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░ [amber bar]     │
│ ╱╲╱╲╱╲╱╲╱ [30-day sparkline]       │
│ WoW: ↓ -2.3%    MoM: ↓ -5.1%       │
│ Issue: Missing customer IDs         │
│ 12,453 affected records             │
└─────────────────────────────────────┘
```

---

## Technical Implementation

### Data Fetching Pattern

The component uses three separate `useBigQueryData` hooks to fetch data in parallel:

```typescript
// 1. Core dimension scores
const { data: dimensions } = useBigQueryData({
  queryName: 'data-quality-scorecard-dimensions',
})

// 2. Period comparisons (WoW/MoM)
const { data: periodComparisons } = useBigQueryData({
  queryName: 'data-quality-period-comparisons',
})

// 3. Active alerts
const { data: alerts } = useBigQueryData({
  queryName: 'data-quality-alerts',
})

// 4. Historical trends for sparklines
const { data: historicalTrends } = useBigQueryData({
  queryName: 'data-quality-historical-trends',
  filters: { days: 30 },
})
```

### Sparkline Data Transformation

Trends are grouped by dimension for easy lookup:

```typescript
const trendsByDimension = historicalTrends.reduce((acc, trend) => {
  if (!acc[trend.dimension]) {
    acc[trend.dimension] = []
  }
  acc[trend.dimension].push({ date: trend.date, score: trend.score })
  return acc
}, {} as Record<string, Array<{ date: string; score: number }>>)
```

### Change Indicator Helper

Renders colored arrows and percentage changes:

```typescript
const getChangeIndicator = (change: number) => {
  if (change > 0) {
    return (
      <div className="flex items-center text-green-600">
        <TrendingUp className="h-3 w-3" />
        <span>+{change.toFixed(1)}%</span>
      </div>
    )
  } else if (change < 0) {
    return (
      <div className="flex items-center text-red-600">
        <TrendingDown className="h-3 w-3" />
        <span>{change.toFixed(1)}%</span>
      </div>
    )
  } else {
    return (
      <div className="flex items-center text-gray-500">
        <Minus className="h-3 w-3" />
        <span>0.0%</span>
      </div>
    )
  }
}
```

---

## Setup Requirements

⚠️ **IMPORTANT**: Historical tracking requires manual setup before data appears in the UI.

### 1. Create BigQuery Table

Run the SQL script in BigQuery Console:

```bash
# Open BigQuery Console
https://console.cloud.google.com/bigquery?project=bidata-sharedus-production

# Copy/paste contents of sql/data_quality_history.sql
# Click "Run" to execute
```

### 2. Configure Daily Snapshot Job

Choose one of the following options:

#### Option A: Cloud Scheduler (Recommended)

```bash
# Create Cloud Function
gcloud functions deploy data-quality-snapshot \
  --runtime nodejs20 \
  --trigger-http \
  --entry-point=saveSnapshot \
  --project bidata-sharedus-production

# Create Scheduler Job (runs daily at 1 AM ET)
gcloud scheduler jobs create http data-quality-daily-snapshot \
  --schedule="0 1 * * *" \
  --uri="https://us-central1-bidata-sharedus-production.cloudfunctions.net/data-quality-snapshot" \
  --http-method=POST \
  --time-zone="America/New_York"
```

#### Option B: Next.js API + External Cron

```typescript
// Create: src/app/api/data-quality/save-snapshot/route.ts
import { saveDataQualitySnapshot } from '@/lib/bigquery/queries/data-quality'

export async function POST() {
  try {
    await saveDataQualitySnapshot()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Then use EasyCron, Cron-job.org, or similar to POST to:
// https://your-domain.com/api/data-quality/save-snapshot
// Schedule: Daily at 1 AM
```

### 3. Wait for Data to Accumulate

Historical features require time to populate:

| Days | Features Available |
|------|-------------------|
| Day 1 | First snapshot saved - no trends yet |
| Day 2 | 1-day changes visible |
| Day 7 | WoW badges appear |
| Day 30 | MoM badges + 30-day sparklines |
| Day 90 | Full 90-day trends available |

**Tip**: To test immediately, manually backfill historical data:

```sql
-- Backfill 7 days of sample data
INSERT INTO `bidata-sharedus-production.governance.data_quality_history`
(snapshot_date, dimension, current_score, target, target_met, ...)
VALUES
(DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), 'Completeness', 92.5, 90, true, ...),
(DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY), 'Completeness', 91.8, 90, true, ...),
-- ... repeat for each day and dimension
```

---

## Verification Checklist

Once setup is complete, verify the following:

### Backend Health

```sql
-- Check if snapshots are running
SELECT
  MAX(snapshot_date) as last_snapshot,
  COUNT(DISTINCT snapshot_date) as total_snapshots,
  COUNT(*) as total_records
FROM `bidata-sharedus-production.governance.data_quality_history`;

-- Expected: last_snapshot = CURRENT_DATE or yesterday
-- Expected: 6 records per day (6 dimensions)
```

### UI Features

1. **Alerts Banner** - Appears when scores drop >5% in 7 days
2. **Sparklines** - Visible after 2+ days of data
3. **WoW Badges** - Visible after 7+ days of data
4. **MoM Badges** - Visible after 30+ days of data
5. **Alert Icons** - Bell icon on cards with active alerts
6. **Red Borders** - Cards with alerts get red border

### Test Scenarios

```typescript
// Scenario 1: No alerts (all dimensions healthy)
- No red banner at top
- No bell icons on cards
- Green/amber progress bars

// Scenario 2: 1 active alert (Completeness dropped 6%)
- Red banner shows "1 Active Quality Alert"
- Completeness card has bell icon + red border
- WoW badge shows -6.0% with red down arrow

// Scenario 3: First 24 hours (no historical data yet)
- No sparklines visible
- No WoW/MoM badges
- Only current scores displayed
```

---

## Monitoring & Maintenance

### Daily Health Check

```bash
# Check last snapshot timestamp
bq query --use_legacy_sql=false '
SELECT MAX(snapshot_date) as last_snapshot
FROM `bidata-sharedus-production.governance.data_quality_history`
'

# Should be today or yesterday (if checked before 1 AM)
```

### Check for Gaps

```sql
-- Find missing snapshot dates
WITH date_series AS (
  SELECT DATE_SUB(CURRENT_DATE(), INTERVAL seq DAY) as expected_date
  FROM UNNEST(GENERATE_ARRAY(0, 30)) as seq
)
SELECT
  d.expected_date,
  COUNT(h.snapshot_date) as snapshot_count
FROM date_series d
LEFT JOIN `bidata-sharedus-production.governance.data_quality_history` h
  ON d.expected_date = h.snapshot_date
GROUP BY d.expected_date
HAVING snapshot_count = 0
ORDER BY d.expected_date DESC;

-- Expected: No results (no gaps)
```

### Alert Investigation

```sql
-- Review all alerts in past 7 days
SELECT
  snapshot_date,
  dimension,
  current_score,
  score_change_7d,
  alert_reason
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE alert_triggered = TRUE
  AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY ABS(score_change_7d) DESC;
```

---

## Next Steps (Optional Future Enhancements)

Phase 3 is complete, but here are potential future improvements:

### 1. Email Notifications
- Send daily/weekly email summaries to data owners
- Alert notifications when scores drop >5%
- Weekly digest with trends and insights

### 2. Predictive Analytics
- Forecast quality scores using ML models
- Predict when dimensions will fall below target
- Recommend proactive actions before issues occur

### 3. Drill-Down Enhancements
- Add historical comparison charts to detail pages
- Show before/after snapshots of affected records
- Correlation analysis (which dimensions decline together?)

### 4. Custom Alert Thresholds
- Allow users to configure alert rules per dimension
- Different thresholds for different teams (Sales vs Ops)
- Snooze alerts for planned maintenance windows

### 5. Export & Reporting
- Export historical data to CSV/Excel
- Generate PDF reports for executive reviews
- Integrate with BI tools (Tableau, Power BI)

---

## Support & Troubleshooting

### Common Issues

**Issue**: No sparklines visible

**Solution**: Check if historical data exists:
```sql
SELECT dimension, COUNT(*) as days
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY dimension;
```
Expected: 30+ records per dimension

---

**Issue**: WoW/MoM badges not showing

**Solution**: Verify period comparisons query returns data:
```bash
curl -X POST http://localhost:3000/api/bigquery/query \
  -H "Content-Type: application/json" \
  -d '{"query":"data-quality-period-comparisons"}'
```

---

**Issue**: Alerts not triggering

**Solution**: Check alert detection logic:
```sql
-- Manually verify 7-day score drops
SELECT
  dimension,
  current_score,
  LAG(current_score, 7) OVER (PARTITION BY dimension ORDER BY snapshot_date) as score_7d_ago,
  current_score - LAG(current_score, 7) OVER (PARTITION BY dimension ORDER BY snapshot_date) as change
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 8 DAY)
ORDER BY snapshot_date DESC, dimension;

-- Alerts should trigger when change < -5
```

---

## Architecture Summary

```
┌──────────────────────────────────────────────────┐
│ Daily Cron Job (1 AM ET)                        │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ saveDataQualitySnapshot()                       │
│ - Fetches current scores                        │
│ - Calculates 1d/7d/30d changes                  │
│ - Detects alerts (>5% drop)                     │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ BigQuery: governance.data_quality_history        │
│ - Partitioned by snapshot_date                  │
│ - Clustered by dimension                        │
│ - 3-year retention                              │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ API Routes (/api/bigquery/query)                │
│ - data-quality-historical-trends                │
│ - data-quality-period-comparisons               │
│ - data-quality-alerts                           │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ React Component (DataQualityScorecard.tsx)      │
│ - Fetches 3 data sources in parallel            │
│ - Renders alerts banner                         │
│ - Displays sparklines on cards                  │
│ - Shows WoW/MoM badges                          │
│ - Highlights alerted dimensions                 │
└──────────────────────────────────────────────────┘
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/(dashboard)/admin/components/DataQualityScorecard.tsx` | Added sparklines, WoW/MoM badges, alerts banner, 3 new data hooks |
| `src/lib/bigquery/queries/data-quality.ts` | Added 4 historical tracking functions |
| `src/lib/bigquery/queries/index.ts` | Exported new functions and types |
| `src/app/api/bigquery/query/route.ts` | Registered 3 new query endpoints |
| `sql/data_quality_history.sql` | Created BigQuery table schema |
| `DATA-QUALITY-HISTORICAL-TRACKING-SETUP.md` | Comprehensive setup guide |

---

## Deliverables

✅ **Backend Infrastructure**
- BigQuery table schema with partitioning/clustering
- 4 new data quality functions
- 3 new API endpoints
- Comprehensive setup documentation

✅ **UI Visualizations**
- Active alerts banner with bell icon
- 30-day sparklines on dimension cards
- WoW/MoM change badges with tooltips
- Alert indicators (bell icon + red border)
- Enhanced hover effects and clickable cards

✅ **Build Verification**
- No TypeScript errors
- No linting issues (only warnings from other files)
- Production build succeeded

✅ **Documentation**
- Setup guide with 3 deployment options
- Verification checklist
- Monitoring queries
- Troubleshooting guide
- Architecture diagrams

---

## Success Metrics

Once live, track the following to measure Phase 3 success:

1. **Snapshot Reliability**: 99%+ daily snapshot success rate
2. **Alert Accuracy**: 0 false positives, catch all >5% drops
3. **UI Performance**: <500ms to load sparklines and badges
4. **User Engagement**: Dimension drill-down click-through rate
5. **Remediation Time**: Time from alert → issue resolved

---

## Conclusion

Phase 3 is **production-ready** with both backend and frontend complete. The Data Quality Scorecard now provides:

- **Real-time visibility** into data quality health
- **Historical context** via sparklines and trend indicators
- **Proactive alerts** for quality regressions
- **Actionable insights** with WoW/MoM comparisons

**Next Action**: Set up the BigQuery table and daily cron job to start collecting historical data.

---

**Questions?** Contact:
- Data Engineering: data-engineering@prestox.com
- BI Team: bi-team@prestox.com

**Resources**:
- BigQuery Console: https://console.cloud.google.com/bigquery
- Setup Guide: `DATA-QUALITY-HISTORICAL-TRACKING-SETUP.md`
- API Documentation: `/api/bigquery/query` endpoint
