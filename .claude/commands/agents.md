# AI Workforce Agents Setup & Deployment

You are helping set up the Rentokil BI AI Workforce monitoring agents (Timmy, Tommy, Tina) in n8n.

## Context

This is a Next.js 14 BI dashboard deployed on Vercel with Supabase backend. The AI Workforce consists of 3 n8n agents that monitor the application.

## Agents Overview

| Agent | Purpose | Schedule | Endpoints Used |
|-------|---------|----------|----------------|
| **Timmy** | Reliability - Health checks, uptime, incidents | Every 5 min | `/api/health` |
| **Tommy** | Data Quality - KPI validation, reconciliation | Every 15 min + hourly | `/api/health/kpis`, `/api/reconcile` |
| **Tina** | Governance - KPI definition change detection | Every hour | `/api/governance/definitions` |

## Files Location

### API Endpoints (Ready)
- `src/app/api/health/route.ts` - Timmy health check
- `src/app/api/health/kpis/route.ts` - Tommy KPI health
- `src/app/api/kpis/route.ts` - KPI values
- `src/app/api/reconcile/route.ts` - Tommy reconciliation
- `src/app/api/governance/definitions/route.ts` - Tina definitions

### Supabase Migrations (Run in SQL Editor)
- `supabase/migrations/001_ops_events.sql` - ops_events table
- `supabase/migrations/002_kpi_snapshots.sql` - kpi_snapshots table
- `supabase/migrations/003_governance.sql` - governance tables

### n8n Workflow JSON Files (Import to n8n)
- `n8n/OPS-TIMMY-001.json` - Health monitor workflow
- `n8n/OPS-TOMMY-001.json` - KPI snapshot workflow
- `n8n/OPS-TINA-001.json` - Governance monitor workflow
- `n8n/README.md` - Setup instructions

## n8n Setup Steps

### 1. Run Supabase Migrations
In Supabase SQL Editor, run each migration file in order (001, 002, 003).

### 2. Create n8n Postgres Credential
Name: `Supabase-Prod`
- Host: `aws-0-us-east-1.pooler.supabase.com` (use Session Pooler)
- Database: `postgres`
- User: `postgres.YOUR-PROJECT-REF`
- Password: Your database password
- Port: `5432`
- SSL: `Disable` (for pooler connection)

### 3. No Environment Variables Required
URLs are hardcoded in the workflow JSON files. No n8n variables needed.

### 4. Import Workflows
Import each JSON file from `/n8n/` folder, then:
- Link Postgres credential to each database node
- Test workflow manually
- Activate when ready

## n8n AI Prompts

If using n8n's AI workflow builder, give this context first:

```
I'm building monitoring agents for a Next.js BI dashboard called "Rentokil BI" deployed on Vercel.

APP CONTEXT:
- Frontend: Next.js 14 at {{$env.APP_URL}}
- Backend: Supabase Postgres

API ENDPOINTS:
1. GET /api/health - Overall app health
2. GET /api/health/kpis - KPI calculation health
3. GET /api/reconcile - KPI tolerance validation
4. GET /api/governance/definitions - KPI definitions with hash

DATABASE TABLES:
1. ops_events - Agent event logs
2. kpi_snapshots - Historical KPI values
3. governance_snapshots - Definition snapshots
4. governance_changes - Definition changes

ENVIRONMENT VARIABLES:
- {{$env.APP_URL}}
- {{$env.TEAMS_WEBHOOK_URL}}

POSTGRES CREDENTIAL: "Supabase-Prod"
```

## Troubleshooting

### Connection Issues
- Use Session Pooler (not Direct Connection) for IPv4 compatibility
- Set SSL to Disable for pooler connections
- User format for pooler: `postgres.YOUR-PROJECT-REF`

### Missing Tables
- Run migrations in Supabase SQL Editor first
- Click "Retry" in n8n after creating tables

### Notifications
- Workflows use **database-only logging** by default
- All events stored in `ops_events` table
- Add notification nodes later if needed (Email, Slack, Discord)

## Commands

When user asks about agents, help them with:
1. Checking agent status/files
2. Setting up n8n
3. Troubleshooting connections
4. Importing workflows
5. Testing endpoints
