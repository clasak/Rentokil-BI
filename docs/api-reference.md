# API Reference

All API endpoints are located at `/api/*`.

## Core Endpoints

### GET /api/health
App health status check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-18T...",
  "services": { "database": true, "kpis": true }
}
```

### GET /api/kpis
Fetch KPI data with optional filtering.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `top10` | boolean | Return only TOP_10 KPIs |
| `role` | string | Filter by role (exec, rep, etc.) |

**Response:**
```json
{
  "kpis": [
    { "slug": "revenue-mtd", "value": 125000, "target": 150000, "status": "warning" }
  ]
}
```

### GET /api/health/kpis
KPI health with threshold checks. Used by Tommy agent.

### GET/POST /api/reconcile
KPI reconciliation with tolerance rules.

**Tolerance Rules:**
| Category | Tolerance |
|----------|-----------|
| revenue | 0.1% |
| count | 0% (exact) |
| rate | 0.5% |
| index | 1.0 point |
| forecast | 5% |
| default | 1% |

### POST /api/reconcile/refresh
Auto-remediation: refresh data and retry reconciliation.

**Request:**
```json
{
  "failedKpis": ["revenue-mtd", "win-rate"],
  "retryCount": 1,
  "maxRetries": 3
}
```

**Response:**
```json
{
  "success": true,
  "summary": { "fixed": 2, "stillFailing": 0 },
  "nextAction": "none"
}
```

---

## RTX Data Hub Endpoints

### GET /api/rtx/health
RTX connection health, latency, entity availability.

**Response:**
```json
{
  "status": "healthy",
  "connection": { "reachable": true, "latency_ms": 45 },
  "entities": { "accounts": { "available": true } }
}
```

### POST /api/rtx/discover
Schema discovery - auto-detect entities and fields.

**Auth Required:** `Authorization: Bearer <INTERNAL_API_KEY>`

**Request:**
```json
{ "force": true }
```

### POST /api/rtx/sync
Trigger data sync (full or incremental).

**Auth Required:** Yes

**Request:**
```json
{ "type": "incremental", "entity": "accounts" }
```

### GET /api/rtx/sync/status
Check sync status by ID or latest.

### GET /api/rtx/integrity
Data quality checks (nulls, duplicates, orphans).

### GET/POST /api/rtx/failover
Get status or log failover/recovery events.

---

## Agent Endpoints

### GET /api/governance/definitions
KPI definitions for audit. Used by Tina agent.

### GET /api/alerts/business
Business rule alerts. Used by Bailey agent.

### GET/POST /api/security/events
Security event logging. Used by Sam agent.

### GET /api/security/threats
Threat detection (brute force, privilege escalation).

### GET/POST /api/performance/metrics
Performance metrics (latency). Used by Pete agent.

### GET/POST /api/deployments
Deployment tracking. Used by Derek agent.

### GET /api/engagement/summary
User engagement metrics. Used by Emma agent.

### GET/POST /api/telemetry
Client-side activity tracking.

---

## Start Packet Endpoints

### POST /api/parse-pdf
Extract text from Start Packet PDFs.

**Request:** Form data with PDF file

### GET/POST /api/start-packet
CRUD for Start Packets.

### GET/PUT/DELETE /api/start-packet/[id]
Individual Start Packet operations.

### POST /api/notifications/ops-email
Send Ops notification emails for handoffs.

---

## RTX Failover System

The service layer includes automatic failover when RTX Data Hub is unavailable.

**Configuration** (`/src/services/index.ts`):
```typescript
const FAILOVER_CONFIG = {
  maxConsecutiveFailures: 3,      // Trigger failover after 3 failures
  healthCheckIntervalMs: 60000,   // Check RTX health every 60 seconds
  recoveryCheckIntervalMs: 300000 // Try to recover every 5 minutes
}
```

**Failover Flow:**
1. Track consecutive RTX failures via `recordRTXFailure()`
2. After 3 failures, trigger failover to mock data
3. Send Slack alert via `/api/rtx/failover`
4. Continue health checks in background
5. Auto-recover when RTX becomes healthy via `recordRTXSuccess()`
