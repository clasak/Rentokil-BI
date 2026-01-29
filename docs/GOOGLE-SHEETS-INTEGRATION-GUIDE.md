# Google Sheets Integration Guide - New Start Log

This guide explains how to integrate the New Start Log with Google Sheets for real-time data syncing.

## Overview

The integration allows:
- **Manual Export**: Export current new starts to Google Sheets on-demand
- **Auto-Sync**: Real-time sync when ops data is updated (optional)
- **Append Mode**: Add new rows without overwriting existing data
- **Update Mode**: Update existing rows based on sales ID

## Prerequisites

### 1. Google Cloud Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable **Google Sheets API**:
   ```
   Navigation Menu → APIs & Services → Library
   Search for "Google Sheets API" → Enable
   ```

### 2. Create Service Account

1. Navigate to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Enter details:
   - Name: `rentokil-bi-sheets-sync`
   - Description: `Service account for New Start Log Google Sheets integration`
4. Click **Create and Continue**
5. Grant role: **Editor** (or create custom role with Sheets access)
6. Click **Done**

### 3. Generate Service Account Key

1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key → Create new key**
4. Choose **JSON** format
5. Download the key file
6. Save as `google-sheets-credentials.json` in project root (add to `.gitignore`)

### 4. Create Google Sheet

1. Create a new Google Sheet for New Start Log
2. Name it: `Rentokil New Start Log`
3. **Share the sheet** with the service account email:
   - Open the JSON credentials file
   - Copy the `client_email` value (looks like: `rentokil-bi-sheets-sync@project-id.iam.gserviceaccount.com`)
   - In Google Sheets, click **Share**
   - Paste the service account email
   - Grant **Editor** permissions
   - Click **Send** (uncheck "Notify people")

4. **Get the Sheet ID**:
   - Copy from URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Example: If URL is `https://docs.google.com/spreadsheets/d/1abc...xyz/edit`
   - Sheet ID is: `1abc...xyz`

### 5. Set Up Sheet Structure

Add headers in Row 1 (following AE column order from original Google Sheet):

**AE Section (Columns 1-14) - Sales Rep fills these**:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sold Date | Account Name | Service Address | Sales Rep(s) | Initial Price | Contract Price | Type | Frequency | Log Book | TAP Lead | PestPac Entry | Customer Start | POC Name/Phone | Special Notes |

**Ops Section (Columns 15-20) - Operations Manager fills these**:

| O | P | Q | R | S | T |
|---|---|---|---|---|---|
| Ops Manager | Specialist | Materials | Confirmed Start | Install Started | Status |

**Complete row 1 headers (copy to your Google Sheet)**:
```
Sold Date	Account Name	Service Address	Sales Rep(s) Involved	Initial/Job 1X Price	Maintenance (Contract) Price	Type	Frequency	Log Book Needed	TAP Lead/Specialist	PestPac Entry	Customer Requested Start	POC Name/Phone#	Special Notes	Operations Manager	Assigned Specialist	Materials Ordered	Confirmed Start Date	Installation Started	Status
```

## Environment Configuration

Add to `.env.local`:

```bash
# Google Sheets Integration
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL="rentokil-bi-sheets-sync@project-id.iam.gserviceaccount.com"
GOOGLE_SHEETS_NEW_START_LOG_ID="1abc...xyz"  # Your Sheet ID
```

**Note**: For `GOOGLE_SHEETS_PRIVATE_KEY`, copy the entire private_key value from the credentials JSON file, keeping the `\n` line breaks intact.

## API Implementation

### 1. Install Google Sheets API Client

```bash
npm install googleapis
```

### 2. Create API Endpoint

