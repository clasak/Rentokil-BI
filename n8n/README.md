# n8n AI Workforce Workflows

This folder contains importable n8n workflow JSON files for the Rentokil BI AI Workforce agents.

## Workflow Architecture

### Consolidated Approach (Recommended)

For production use, we recommend the consolidated two-workflow architecture:

| Workflow | File | Schedule | Purpose |
|----------|------|----------|---------|
| **OPS-UNIFIED-001** | `OPS-UNIFIED-001.json` | Every 5 min | Consolidated monitoring (all 9 agents) |
| **OPS-RTX-INTAKE-001** | `OPS-RTX-INTAKE-001.json` | Every 15 min | RTX Data Hub data intake & validation |

**Benefits:**
- ~70% reduction in workflow executions (from ~1,153/day to ~300-350/day)
- Single point of control for all monitoring
- Conditional execution based on time (agents run at their designated intervals)
- Separate data intake workflow for easy refinement

### Individual Agent Workflows (Legacy)

The individual workflows below are kept for reference and can be used if you prefer separate workflows per agent.

### Core Agents (Monitoring & Quality)

| Agent | File | Schedule | Purpose |
|-------|------|----------|---------|
| **Timmy** | `OPS-TIMMY-001.json` | Every 5 min | Reliability monitoring - health checks |
| **Tommy** | `OPS-TOMMY-001.json` | Every 15 min + hourly | Data quality - KPI snapshots & reconciliation |
| **Tina** | `OPS-TINA-001.json` | Every hour | Governance - KPI definition change detection |
| **Sophia** | `OPS-SOPHIA-001.json` | Every 10 min | Feedback intake - triage & Slack alerts |

### Extended Agents (Business, Security, Performance, DevOps, Engagement)

| Agent | File | Schedule | Purpose |
|-------|------|----------|---------|
| **Bailey** | `OPS-BAILEY-001.json` | Every 30 min (7am-7pm) | Business alerts - KPI threshold monitoring |
| **Sam** | `OPS-SAM-001.json` | Every 15 min | Security - threat detection & anomaly monitoring |
| **Pete** | `OPS-PETE-001.json` | Every 5 min | Performance - SLA monitoring & latency tracking |
| **Derek** | `OPS-DEREK-001.json` | Every 30 min | Deployment - health verification post-deploy |
| **Emma** | `OPS-EMMA-001.json` | Daily at 6am | Engagement - user activity & adoption metrics |

---

## Pre-Requisites

Before importing workflows, ensure you have:

### 1. Supabase Tables Created

Run these migrations in your Supabase SQL Editor:

```bash
# Located in /supabase/migrations/
001_ops_events.sql      # ops_events table
002_kpi_snapshots.sql   # kpi_snapshots table
003_governance.sql      # governance_snapshots, governance_changes, incidents tables
004_feedback_submissions.sql  # feedback_submissions table (for Sophia)
007_new_agents.sql      # security_events, performance_metrics, deployments,
                        # user_activity, engagement_summary, business_alert_rules
008_rtx_monitoring.sql  # rtx_health_log, rtx_schema_registry, rtx_sync_log,
                        # rtx_integrity_checks, data_source_status
```

### 2. API Endpoints Deployed

Verify these endpoints are accessible:

| Endpoint | Used By | Test |
|----------|---------|------|
| `/api/health` | Timmy, Derek | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/health` |
| `/api/health/kpis` | Tommy, Pete | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/health/kpis` |
| `/api/reconcile` | Tommy | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/reconcile` |
| `/api/governance/definitions` | Tina | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/governance/definitions` |
| `/api/feedback` | Sophia | `curl -X POST https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/feedback` |
| `/api/alerts/business` | Bailey | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/alerts/business` |
| `/api/security/threats` | Sam | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/security/threats` |
| `/api/performance/metrics` | Pete | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/performance/metrics` |
| `/api/deployments` | Derek | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/deployments` |
| `/api/engagement/summary` | Emma | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/engagement/summary` |
| `/api/rtx/health` | RTX Intake | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/rtx/health` |
| `/api/rtx/discover` | RTX Intake | `curl -X POST https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/rtx/discover` |
| `/api/rtx/sync` | RTX Intake | `curl -X POST https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/rtx/sync` |
| `/api/rtx/integrity` | RTX Intake | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/rtx/integrity` |
| `/api/rtx/failover` | RTX Intake | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/rtx/failover` |
| `/api/rtx/reconcile` | RTX Intake | `curl -X POST https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/rtx/reconcile` |

