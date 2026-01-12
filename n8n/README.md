# n8n AI Workforce Workflows

This folder contains importable n8n workflow JSON files for the Rentokil BI AI Workforce agents.

## Agents Overview

| Agent | File | Schedule | Purpose |
|-------|------|----------|---------|
| **Timmy** | `OPS-TIMMY-001.json` | Every 5 min | Reliability monitoring - health checks |
| **Tommy** | `OPS-TOMMY-001.json` | Every 15 min + hourly | Data quality - KPI snapshots & reconciliation |
| **Tina** | `OPS-TINA-001.json` | Every hour | Governance - KPI definition change detection |
| **Sophia** | `OPS-SOPHIA-001.json` | Every 10 min | Feedback intake - triage & Slack alerts |

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
```

### 2. API Endpoints Deployed

Verify these endpoints are accessible:

| Endpoint | Used By | Test |
|----------|---------|------|
| `/api/health` | Timmy | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/health` |
| `/api/health/kpis` | Tommy | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/health/kpis` |
| `/api/reconcile` | Tommy | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/reconcile` |
| `/api/governance/definitions` | Tina | `curl https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/governance/definitions` |
| `/api/feedback` | Sophia | `curl -X POST https://rentokil-bi-git-alpha-test-clasaks-projects.vercel.app/api/feedback` |

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
WHERE source IN ('timmy', 'tommy', 'tina', 'sophia')
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

## Support

For issues with these workflows, check:
1. n8n execution logs
2. `ops_events` table for logged errors
3. API endpoint responses directly
4. Supabase logs for database errors
