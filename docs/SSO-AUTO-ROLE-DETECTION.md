# SSO Auto-Role Detection System

> **Status:** Code complete, awaiting SSO provider configuration and database migration
>
> **To deploy:** Run the database migration, configure SSO providers in Supabase, then test.

---

## Overview

This system automatically detects a user's dashboard role based on their Workday job title when they sign in via SSO (Microsoft Entra ID or Okta). No manual onboarding required for SSO users.

## How It Works

```
User enters email@prestox.com
        ↓
Login page detects Okta SSO required (from domain)
        ↓
User clicks "Continue with Okta"
        ↓
Okta authenticates → redirects to /auth/sso-callback
        ↓
Callback extracts employee_id from SSO claims
        ↓
BigQuery lookup in S0_TMX.Employees_Main
        ↓
Job title "Regional Sales Manager" → region_sales_manager role
        ↓
Profile saved to Supabase, cookie set
        ↓
User lands on dashboard with correct role view
```

---

## Files Involved

### Core Logic

| File | Purpose |
|------|---------|
| `/src/lib/role-mapping.ts` | Regex patterns to map Workday job titles → dashboard roles |
| `/src/lib/sso-config.ts` | Email domain → SSO provider mapping (Microsoft/Okta) |
| `/src/lib/bigquery/queries/employee.ts` | BigQuery queries for employee lookup |

### Auth Flow

| File | Purpose |
|------|---------|
| `/src/app/(auth)/login/page.tsx` | Login page with SSO detection and buttons |
| `/src/app/auth/sso-callback/route.ts` | Handles SSO callback, role detection, profile creation |
| `/src/middleware.ts` | Skips onboarding for SSO users |
| `/src/components/providers/AuthProvider.tsx` | Loads SSO user profiles with org hierarchy |

### Admin

| File | Purpose |
|------|---------|
| `/src/app/(dashboard)/admin/users/page.tsx` | User management - view/override roles |
| `/src/app/api/employee/lookup/route.ts` | Protected API for employee lookup |

---

## SSO Provider Configuration

### Domain → Provider Mapping

Defined in `/src/lib/sso-config.ts`:

```typescript
// Microsoft Entra ID (Azure AD)
domains: ['rentokil.com', 'terminix.com', 'ehrlichpest.com', 'jcehrlich.com',
          'westernpest.com', 'andersonpestcontrol.com', 'hometeam.com']

// Okta
domains: ['prestox.com', 'presto-x.com']
```

To add new domains, edit the `SSO_PROVIDERS` array in that file.

---

## Job Title → Role Mapping

Defined in `/src/lib/role-mapping.ts`:

| Job Title Pattern | Dashboard Role |
|-------------------|----------------|
| CEO, CFO, COO, Chief, President, SVP | `exec` |
| Vice President, VP | `market_vp` |
| Market Sales Director | `market_sales_director` |
| Region Director, Area Director | `region_director` |
| Region Sales Manager | `region_sales_manager` |
| Branch Manager, General Manager, GM | `manager` |
| Sales Manager (not region) | `sales_manager` |
| Operations Manager, Service Manager | `ops_manager` |
| Account Executive, Sales Rep, Inspector | `rep` |
| Technician, Tech, Service Pro, PCO | `technician` |

**Default role if no match:** `rep`

---

## Database Migration Required

Add these columns to the `user_profiles` table in Supabase:

```sql
-- SSO Authentication Fields
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sso_provider TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS workday_job_title TEXT;

-- Auto-Role Detection
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auto_detected_role TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role_override BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role_override_by TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role_override_at TIMESTAMPTZ;

-- Organization Hierarchy (from BigQuery)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS market_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Index for employee lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_number ON user_profiles(employee_number);
```

---

## Supabase SSO Setup

### 1. Add Microsoft Entra ID (Azure AD)