### 3. n8n Credentials

Create a Postgres credential named `Supabase-Prod`:

| Field | Value |
|-------|-------|
| Host | `aws-0-us-east-1.pooler.supabase.com` (use Session Pooler) |
| Database | `postgres` |
| User | `postgres.YOUR-PROJECT-REF` |
| Password | (from Supabase dashboard) |
| Port | `5432` |
| SSL | **Disable** (for pooler connections) |

**Note:** Use Session Pooler (not Direct Connection) for IPv4 compatibility with n8n.

### 4. RTX API Credential (for RTX Intake Workflow)

The RTX endpoints require authentication for POST requests. Create an HTTP Header Auth credential named `RTX-API-Key`:

1. In n8n, go to **Credentials** → **Create New**
2. Select **HTTP Header Auth**
3. Configure:

| Field | Value |
|-------|-------|
| Name | `RTX-API-Key` |
| Header Name | `Authorization` |
| Header Value | `Bearer YOUR_INTERNAL_API_KEY` |

4. In your Vercel/deployment environment, set:
   ```bash
   INTERNAL_API_KEY=your-secure-random-key
   ```

5. After importing `OPS-RTX-INTAKE-001.json`, update the credential ID:
   - Find nodes with `REPLACE_WITH_RTX_API_CREDENTIAL_ID`
   - Replace with your actual credential ID from n8n

**Security Note:** This key authenticates n8n workflows to call internal RTX endpoints. GET endpoints are public for dashboard access, but POST endpoints (discover, sync, failover) require authentication.

---

## Import Instructions

### Step 1: Import Workflow

1. Open n8n
2. Click **Workflows** → **Import from File**
3. Select the JSON file (e.g., `OPS-TIMMY-001.json`)
4. Click **Import**

### Step 2: Update Credentials

After import, each Postgres node will show a warning. For each:

1. Click the node
2. Select your `Supabase-Prod` credential
3. Save

### Step 3: Test Manually

1. Click **Execute Workflow** to run once
2. Verify:
   - HTTP requests succeed (green checkmarks)
   - Database inserts work (check Supabase tables)
   - No errors in execution log

### Step 4: Activate

1. Toggle **Active** switch to ON
2. Workflow now runs on schedule

---

## Workflow Details

### OPS-TIMMY-001 (Health Monitor)

**Schedule:** Every 5 minutes

**Flow:**
```
[Schedule] → [GET /api/health] → [Is Healthy?]
                                    ├─ YES → [Log Success to ops_events]
                                    └─ NO  → [Log Failure to ops_events]
```

**What it monitors:**
- Overall app health status
- Synthetic data validation
- KPI calculation availability
- Data source freshness

**Output:** All events logged to `ops_events` table with severity `info` (success) or `critical` (failure).

---

### OPS-TOMMY-001 (KPI Snapshot)

**Schedule:**
- Every 15 minutes (KPI health check)
- Every hour (reconciliation)

**Flow (15-min):**
```
[Schedule] → [GET /api/health/kpis] → [Check Thresholds] → [Split KPIs]
    → [Insert into kpi_snapshots] → [Has Critical?]
                                        ├─ YES → [Log Alert to ops_events]
                                        └─ NO  → [Log Success to ops_events]
```

**Flow (hourly):**
```
[Schedule] → [GET /api/reconcile] → [Has Failures?]
                                        ├─ YES → [Log Recon Failure to ops_events]
                                        └─ NO  → [Log Recon Success to ops_events]
```

**What it monitors:**
- KPI values against warning/critical thresholds
- Reconciliation tolerance violations
- Data quality anomalies

**Output:** KPI snapshots stored in `kpi_snapshots` table; events logged to `ops_events`.

---

### OPS-TINA-001 (Governance Monitor)

**Schedule:** Every hour

**Flow:**
```
[Schedule] → [GET /api/governance/definitions] + [SELECT governance_snapshots]
    → [Merge] → [Compare Definitions]
        ├─ First Run → [Create Initial Snapshot] → [Log Init to ops_events]
        ├─ Changes   → [Insert Changes to governance_changes] + [Log to ops_events] + [Update Snapshot]
        └─ No Changes → [Log No Changes to ops_events]
```

