# Customer Satisfaction (NPS) Dashboard Implementation

**Date**: 2026-01-26
**Dataset Activated**: `S0_TMX.tmx_survey_Qualtrics_V5` (5.7M rows)
**Status**: ✅ Complete and production-ready

---

## Overview

Complete implementation of a customer satisfaction dashboard featuring Net Promoter Score (NPS) analysis, survey response tracking, and detractor feedback analysis using the previously unused Qualtrics survey dataset.

---

## Files Created/Modified

### 1. BigQuery Query Module
**File**: `/src/lib/bigquery/queries/customer-satisfaction.ts`

**Queries Implemented**:
- `getNPSScore()` - Calculate NPS with promoters/passives/detractors breakdown by month
- `getSurveyResponses()` - Get detailed survey responses with filters
- `getDetractorAnalysis()` - Analyze detractor feedback by service category
- `getBranchNPSComparison()` - Branch performance comparison with trends

**Key Features**:
- Parameterized queries for security (SQL injection prevention)
- Role-based filtering (market/region/branch)
- Geographic filter support
- Minimum response thresholds for statistical significance

**NPS Calculation**:
```sql
NPS = ((Promoters - Detractors) / Total Responses) * 100

Promoters: q1_26_nps_group = '3' (scores 9-10)
Passives: q1_26_nps_group = '2' (scores 7-8)
Detractors: q1_26_nps_group = '1' (scores 0-6)
```

---

### 2. Dashboard Page
**File**: `/src/app/(dashboard)/customer-satisfaction/page.tsx`

**Components**:
- Overall NPS score card with gauge visualization
- Promoters/Passives/Detractors breakdown (count + percentage)
- NPS trend chart (monthly progression) using Recharts
- Response distribution pie chart
- Detractor analysis table grouped by service category
- Branch comparison (top 10 best/worst performers)
- Recent detractor feedback section with customer quotes

**Features**:
- Date range filter (30/60/90/180/365 days)
- Organization filters (market/region/branch via global filter)
- Empty state handling
- Dark mode support
- Refresh button
- Data source badge with response time

**Design Patterns**:
- Follows existing dashboard patterns from SALTI Productivity page
- Uses shadcn/ui components (Card, Tabs, Table, Badge)
- Recharts visualizations with `cursor={false}` (no gray hover overlay)
- Role-based data filtering via `includeOrgFilters`

---

### 3. API Registration
**File**: `/src/app/api/bigquery/query/route.ts`

**Queries Registered**:
```typescript
'nps-score': getNPSScore,
'survey-responses': getSurveyResponses,
'detractor-analysis': getDetractorAnalysis,
'branch-nps-comparison': getBranchNPSComparison,
```

---

### 4. Permissions
**File**: `/src/lib/bigquery/permissions.ts`

**Access Control**:
```typescript
'nps-score': ['exec', 'market_vp', 'region_director', 'manager'],
'survey-responses': ['exec', 'market_vp', 'region_director', 'manager'],
'detractor-analysis': ['exec', 'market_vp', 'region_director', 'manager'],
'branch-nps-comparison': ['exec', 'market_vp', 'region_director', 'manager'],
```

**Reasoning**: NPS is a leadership metric for exec, market VPs, region directors, and branch managers. Not available to reps or technicians.

---

### 5. Navigation
**File**: `/src/components/layout/Sidebar.tsx`

**Added to Navigation**:
- Executive nav
- Market VP nav
- Region Director nav
- Branch Manager nav

**Icon**: Star (Lucide React)
**Route**: `/customer-satisfaction`

---

## Data Schema

### Source Table
**Table**: `S0_TMX.tmx_survey_Qualtrics_V5`
**Row Count**: 5.7M
**System**: Qualtrics CVC (Customer Voice of Customer)

### Key Columns Used
| Column | Type | Description |
|--------|------|-------------|
| `q1_26` | STRING | NPS score (0-10) |
| `q1_26_nps_group` | STRING | NPS category (3=Promoter, 2=Passive, 1=Detractor) |
| `q218` | STRING | Customer feedback text |
| `recordeddate` | TIMESTAMP | Survey completion date |
| `district_id` | STRING | Branch identifier |
| `district_name` | STRING | Branch name |
| `region` | STRING | Region code |
| `market_name` | STRING | Market name |
| `customer_name` | STRING | Customer name |
| `customer_email` | STRING | Customer email |
| `specialist_colleague` | STRING | Technician/rep ID |
| `service_code` | STRING | Service category |
| `survey_type` | STRING | Survey distribution method |

---

## Usage Examples

### 1. View Overall NPS
```typescript
const { data: npsData } = useBigQueryData<NPSScore[], NPSScore[]>({
  queryName: 'nps-score',
  filters: { daysBack: 30 },
  defaultData: EMPTY_NPS,
  transformBigQueryData: transformNPSScore,
  includeOrgFilters: true,
})
```

### 2. Get Detractor Feedback
```typescript
const { data: detractorData } = useBigQueryData<DetractorAnalysis[], DetractorAnalysis[]>({
  queryName: 'detractor-analysis',
  filters: { daysBack: 30 },
  defaultData: EMPTY_DETRACTORS,
  transformBigQueryData: transformDetractors,
  includeOrgFilters: true,
})
```

