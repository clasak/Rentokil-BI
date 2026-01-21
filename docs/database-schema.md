# Database Schema (Supabase)

Migrations are located in `/supabase/migrations/`. Run them in order via Supabase SQL Editor.

## Migration Overview

| Migration | Purpose |
|-----------|---------|
| `001_user_profiles.sql` | User auth and profile data |
| `002_kpi_snapshots.sql` | Historical KPI values for trending |
| `003_governance.sql` | KPI definitions, changes, incidents |
| `007_new_agents.sql` | Extended agent support (Bailey, Sam, Pete, Derek, Emma) |
| `008_rtx_monitoring.sql` | RTX Data Hub monitoring tables |

---

## Core Tables

### user_profiles
User authentication and profile data.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  department TEXT,
  role role_enum DEFAULT 'rep',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### kpi_snapshots
Historical KPI values for trending and anomaly detection.

```sql
CREATE TABLE kpi_snapshots (
  id UUID PRIMARY KEY,
  kpi_slug TEXT NOT NULL,
  value NUMERIC NOT NULL,
  target NUMERIC,
  status status_enum,  -- good/warning/critical/neutral
  source source_enum,  -- tommy/scheduled/manual/api
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Helper functions:**
- `get_kpi_stats(slug, days)` - Calculate KPI statistics
- `detect_kpi_anomaly(slug, value)` - Detect values outside 2 std devs

---

## Agent Support Tables (007)

### security_events
Login tracking for Sam security monitoring.

| Column | Type | Purpose |
|--------|------|---------|
| event_type | TEXT | login_success, login_failure, logout, password_reset, role_change |
| severity | TEXT | critical, high, medium, low, info |
| metadata | JSONB | Additional event data |

### performance_metrics
API latency for Pete performance monitoring.

| Column | Type | Purpose |
|--------|------|---------|
| endpoint | TEXT | API endpoint path |
| response_time_ms | INTEGER | Response time in milliseconds |
| status_code | INTEGER | HTTP status code |

### deployments
Deployment tracking for Derek.

| Column | Type | Purpose |
|--------|------|---------|
| deployment_id | TEXT | Unique deployment identifier |
| status | TEXT | building, ready, error, canceled |
| health_status | TEXT | healthy, degraded, unhealthy, pending |

### user_activity
Client telemetry for Emma engagement tracking.

| Column | Type | Purpose |
|--------|------|---------|
| page_url | TEXT | Page visited |
| action | TEXT | view, click, submit, export, search |
| duration_seconds | INTEGER | Time on page |

### business_alert_rules
Configurable thresholds for Bailey.

| Column | Type | Purpose |
|--------|------|---------|
| kpi_slug | TEXT | KPI to monitor |
| condition | TEXT | below_target, above_target, below_threshold, above_threshold |
| threshold_value | NUMERIC | Threshold for alert |
| severity | TEXT | critical, high, medium, low |
| cooldown_minutes | INTEGER | Minutes between alerts |

---

## RTX Monitoring Tables (008)

### rtx_health_log
Connection health history.

| Column | Type | Purpose |
|--------|------|---------|
| status | TEXT | healthy, degraded, unhealthy, unreachable |
| latency_ms | INTEGER | Connection latency |
| entities_available | TEXT[] | Available entity names |

### rtx_schema_registry
Discovered entities and fields.

| Column | Type | Purpose |
|--------|------|---------|
| entity_name | TEXT | Entity name |
| field_name | TEXT | Field name |
| field_type | TEXT | string, number, date, boolean, object, array |
| null_rate | NUMERIC | Percentage of null values |

### rtx_sync_log
Data sync history.

| Column | Type | Purpose |
|--------|------|---------|
| sync_type | TEXT | full, incremental, schema_only |
| status | TEXT | running, success, partial, failed |
| records_fetched/created/updated/skipped/failed | INTEGER | Record counts |

### rtx_integrity_checks
Data quality validation results.

| Column | Type | Purpose |
|--------|------|---------|
| check_type | TEXT | null_rate, duplicate, orphan, range, format |
| status | TEXT | ok, warning, critical |
| issues_found | INTEGER | Number of issues |

### data_source_status
Current source with failover tracking.

| Column | Type | Purpose |
|--------|------|---------|
| primary_source | TEXT | Primary data source (rtx) |
| fallback_source | TEXT | Fallback source (mock) |
| is_using_fallback | BOOLEAN | Currently using fallback? |
| event_type | TEXT | failover, recovery, manual_switch |

**Helper functions:**
- `get_rtx_entity_schema(entity_name)` - Get schema for an entity
- `detect_rtx_schema_changes(entity_name)` - Detect schema drift
- `get_last_rtx_sync(entity_name)` - Get last successful sync
- `get_rtx_integrity_status()` - Get overall data quality status
- `get_current_data_source()` - Get current active data source