**What it monitors:**
- KPI definition changes (formula, thresholds, ownership)
- New KPIs added
- KPIs deprecated/removed
- Unauthorized modifications

**Output:** Changes tracked in `governance_changes` table; snapshots in `governance_snapshots`; events in `ops_events`.

---

### OPS-SOPHIA-001 (Feedback Triage)

**Schedule:** Every 10 minutes

**Flow:**
```
[Schedule] → [SELECT new feedback] → [Has New Feedback?]
                                          ├─ YES → [Process Feedback] → [Loop Items]
                                          │              → [Acknowledge in DB]
                                          │              → [Needs Slack Alert?]
                                          │                   ├─ YES → [Send Slack Alert]
                                          │                   └─ NO  → [Log Triaged to ops_events]
                                          │              → [Log Batch Summary]
                                          └─ NO  → [Log No Feedback to ops_events]
```

**What it monitors:**
- New feedback submissions from alpha users
- Critical/high severity feedback for immediate Slack alerts
- Feedback triage workflow (new → acknowledged)
- Submitter information and context

**Database Tables:**
- Reads from: `feedback_submissions` (status = 'new')
- Writes to: `feedback_submissions` (updates status to 'acknowledged')
- Writes to: `ops_events` (all triage events with source = 'sophia')

**Slack Integration:**
- Sends alerts for `critical` and `high` severity feedback immediately
- Uses Slack Block Kit for rich formatting with emoji indicators
- Includes submitter name, role, feedback type, severity, and page URL

**Feedback Types with Icons:**
| Type | Icon |
|------|------|
| bug | 🐛 |
| performance | ⚡ |
| data | 📊 |
| ui_ux | 🎨 |
| feature | ✨ |
| idea | 💡 |
| documentation | 📚 |

**Output:** Feedback acknowledged in `feedback_submissions`; all events logged to `ops_events` with source `sophia`.

---

### OPS-BAILEY-001 (Business Alerts)

**Schedule:** Every 30 minutes (business hours 7am-7pm recommended)

**Flow:**
```
[Schedule] → [GET /api/alerts/business] → [Has Alerts?]
                                              ├─ YES → [Split by Severity]
                                              │           ├─ Critical → [Slack Red] → [Log to ops_events]
                                              │           └─ High → [Slack Orange] → [Log to ops_events]
                                              └─ NO  → [Log Quiet to ops_events]
```

**What it monitors:**
- KPI values against business-defined thresholds (via `business_alert_rules` table)
- Revenue below target (critical at -10%, warning at -5%)
- Win rate declining below 28%
- Service risk index below 70
- AR aging exceeding $60M
- DSO exceeding 50 days

**Database Tables:**
- Reads from: `business_alert_rules` (active rules with thresholds)
- Writes to: `ops_events` (alerts with source = 'bailey')

**Alert Severities:**
| Severity | Color | Example |
|----------|-------|---------|
| Critical | 🔴 Red | Revenue MTD -10% vs target |
| High | 🟠 Orange | Win rate dropped below 28% |
| Medium | 🟡 Yellow | Capacity utilization below 65% |

**Output:** Business alerts logged to `ops_events` with severity and recommended actions.

---

### OPS-SAM-001 (Security Monitor)

**Schedule:** Every 15 minutes

**Flow:**
```
[Schedule] → [GET /api/security/threats] → [Has Threats?]
                                               ├─ YES → [Is Critical?]
                                               │           ├─ YES → [Slack Critical] → [Log Critical to ops_events]
                                               │           └─ NO  → [Slack Warning] → [Log High to ops_events]
                                               └─ NO  → [Log Quiet to ops_events]
```

**What it monitors:**
- Brute force attacks (>5 login failures in 15 min from same email/IP)
- Privilege escalation (unauthorized role changes)
- Session anomalies (impossible travel, unusual access patterns)
- Failed login patterns

**Database Tables:**
- Reads from: `security_events` (login successes, failures, role changes)
- Writes to: `ops_events` (threats with source = 'sam')

