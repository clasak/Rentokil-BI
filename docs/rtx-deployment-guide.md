# RTX Monitoring System Deployment Guide

Step-by-step instructions for deploying the RTX Data Hub monitoring system to production.

## Prerequisites

- Vercel project connected to this repository
- Supabase project with admin access
- n8n instance (cloud or self-hosted)
- Slack workspace (optional, for alerts)

---

## Step 1: Run Database Migration (Supabase)

1. **Open Supabase Dashboard** > **SQL Editor**

2. **Run Migration 008**
   - Open `/supabase/migrations/008_rtx_monitoring.sql`
   - Copy contents and run in SQL Editor

3. **Verify Tables Created**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'rtx_%' OR table_name = 'data_source_status';
   ```

   Expected tables (6):
   - `rtx_health_log`
   - `rtx_schema_registry`
   - `rtx_sync_log`
   - `rtx_integrity_checks`
   - `rtx_reconciliation`
   - `data_source_status`

---

## Step 2: Configure Vercel Environment Variables

1. **Vercel Dashboard** > **Settings** > **Environment Variables**

2. **Add RTX API Authentication Key**

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `INTERNAL_API_KEY` | Generate 32+ char random string | Production, Preview |

   ```bash
   # Generate secure key
   openssl rand -base64 32
   ```

3. **Add RTX Data Hub Credentials** (if connecting to actual RTX)

   | Variable | Value |
   |----------|-------|
   | `RTX_API_ENDPOINT` | `https://rtx-data-hub.rentokil.com/api/v1` |
   | `RTX_API_KEY` | Your RTX API key from IT |
   | `RTX_API_TIMEOUT` | `30000` |

4. **Add Slack Webhook** (optional)

   | Variable | Value |
   |----------|-------|
   | `SLACK_WEBHOOK_URL` | Your Slack incoming webhook URL |

5. **Redeploy** to apply changes

---

## Step 3: Configure n8n Credentials

1. **Create HTTP Header Auth Credential**
   - **Settings** > **Credentials** > **Add Credential** > **HTTP Header Auth**
   - Name: `RTX-API-Key`
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_INTERNAL_API_KEY`
   - Copy the credential ID

2. **Create Supabase Postgres Credential**
   - Name: `Supabase-Prod`
   - Host: Your Supabase Session Pooler host
   - Database: `postgres`
   - User: `postgres.xxxxx`
   - Port: `5432` or `6543` for pooler
   - SSL: Enable

---

## Step 4: Import n8n Workflows

### 4.1 Import OPS-RTX-INTAKE-001

1. **Workflows** > **Import from File** > `/n8n/OPS-RTX-INTAKE-001.json`

2. **Update credential references**
   - Search for `REPLACE_WITH_RTX_API_CREDENTIAL_ID` - replace with your credential ID
   - Search for `REPLACE_WITH_SUPABASE_CREDENTIAL_ID` - replace with your credential ID

3. **Update API base URL**
   - Search for `YOUR_VERCEL_DEPLOYMENT_URL` - replace with production URL

4. **Save and activate**

### 4.2 Import OPS-UNIFIED-001 (Optional)

Consolidated monitoring workflow with all 9 agents. Follow same credential replacement steps.

---

## Step 5: Test the Deployment

1. **Test RTX Health Endpoint**
   ```bash
   curl https://YOUR_VERCEL_URL/api/rtx/health
   ```

2. **Test Authenticated Endpoint**
   ```bash
   curl -X POST https://YOUR_VERCEL_URL/api/rtx/discover \
     -H "Authorization: Bearer YOUR_INTERNAL_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"force": true}'
   ```

3. **Test n8n Workflow**
   - Execute workflow manually
   - Check Supabase tables for new records

4. **Verify RTX Discovery Dashboard**
   - Navigate to `/governance/rtx-discovery`
   - Click **Run Discovery** button

---

## Production Checklist

- [ ] Database migration ran (6 tables created)
- [ ] `INTERNAL_API_KEY` set in Vercel
- [ ] n8n `RTX-API-Key` credential created
- [ ] n8n `Supabase-Prod` credential created
- [ ] OPS-RTX-INTAKE-001 workflow imported and activated
- [ ] `/api/rtx/health` returns valid response
- [ ] RTX Discovery dashboard accessible

---

## Troubleshooting

### API Returns 401 Unauthorized
- Verify `INTERNAL_API_KEY` in Vercel matches n8n credential
- Ensure header format is `Bearer <key>`

### n8n Workflow Fails with "Invalid credentials"
- Search workflow JSON for `REPLACE_WITH_` placeholders
- Replace with actual credential IDs

### Database Tables Not Found
- Re-run `/supabase/migrations/008_rtx_monitoring.sql`

### Health Check Shows "unreachable"
- Expected if `RTX_API_ENDPOINT` not set
- App uses mock data as fallback

---

## Security Notes

1. **INTERNAL_API_KEY**: Protects all RTX POST endpoints
   - Never commit to repository
   - Rotate quarterly

2. **Row Level Security**: All RTX tables have RLS
   - `authenticated` users can read
   - Only `service_role` can write

---

## Monitoring

### Daily
- n8n workflow execution history
- Supabase logs for errors
- Slack alerts

### Weekly
- Review `rtx_health_log` for degraded periods
- Check `data_source_status` for failover events

### Monthly
- Rotate `INTERNAL_API_KEY` if needed
- Clean up logs older than 90 days
