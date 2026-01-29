# Data Quality Historical Tracking - Setup Guide

## Overview

Phase 3 adds historical tracking to the Data Quality Scorecard, enabling:
- 📈 90-day trend analysis
- 📊 Week-over-week and month-over-month comparisons
- 🚨 Automatic alerts for quality regressions
- 📉 Historical drill-downs

---

## Setup Instructions

### Step 1: Create BigQuery Table

Run the SQL script to create the historical tracking table:

1. Open [BigQuery Console](https://console.cloud.google.com/bigquery?project=bidata-sharedus-production)
2. Open `sql/data_quality_history.sql` file
3. Copy and paste the entire script into BigQuery Console
4. Click "Run" to execute

**What it creates:**
- Dataset: `governance` (if doesn't exist)
- Table: `data_quality_history`
- Partitioned by `snapshot_date` for performance
- 3-year data retention

### Step 2: Set Up Daily Snapshot Job

You need to run `saveDataQualitySnapshot()` once per day to capture snapshots.

#### Option A: Cloud Scheduler (Recommended)

1. **Create Cloud Function:**

```bash
# Create function directory
mkdir cloud-functions/data-quality-snapshot
cd cloud-functions/data-quality-snapshot

# Create package.json
cat > package.json << 'EOF'
{
  "name": "data-quality-snapshot",
  "version": "1.0.0",
  "dependencies": {
    "@google-cloud/bigquery": "^7.0.0"
  }
}
EOF

# Create index.js
cat > index.js << 'EOF'
const { BigQuery } = require('@google-cloud/bigquery');

exports.saveSnapshot = async (req, res) => {
  // Your saveDataQualitySnapshot logic here
  // See: src/lib/bigquery/queries/data-quality.ts
  res.status(200).send('Snapshot saved');
};
EOF

# Deploy function
gcloud functions deploy data-quality-snapshot \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --project bidata-sharedus-production
```

2. **Create Cloud Scheduler Job:**

```bash
gcloud scheduler jobs create http data-quality-daily-snapshot \
  --schedule="0 1 * * *" \
  --uri="https://us-central1-bidata-sharedus-production.cloudfunctions.net/data-quality-snapshot" \
  --http-method=POST \
  --time-zone="America/New_York" \
  --project bidata-sharedus-production
```

#### Option B: Manual Cron Job

If you have a server running 24/7, create a cron job:

```bash
# Create script
cat > /opt/rentokil-bi/scripts/save-dq-snapshot.sh << 'EOF'
#!/bin/bash
curl -X POST http://localhost:3000/api/data-quality/save-snapshot
EOF

chmod +x /opt/rentokil-bi/scripts/save-dq-snapshot.sh

# Add to crontab (runs daily at 1 AM)
crontab -e
# Add line:
0 1 * * * /opt/rentokil-bi/scripts/save-dq-snapshot.sh
```

#### Option C: Next.js API Route + External Cron

1. **Create API endpoint** (`src/app/api/data-quality/save-snapshot/route.ts`):

```typescript
import { NextResponse } from 'next/server'
import { saveDataQualitySnapshot } from '@/lib/bigquery/queries/data-quality'

export async function POST() {
  try {
    await saveDataQualitySnapshot()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Snapshot failed:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
```

2. **Use external cron service** (EasyCron, Cron-job.org, etc.):
   - URL: `https://your-domain.com/api/data-quality/save-snapshot`
   - Method: POST
   - Schedule: Daily at 1 AM

### Step 3: Wait for Data to Accumulate

**Important:** You need historical data before trends will appear!

- **Day 1:** First snapshot saved - no trends yet
- **Day 2:** Can show 1-day change
- **Day 7:** Can show week-over-week comparison
- **Day 30:** Can show month-over-month comparison
- **Day 90:** Full 90-day trend charts available

**Tip:** To test immediately, you can manually backfill data:

```sql
-- Backfill historical data (example - run for each past date)
-- Replace 'CURRENT_DATE()' with specific dates
INSERT INTO `bidata-sharedus-production.governance.data_quality_history`
(snapshot_date, dimension, current_score, target, target_met, ...)
VALUES
(DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), 'Accuracy', 95.2, 95, true, ...),
(DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), 'Completeness', 88.1, 90, false, ...);
-- ... repeat for each dimension and date
```

---

## Using Historical Tracking

### View Historical Trends (API)

```typescript
// Get 90-day trend for specific dimension
const trends = await fetch('/api/bigquery/query', {
  method: 'POST',
  body: JSON.stringify({
    query: 'data-quality-historical-trends',
    filters: { dimension: 'Completeness', days: 90 }
  })
})

// Get week-over-week comparisons
const comparisons = await fetch('/api/bigquery/query', {
  method: 'POST',
  body: JSON.stringify({
    query: 'data-quality-period-comparisons'
  })
})

// Get active alerts
const alerts = await fetch('/api/bigquery/query', {
  method: 'POST',
  body: JSON.stringify({
    query: 'data-quality-alerts'
  })
})
```

### Query Historical Data (BigQuery Console)

```sql
-- 90-day trend for Completeness
SELECT
  snapshot_date,
  current_score,
  target,
  score_change_7d
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE dimension = 'Completeness'
  AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
ORDER BY snapshot_date DESC;

-- Find all quality regressions
SELECT
  snapshot_date,
  dimension,
  current_score,
  score_change_7d,
  alert_reason
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE alert_triggered = TRUE
  AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
ORDER BY ABS(score_change_7d) DESC;

-- Week-over-week summary
SELECT
  dimension,
  current_score,
  score_change_7d,
  CASE
    WHEN score_change_7d > 2 THEN 'Improving ↑'
    WHEN score_change_7d < -2 THEN 'Declining ↓'
    ELSE 'Stable →'
  END as trend
FROM `bidata-sharedus-production.governance.data_quality_history`
WHERE snapshot_date = CURRENT_DATE()
ORDER BY dimension;
```

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────┐
│ 1. Daily Cron Job (1 AM)                       │
│    ↓                                            │
│ 2. saveDataQualitySnapshot()                    │
│    - Fetches current scores                     │
│    - Calculates changes (1d/7d/30d)             │
│    - Detects alerts (>5% drop)                  │
│    ↓                                            │
│ 3. Insert into governance.data_quality_history  │
│    - Partitioned by date                        │
│    - Clustered by dimension                     │
│    ↓                                            │
│ 4. Query APIs                                   │
│    - getDataQualityHistoricalTrends()           │
│    - getDataQualityPeriodComparisons()          │
│    - getDataQualityAlerts()                     │
│    ↓                                            │
│ 5. Dashboard Components                         │
│    - Trend charts                               │
│    - WoW/MoM badges                             │
│    - Alert indicators                           │
└─────────────────────────────────────────────────┘
```

### Table Schema

```sql
data_quality_history (
  snapshot_date DATE,           -- Partition key
  dimension STRING,             -- Cluster key
  current_score FLOAT64,
  target FLOAT64,
  score_change_1d FLOAT64,      -- Change from 1 day ago
  score_change_7d FLOAT64,      -- Change from 7 days ago
  score_change_30d FLOAT64,     -- Change from 30 days ago
  target_met BOOL,
  alert_triggered BOOL,         -- TRUE if dropped >5% in 7d
  alert_reason STRING,
  top_issue STRING,
  affected_records INT64,
  ...
)
PARTITION BY snapshot_date
CLUSTER BY dimension, snapshot_date
```

---

## Alert Logic

Alerts are automatically triggered when:
- **Threshold:** Score drops more than 5% in 7 days
- **Example:** Completeness goes from 93.5% → 87.2% (−6.3%)

When triggered:
- `alert_triggered` = TRUE
- `alert_reason` = "Completeness score dropped 6.3% in the past 7 days"
- Appears in `getDataQualityAlerts()` API response

---

## Monitoring & Maintenance

### Check if snapshots are running:

```sql
SELECT
  MAX(snapshot_date) as last_snapshot,
  COUNT(DISTINCT snapshot_date) as total_snapshots,
  COUNT(*) as total_records
FROM `bidata-sharedus-production.governance.data_quality_history`;
```

Expected: Last snapshot should be today or yesterday.

### Check for gaps:

```sql
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
```

Expected: No missing dates.

### Storage costs:

- **Row size:** ~500 bytes per dimension
- **Daily storage:** 6 dimensions × 500 bytes = 3 KB/day
- **Annual storage:** 3 KB × 365 = ~1 MB/year
- **Cost:** Negligible (<$0.01/year)

---

## Troubleshooting

### No data in table

**Problem:** `SELECT * FROM data_quality_history` returns 0 rows

**Solution:**
1. Check if table exists: `bq ls governance`
2. Check if snapshot job is running: Review Cloud Scheduler logs
3. Manually trigger snapshot: Call `/api/data-quality/save-snapshot`
4. Check for errors in application logs

### Alerts not triggering

**Problem:** No alerts even when scores drop

**Solution:**
1. Need at least 7 days of data for 7-day comparisons
2. Check threshold: Must drop >5% to trigger
3. Manually check calculation:
   ```sql
   SELECT dimension, current_score,
     LAG(current_score, 7) OVER (PARTITION BY dimension ORDER BY snapshot_date) as score_7d_ago
   FROM data_quality_history
   WHERE dimension = 'Completeness'
   ORDER BY snapshot_date DESC LIMIT 10;
   ```

### Duplicate snapshots

**Problem:** Multiple records per day

**Solution:**
- Add UNIQUE constraint or modify insert logic to prevent duplicates
- Delete duplicates:
  ```sql
  DELETE FROM `bidata-sharedus-production.governance.data_quality_history`
  WHERE created_at NOT IN (
    SELECT MIN(created_at)
    FROM `bidata-sharedus-production.governance.data_quality_history`
    GROUP BY snapshot_date, dimension
  );
  ```

---

## Next Steps

Once historical tracking is running:

1. **Add trend charts to UI** (coming soon)
   - Mini sparklines on dimension cards
   - Full 90-day chart on detail pages

2. **Email notifications** (future)
   - Send alerts when scores drop
   - Weekly summary reports

3. **Predictive analytics** (future)
   - Forecast quality scores
   - Identify patterns before issues occur

---

## Support

**Questions?** Contact:
- Data Engineering: data-engineering@prestox.com
- BI Team: bi-team@prestox.com

**Documentation:**
- BigQuery Console: https://console.cloud.google.com/bigquery
- Cloud Scheduler: https://console.cloud.google.com/cloudscheduler
- Application Logs: https://console.cloud.google.com/logs