**Threat Types:**
| Type | Severity | Detection |
|------|----------|-----------|
| Brute Force | Critical | >5 failures in 15 min |
| Privilege Escalation | Critical | Role change to exec/admin |
| Session Anomaly | High | Unusual patterns |

**Output:** Security threats logged to `ops_events`; critical threats trigger immediate Slack alerts.

---

### OPS-PETE-001 (Performance Monitor)

**Schedule:** Every 5 minutes

**Flow:**
```
[Schedule] → [Measure Endpoints] → [Split Metrics] → [Insert to performance_metrics]
                                                          → [SLA Breach?]
                                                               ├─ YES → [Slack Warning] → [Log to ops_events]
                                                               └─ NO  → [Log Success to ops_events]
```

**What it monitors:**
- API response times (p50, p95, p99 latency)
- Endpoint availability
- Error rates
- SLA threshold breaches

**Endpoints Monitored:**
- `/api/health`
- `/api/health/kpis`
- `/api/kpis`

**SLA Thresholds:**
| Metric | Target | Breach |
|--------|--------|--------|
| p50 | < 500ms | > 500ms |
| p95 | < 2000ms | > 2000ms (alerts) |
| p99 | < 5000ms | > 5000ms |
| Error Rate | < 1% | > 1% |

**Database Tables:**
- Writes to: `performance_metrics` (individual measurements)
- Writes to: `ops_events` (SLA breaches with source = 'pete')

**Output:** Performance metrics stored; SLA breaches trigger Slack alerts.

---

### OPS-DEREK-001 (Deployment Monitor)

**Schedule:** Every 30 minutes (or webhook-triggered)

**Flow:**
```
[Schedule/Webhook] → [GET /api/deployments] → [New Deployment?]
                                                   ├─ YES → [Wait 60s Warmup] → [GET /api/health]
                                                   │                               → [Health OK?]
                                                   │                                    ├─ YES → [Slack Green] → [Log Healthy]
                                                   │                                    └─ NO  → [Slack Red] → [Log Unhealthy]
                                                   └─ NO  → [Log No Deploy to ops_events]
```

**What it monitors:**
- New deployments detected via Vercel
- Post-deployment health verification (after 60s warmup)
- Deployment success/failure status
- Rollback recommendations on failure

**Database Tables:**
- Reads from: `deployments` (deployment records)
- Writes to: `ops_events` (verification results with source = 'derek')

**Health Verification Checks:**
1. `/api/health` returns 200 status
2. Health status is "healthy" (not "degraded" or "unhealthy")
3. Response time within acceptable range

**Output:** Deployment verification logged to `ops_events`; failures trigger immediate Slack alerts with rollback suggestion.

---

### OPS-EMMA-001 (Engagement Monitor)

**Schedule:** Daily at 6am

**Flow:**
```
[Schedule Daily] → [GET /api/engagement/summary] → [Process Engagement]
                                                        → [Save to engagement_summary]
                                                        → [Has Alerts?]
                                                             ├─ YES → [Slack Warning] → [Log Alert to ops_events]
                                                             └─ NO  → [Log Success to ops_events]
```

**What it monitors:**
- Daily Active Users (DAU)
- Total sessions
- Average session duration
- Top pages by views
- Feature adoption rates
- Engagement by role

**Database Tables:**
- Reads from: `user_activity` (client-side telemetry)
- Writes to: `engagement_summary` (daily rollups)
- Writes to: `ops_events` (alerts with source = 'emma')

**Alert Thresholds:**
| Metric | Warning |
|--------|---------|
| DAU | < 10 users |
| Sessions | < 20 sessions |
| DAU Change | > -20% day-over-day |

**Client-Side Integration:**
Telemetry collected via `/api/telemetry` endpoint from:
- Page views with route and duration
- Feature interactions (clicks, exports, searches)
- Session tracking

**Output:** Daily engagement summary stored; low engagement triggers Slack alerts with recommendations.

---

## Notification Setup (Optional)

The workflows use **database-only logging** by default. All events are stored in `ops_events` table.

To add external notifications later:

### Option A: Email (SMTP)
1. Create SMTP credential in n8n
2. Add "Send Email" node after log nodes
3. Configure recipients and template

### Option B: Slack
1. Create Slack App with Incoming Webhook
2. Add "HTTP Request" node (POST to webhook URL)
3. Format message body as Slack JSON