Create `/src/app/api/new-starts/sync-to-sheets/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getNewStarts } from '@/lib/bigquery/queries/new-starts'

const SHEET_ID = process.env.GOOGLE_SHEETS_NEW_START_LOG_ID
const PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL

export async function POST(request: NextRequest) {
  try {
    // Validate configuration
    if (!SHEET_ID || !PRIVATE_KEY || !CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Google Sheets integration not configured' },
        { status: 500 }
      )
    }

    // Parse request body
    const { mode = 'append', filters = {} } = await request.json()

    // Authenticate with Google Sheets API
    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Fetch data from BigQuery
    const newStarts = await getNewStarts(filters)

    if (newStarts.length === 0) {
      return NextResponse.json({
        message: 'No data to sync',
        rowsSynced: 0
      })
    }

    // Transform data to sheet rows
    const rows = newStarts.map(entry => [
      entry.id,                                    // Sales ID
      entry.soldDate,                              // Sold Date
      entry.accountName,                           // Account Name
      entry.serviceAddress,                        // Service Address
      entry.salesPerson,                           // Sales Rep
      entry.initialJobPrice,                       // Initial Price
      entry.contractValue,                         // Contract Value
      entry.serviceTypeName,                       // Service Type
      entry.branchCode,                            // Branch
      entry.regionCode,                            // Region
      entry.marketCode,                            // Market
      '',                                          // Ops Manager (empty - filled by Ops)
      '',                                          // Specialist (empty - filled by Ops)
      '',                                          // Materials (empty - filled by Ops)
      '',                                          // POC Name/Phone (empty - filled by Ops)
      entry.startDate || '',                       // Confirmed Start
      '',                                          // Install Started (empty - filled by Ops)
      entry.status,                                // Status
    ])

    if (mode === 'append') {
      // Append new rows to the end of the sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:R',
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      })

      return NextResponse.json({
        message: 'Data synced successfully',
        mode: 'append',
        rowsSynced: rows.length,
      })
    } else if (mode === 'overwrite') {
      // Clear existing data (except headers) and write new data
      // First, get the current number of rows
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:R',
      })

      const currentRows = response.data.values?.length || 1

      // Clear data rows (keep header)
      if (currentRows > 1) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SHEET_ID,
          range: `Sheet1!A2:R${currentRows}`,
        })
      }

      // Write new data
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A2:R',
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      })

      return NextResponse.json({
        message: 'Data synced successfully',
        mode: 'overwrite',
        rowsSynced: rows.length,
      })
    }

    return NextResponse.json(
      { error: 'Invalid mode. Use "append" or "overwrite"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Google Sheets sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync to Google Sheets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

### 3. Add Export Button to Ops Dashboard

Update `/src/app/(dashboard)/ops/new-starts/page.tsx`:

```typescript
// Add to imports
import { Download, Upload } from 'lucide-react'

// Add state for export
const [isExporting, setIsExporting] = useState(false)

// Add export handler
const handleExportToSheets = async (mode: 'append' | 'overwrite') => {
  if (isExporting) return

  setIsExporting(true)

  try {
    const response = await fetch('/api/new-starts/sync-to-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        filters: { daysBack: 90 } // Match current view filters
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Export failed')
    }

    const result = await response.json()
    alert(`✅ Success! Synced ${result.rowsSynced} rows to Google Sheets (${result.mode} mode)`)
  } catch (error) {
    console.error('Export error:', error)
    alert(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    setIsExporting(false)
  }
}

// Add button to header section (after DataSourceBadge)
<div className="flex items-center gap-2">
  <DataSourceBadge status={dataSource} />

  {/* Export to Google Sheets Button */}
  <div className="flex gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleExportToSheets('append')}
      disabled={isExporting || entries.length === 0}
    >
      <Upload className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Append to Sheets'}
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleExportToSheets('overwrite')}
      disabled={isExporting || entries.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Replace Sheets Data'}
    </Button>
  </div>
</div>
```

## Testing the Integration

### 1. Verify Configuration

Create a test endpoint at `/src/app/api/new-starts/sheets-config-test/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    configured: !!(
      process.env.GOOGLE_SHEETS_NEW_START_LOG_ID &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL
    ),
    sheetId: process.env.GOOGLE_SHEETS_NEW_START_LOG_ID ? '✅ Set' : '❌ Missing',
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY ? '✅ Set' : '❌ Missing',
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '❌ Missing',
  })
}
```

Visit: `http://localhost:3000/api/new-starts/sheets-config-test`

Expected response:
```json
{
  "configured": true,
  "sheetId": "✅ Set",
  "privateKey": "✅ Set",
  "clientEmail": "rentokil-bi-sheets-sync@your-project.iam.gserviceaccount.com"
}
```

### 2. Test Manual Export

1. Start dev server: `npm run dev`
2. Navigate to `/ops/new-starts`
3. Click **"Append to Sheets"** button
4. Check your Google Sheet - should see new rows added
5. Click **"Replace Sheets Data"** button
6. Check your Google Sheet - should see all data replaced (except headers)

### 3. Verify Data in Google Sheets

Check that:
- ✅ All columns align correctly with headers
- ✅ Dates are formatted properly (YYYY-MM-DD)
- ✅ Currency values are numeric (no $ symbols)
- ✅ Sales ID is unique per row
- ✅ Empty YELLOW columns are ready for Ops Manager to fill