```bash
# Get your Azure AD metadata URL from Azure Portal
# Azure AD > Enterprise Applications > Your App > Single Sign-On > Federation Metadata XML

supabase sso add --type saml \
  --project-ref YOUR_PROJECT_REF \
  --metadata-url 'https://login.microsoftonline.com/YOUR_TENANT_ID/federationmetadata/2007-06/federationmetadata.xml' \
  --domains rentokil.com,terminix.com,ehrlichpest.com,jcehrlich.com,westernpest.com,andersonpestcontrol.com,hometeam.com
```

### 2. Add Okta

```bash
# Get your Okta metadata URL from Okta Admin Console
# Applications > Your App > Sign On > SAML Metadata URL

supabase sso add --type saml \
  --project-ref YOUR_PROJECT_REF \
  --metadata-url 'https://YOUR_OKTA_DOMAIN.okta.com/app/YOUR_APP_ID/sso/saml/metadata' \
  --domains prestox.com,presto-x.com
```

### 3. Configure Attribute Mapping

Ensure the SSO provider sends `employeeId` or `employee_number` in claims. The callback checks these claim names:

- `employee_id`
- `employeeId`
- `employeeNumber`
- `employee_number`
- `EmployeeID`
- `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/employeeid`

---

## Admin Role Override

Admins can override any user's auto-detected role at `/admin/users`:

1. View all users and their current roles
2. See Workday job title vs. assigned dashboard role
3. Click Edit to change a user's role
4. Option to "Reset to Auto-Detected" if previously overridden

Override audit trail stored in:
- `role_override` (boolean)
- `role_override_by` (admin email)
- `role_override_at` (timestamp)

---

## BigQuery Data Source

Employee data comes from:

```
Project: bidata-sharedus-production
Table: S0_TMX.Employees_Main (29K rows)

Key Fields:
- Employee_Number (unique ID)
- First_Name, Last_Name
- Job_Title (used for role mapping)
- Branch, Branch_Code
- Region_Description, Region_Code
- Division_Description (market)
- Supervisor_Name
```

---

## Security

1. **Employee lookup API** - Requires authentication; non-admins can only lookup their own data
2. **SSO callback** - Uses Supabase secure token exchange
3. **BigQuery queries** - All parameterized (no SQL injection)
4. **Domain whitelist** - Only approved corporate domains can authenticate
5. **Admin access** - User management restricted to admin emails in `/src/lib/admin.ts`

---

## Testing

### Test SSO Flow (once configured)

1. Go to `/login`
2. Enter an email like `test@rentokil.com`
3. Should see "Continue with Microsoft" button
4. Click to initiate SSO
5. After auth, should land on dashboard with auto-detected role

### Test Role Mapping

```typescript
import { mapJobTitleToRole } from '@/lib/role-mapping'

// Test cases
mapJobTitleToRole('Vice President, Sales') // → market_vp
mapJobTitleToRole('Branch Manager') // → manager
mapJobTitleToRole('Service Technician II') // → technician
mapJobTitleToRole('Unknown Title') // → rep (default)
```

### Test Admin Override

1. Login as admin (email in `/src/lib/admin.ts`)
2. Go to `/admin/users`
3. Find a user, click Edit
4. Change role, verify it persists

---

## Troubleshooting

### SSO not working

- Check Supabase dashboard for SSO provider status
- Verify domain is in the provider's domain list
- Check browser console for redirect errors

### Role not detected correctly

- Check `/admin/users` to see the Workday job title
- Add new pattern to `/src/lib/role-mapping.ts` if needed
- Override manually as admin

### Employee not found in BigQuery

- Verify email format matches (first.last@domain.com)
- Check if employee exists in `S0_TMX.Employees_Main`
- User will get default role (`rep`) if not found

---

## Future Enhancements

- [ ] Periodic re-sync of employee data (job title changes)
- [ ] Self-service role change request for mismatches
- [ ] SSO session timeout handling
- [ ] Multi-branch assignment for regional roles