### Option C: Discord
1. Create Discord webhook in channel settings
2. Add "HTTP Request" node (POST to webhook URL)
3. Format message body as Discord embed

### Option D: Custom Dashboard
Build a dashboard page that queries `ops_events`:
```sql
SELECT * FROM ops_events
WHERE severity IN ('critical', 'high')
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Workflow not running

1. Check Active toggle is ON
2. Verify schedule configuration
3. Check n8n execution logs for errors

### HTTP Request timeout

1. Increase timeout in node options (default: 10000ms)
2. Verify APP_URL is correct (hardcoded: `https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app`)
3. Check if Vercel deployment is healthy

### Postgres connection failed

**"ENETUNREACH" error:**
- You're using Direct Connection (IPv6)
- Switch to Session Pooler connection string

**"self-signed certificate" error:**
- Set SSL to Disable in n8n credential
- Pooler connections work without SSL verification

**"No columns found" error:**
- Tables don't exist yet
- Run migrations in Supabase SQL Editor first

### Insert/constraint errors

**"null value in column 'id' violates not-null constraint":**
- Do NOT include `id` field in insert columns
- Database generates UUIDs via `DEFAULT gen_random_uuid()`
- The `$uuid` and `crypto.randomUUID()` expressions don't work reliably in n8n

**"violates check constraint 'kpi_snapshots_status_check'":**
- API returns `ok` but database expects `good`
- Use Code node to map: `if (status === 'ok') return 'good'`
- Valid statuses: `good`, `warning`, `critical`, `neutral`

**"violates check constraint 'ops_events_source_check'":**
- Source value not in allowed list
- Run migration 005 to add `sophia` source
- Valid sources: `timmy`, `tommy`, `tina`, `sophia`, `manual`, `system`, `n8n-test`, `api`

### Merge node errors

**"You need to define at least one pair of fields in 'Fields to Match'":**
- Change merge mode from `combine` to `append`
- Use `append` when you just need to combine items without matching

### Code node errors

**"A 'json' property isn't an object":**
- Code node must return proper n8n format: `[{ json: {...} }]`
- When processing arrays, map each item: `items.map(item => ({ json: item }))`

### Environment variables not working

If n8n blocks env vars:
- URLs are now hardcoded in workflow JSON
- No environment variables required

---

## Maintenance

### Rotating Credentials

1. Update in Supabase dashboard
2. Update in n8n Credentials
3. Test affected workflows

### Updating Workflows

1. Export current workflow (backup)
2. Import updated JSON
3. Re-link credentials
4. Test manually before activating

### Monitoring Agent Health

Check `ops_events` table for agent activity:

```sql
SELECT source, event_type, severity, message, created_at
FROM ops_events
WHERE source IN ('timmy', 'tommy', 'tina', 'sophia', 'bailey', 'sam', 'pete', 'derek', 'emma')
ORDER BY created_at DESC
LIMIT 50;
```

### View Recent Alerts Only

```sql
SELECT *
FROM ops_events
WHERE severity IN ('critical', 'high')
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

---

## Consolidated Workflows

### OPS-UNIFIED-001 (Consolidated Monitoring)

**Schedule:** Every 5 minutes (with conditional agent execution)

**Agent Execution Schedule:**
| Agent | Frequency | Condition |
|-------|-----------|-----------|
| Timmy | Every 5 min | Always |
| Pete | Every 5 min | Always |
| RTX Health | Every 5 min | Always |
| Sophia | Every 10 min | `minute % 10 === 0` |
| Tommy | Every 15 min | `minute % 15 === 0` |
| Sam | Every 15 min | `minute % 15 === 0` |
| Bailey | Every 30 min | `minute % 30 === 0` |
| Derek | Every 30 min | `minute % 30 === 0` |
| RTX Integrity | Every 30 min | `minute % 30 === 0` |
| Tina | Hourly | `minute === 0` |
| Reconcile | Hourly | `minute === 0` |
| Emma | Daily 6am | `minute === 0 && hour === 6` |

**Flow:**
```
[Schedule 5 min] → [Schedule Router] → [Parallel Agent Execution]
                                             ├─ Timmy: Health Check
                                             ├─ Pete: Performance
                                             ├─ RTX: Health
                                             ├─ (Conditional) Sophia, Tommy, Sam, etc.
                                             └─ [Merge Results]
                                                  → [Process Results]
                                                       ├─ [Prepare Logs] → [Insert to ops_events]
                                                       └─ [Has Alerts?]
                                                            ├─ YES → [Slack Alert]
                                                            └─ NO  → (done)
```