## Auto-Sync Integration (Optional)

To automatically sync when ops data is saved, add this to your save handler:

```typescript
const handleSave = async () => {
  if (!editingEntry || isSubmitting) return

  setIsSubmitting(true)

  try {
    // 1. Save to your backend (replace with actual API call)
    await fetch('/api/new-starts/ops-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salesId: editingEntry.id,
        ...editForm,
      }),
    })

    // 2. Auto-sync to Google Sheets (background, don't wait)
    fetch('/api/new-starts/sync-to-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'append',
        filters: { salesId: editingEntry.id } // Only sync this entry
      }),
    }).catch(err => console.error('Auto-sync failed:', err))

    alert('✅ Saved successfully and synced to Google Sheets')
    setEditingEntry(null)
  } catch (error) {
    console.error('Error saving:', error)
    alert('❌ Failed to save changes')
  } finally {
    setIsSubmitting(false)
  }
}
```

## Troubleshooting

### Error: "Permission denied"

**Cause**: Service account doesn't have access to the sheet

**Solution**:
1. Open your Google Sheet
2. Click **Share**
3. Add the service account email: `your-service-account@project.iam.gserviceaccount.com`
4. Grant **Editor** access
5. Save

### Error: "Invalid credentials"

**Cause**: Environment variables not loaded or malformed

**Solution**:
1. Verify `.env.local` exists in project root
2. Check `GOOGLE_SHEETS_PRIVATE_KEY` has `\n` line breaks (not actual newlines)
3. Restart dev server: `npm run dev`
4. Test with: `http://localhost:3000/api/new-starts/sheets-config-test`

### Error: "Invalid grant"

**Cause**: System clock is out of sync

**Solution**:
1. Check your system time is correct
2. Sync with NTP: `sudo ntpdate -s time.nist.gov` (macOS/Linux)
3. Or manually set correct date/time in System Preferences

### Data Not Appearing in Sheet

**Cause**: Wrong sheet ID or wrong sheet name

**Solution**:
1. Verify `GOOGLE_SHEETS_NEW_START_LOG_ID` matches your sheet URL
2. Check the range in API calls uses correct sheet name (default: `Sheet1`)
3. If your sheet has a different name, update the range: `'YourSheetName!A:R'`

### Rate Limit Exceeded

**Cause**: Too many API calls in short time

**Solution**:
1. Google Sheets API has quotas: 100 requests/100 seconds per user
2. For production, implement rate limiting or batch updates
3. Consider using append mode instead of frequent overwrites

## Production Deployment

### Vercel Deployment

1. Add environment variables in Vercel dashboard:
   - `GOOGLE_SHEETS_PRIVATE_KEY`
   - `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `GOOGLE_SHEETS_NEW_START_LOG_ID`

2. Deploy: `vercel --prod`

3. Test on production URL

### Security Best Practices

1. **Never commit** `google-sheets-credentials.json` to Git
2. Add to `.gitignore`:
   ```
   google-sheets-credentials.json
   ```
3. Rotate service account keys every 90 days
4. Use separate service accounts for dev/staging/prod
5. Restrict API scopes to minimum required (only Sheets API)

## Alternative: Direct Google Sheets API (Client-Side)

For a simpler approach without backend API, you can use Google Sheets API directly from the frontend:

**Pros**:
- No backend required
- Real-time updates

**Cons**:
- API key exposed in frontend code
- Less control over data validation
- Harder to implement complex business logic

**Not recommended** for production due to security concerns.

## Summary

✅ **Setup Complete Checklist**:
- [ ] Google Cloud project created
- [ ] Google Sheets API enabled
- [ ] Service account created with credentials
- [ ] Google Sheet created and shared with service account
- [ ] Sheet ID copied
- [ ] Environment variables configured in `.env.local`
- [ ] API endpoint created at `/api/new-starts/sync-to-sheets/route.ts`
- [ ] Export buttons added to ops dashboard
- [ ] Test export successful
- [ ] Data appears correctly in Google Sheets

**Next Steps**:
1. Test manual export with sample data
2. Verify all columns align correctly
3. Test with real BigQuery data
4. (Optional) Implement auto-sync on save
5. Deploy to production with proper environment variables

**Support**:
- Google Sheets API Docs: https://developers.google.com/sheets/api
- Google Auth Library: https://github.com/googleapis/google-auth-library-nodejs
- Googleapis NPM: https://www.npmjs.com/package/googleapis