### 3. Branch Comparison
```typescript
const { data: branchData } = useBigQueryData<BranchNPSComparison[], BranchNPSComparison[]>({
  queryName: 'branch-nps-comparison',
  filters: { daysBack: 30, limit: 20 },
  defaultData: EMPTY_BRANCHES,
  transformBigQueryData: transformBranches,
  includeOrgFilters: true,
})
```

---

## NPS Scoring Methodology

### Industry Benchmarks
- **Excellent**: NPS ≥ 50 (Green badge)
- **Good**: NPS 30-49 (Blue badge)
- **Fair**: NPS 0-29 (Amber badge)
- **Poor**: NPS < 0 (Red badge)

### Calculation
```
Promoters = COUNT(q1_26_nps_group = '3')
Detractors = COUNT(q1_26_nps_group = '1')
Total = Total survey responses

NPS = ((Promoters - Detractors) / Total) * 100
```

### Example
- 100 responses: 60 Promoters, 20 Passives, 20 Detractors
- NPS = ((60 - 20) / 100) * 100 = **40** (Good)

---

## Key Insights Surfaced

### 1. Overall Customer Sentiment
- Monthly NPS trend to track improvement/decline
- Distribution of promoters/passives/detractors
- Total response volume

### 2. Problem Areas
- Detractor analysis by service category
- Identifies which services have most complaints
- Sample feedback for qualitative insights

### 3. Branch Performance
- Top 10 performers (best NPS scores)
- Bottom 10 performers (needs improvement)
- Trend indicators (Improving/Declining/Stable)
- Minimum 10 responses required for statistical significance

### 4. Recent Concerns
- Latest detractor feedback with customer quotes
- Branch and date context
- Actual NPS scores (0-6 range)

---

## Technical Highlights

### Security
- ✅ Parameterized queries (no SQL injection risk)
- ✅ Role-based permissions enforced
- ✅ Organization-level filtering (users see only their data)
- ✅ No hardcoded project IDs

### Performance
- ✅ Efficient aggregation queries with WHERE filters
- ✅ Indexed columns (recordeddate, district_id, region, market_name)
- ✅ Minimum threshold filters (e.g., 10+ responses for branch comparison)
- ✅ LIMIT clauses to prevent large result sets

### UX
- ✅ Empty state handling (no data message)
- ✅ Loading states with spinner
- ✅ Dark mode support
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Data source badge with response time
- ✅ Refresh button for manual updates

---

## Testing Checklist

- [x] TypeScript compilation (no errors)
- [x] ESLint (warnings only for useEffect deps - acceptable)
- [x] Next.js build (successful)
- [x] Query module created with 4 functions
- [x] API routes registered (4 queries)
- [x] Permissions added (4 queries)
- [x] Dashboard page created
- [x] Navigation links added (4 roles)
- [x] Dark mode compatibility
- [x] Empty state handling

---

## Future Enhancements (Optional)

1. **Sentiment Analysis**: Use `q218___sentiment` and `q218___topics` columns for AI-driven insights
2. **Response Rate Tracking**: Calculate survey send vs. completion rates
3. **Service Technician NPS**: Individual tech performance via `specialist_colleague`
4. **NPS by Customer Type**: Residential vs. Commercial analysis via `customer_type`
5. **Predictive Alerts**: Notify when NPS drops below threshold
6. **Export Functionality**: Download detractor feedback as CSV
7. **Email Integration**: Auto-email detractor alerts to branch managers

---

## Deployment Notes

### Environment Variables
No new environment variables required. Uses existing BigQuery configuration:
- `BIGQUERY_ENVIRONMENT` (auto-detected)
- `GOOGLE_APPLICATION_CREDENTIALS` (ADC for local dev)

### Route
- **URL**: `/customer-satisfaction`
- **Auth**: Required (middleware enforces)
- **Roles**: exec, market_vp, region_director, manager

### Data Freshness
Survey data is loaded daily from Qualtrics. Check data freshness SLA via:
- **Table**: `S0_TMX.tmx_survey_Qualtrics_V5`
- **Column**: `_load_timestamp`

---

## Success Metrics

### Adoption
- Dashboard view count (track via analytics)
- Unique users accessing NPS dashboard
- Time spent on page

### Business Impact
- NPS improvement over 6 months
- Reduction in detractor count
- Increase in promoter percentage
- Detractor issue resolution rate

### Data Quality
- Survey response rate
- Feedback text completion rate (q218)
- Data freshness (daily load verification)

---

## Support

### Documentation
- See `/README.md` for general dashboard usage
- See `/CLAUDE.md` for development patterns
- See `/docs/bigquery-integration-status.md` for data source mapping

### Contact
For questions or issues:
- Review query logic in `/src/lib/bigquery/queries/customer-satisfaction.ts`
- Check permissions in `/src/lib/bigquery/permissions.ts`
- Verify API registration in `/src/app/api/bigquery/query/route.ts`

---

**Implementation Complete** ✅
All requirements met. Dashboard is production-ready and follows existing patterns.