**Output:** All agent results consolidated; alerts batched; single log entry per cycle.

---

### OPS-RTX-INTAKE-001 (Data Intake)

**Schedule:** Every 15 minutes (configurable)

**Flow:**
```
[Schedule 15 min] → [Check RTX Health] → [Is Healthy?]
                                              ├─ NO  → [Trigger Failover] → [Log Failover Event]
                                              └─ YES → [Needs Discovery?]
                                                           ├─ YES (daily) → [Run Schema Discovery]
                                                           │                    → [Has Changes?]
                                                           │                         ├─ YES → [Slack Schema Changes]
                                                           │                         └─ (continue)
                                                           └─ (continue) → [Run Data Sync]
                                                                               → [Sync Succeeded?]
                                                                                    ├─ NO  → [Log Failure] → [Slack Sync Failure]
                                                                                    └─ YES → [Run Integrity Check]
                                                                                                  → [Integrity Healthy?]
                                                                                                       ├─ NO  → [Log Warning] → [Slack Integrity Warning]
                                                                                                       └─ YES → [Log Success]
```

**What it monitors:**
- RTX Data Hub connection health
- Schema discovery (runs daily at midnight UTC)
- Data sync status and record counts
- Data integrity (null rates, duplicates, orphans)
- Automatic failover to mock data when RTX unavailable

**Database Tables:**
- Reads from: `rtx_schema_registry` (discovered schema)
- Writes to: `rtx_health_log`, `rtx_sync_log`, `rtx_integrity_checks`, `data_source_status`, `ops_events`

**Failover Behavior:**
1. RTX health check runs every 15 minutes
2. If unhealthy 3 consecutive times, triggers failover to mock data
3. Logs failover event and sends Slack alert
4. Continues checking in background
5. Auto-recovers when RTX becomes healthy

**Output:** Sync results logged; integrity issues trigger warnings; failover events trigger critical alerts.

---

## RTX Data Hub Integration

### Environment Variables

```bash
# RTX Data Hub Configuration
RTX_API_ENDPOINT=https://rtx-data-hub.rentokil.com/api/v1
RTX_API_KEY=your_api_key
RTX_API_TIMEOUT=30000

# Data Source Selection
NEXT_PUBLIC_DATA_SOURCE=rtx  # or 'mock' or 'hybrid'
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rtx/health` | GET | Check RTX connection, latency, entity availability |
| `/api/rtx/discover` | POST | Discover and register schema from RTX |
| `/api/rtx/sync` | POST | Trigger data sync (full or incremental) |
| `/api/rtx/sync/status` | GET | Check sync status by ID or latest |
| `/api/rtx/integrity` | GET | Run data quality checks |
| `/api/rtx/reconcile` | POST | Compare RTX values with app calculations |
| `/api/rtx/failover` | GET/POST | Get status or log failover/recovery events |

### Schema Discovery

Since the actual RTX data structure may be unknown initially:

1. **First Connect**: Full schema discovery runs
2. **Daily Refresh**: Checks for schema changes at midnight UTC
3. **Change Detection**: Alerts on added/removed/changed fields
4. **Graceful Handling**: Unknown fields logged but don't fail sync

### Failover Configuration

```typescript
const FAILOVER_CONFIG = {
  maxConsecutiveFailures: 3,      // Trigger failover after 3 failures
  healthCheckIntervalMs: 60000,   // Check RTX health every 60 seconds
  recoveryCheckIntervalMs: 300000 // Try to recover every 5 minutes
}
```

### Database Tables (Migration 008)

| Table | Purpose |
|-------|---------|
| `rtx_health_log` | Connection health history |
| `rtx_schema_registry` | Discovered entities and fields |
| `rtx_sync_log` | Data sync history |
| `rtx_integrity_checks` | Data quality validation results |
| `data_source_status` | Current source with failover tracking |

---

## Support

For issues with these workflows, check:
1. n8n execution logs
2. `ops_events` table for logged errors
3. API endpoint responses directly
4. Supabase logs for database errors
