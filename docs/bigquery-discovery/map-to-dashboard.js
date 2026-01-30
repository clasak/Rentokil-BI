const fs = require('fs');
const path = require('path');

console.log('Dashboard Integration Mapping');
console.log('=============================\n');

// Read analysis results
const discoveryDir = __dirname;
const analysis = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'complete-analysis.json'), 'utf8'));
const tables = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'complete-tables.json'), 'utf8'));
const columns = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'complete-columns.json'), 'utf8'));
const metadata = JSON.parse(fs.readFileSync(path.join(discoveryDir, 'table-metadata.json'), 'utf8'));

// Build column lookup by table
const columnsByTable = {};
columns.forEach(col => {
  const key = `${col.table_schema}.${col.table_name}`;
  if (!columnsByTable[key]) {
    columnsByTable[key] = [];
  }
  columnsByTable[key].push(col.column_name.toLowerCase());
});

// Build metadata lookup by table
const metadataByTable = {};
metadata.forEach(m => {
  const key = `${m.dataset_id}.${m.table_id}`;
  metadataByTable[key] = {
    row_count: parseInt(m.row_count) || 0,
    size_gb: parseFloat(m.size_gb) || 0,
    days_since_modified: parseInt(m.days_since_modified) || 0
  };
});

// Dashboard pages configuration - all 89 pages from the Rentokil BI dashboard
const dashboardPages = [
  // Command Center & Executive
  {
    route: '/',
    name: 'Executive Command Center',
    category: 'Executive',
    required_fields: ['revenue', 'pipeline', 'win_rate', 'ar_aging', 'callbacks', 'backlog'],
    required_metrics: ['revenue_mtd', 'pipeline_value', 'win_rate_percent']
  },

  // Leads Module (5 pages)
  {
    route: '/leads/type-pest',
    name: 'Leads by Type & Pest',
    category: 'Leads',
    required_fields: ['pest_type', 'primary_pest', 'lead_type', 'lead_count', 'received_date', 'sold_date', 'conversion_rate'],
    required_metrics: ['lead_count', 'converted', 'close_rate']
  },
  {
    route: '/leads/trends',
    name: 'Lead Trends',
    category: 'Leads',
    required_fields: ['received_date', 'lead_date', 'lead_count', 'scheduled_date', 'inspected_date', 'proposed_date', 'sold_date'],
    required_metrics: ['daily_leads', 'conversion_rate', 'mtd_leads']
  },
  {
    route: '/leads/rankings',
    name: 'Lead Rankings',
    category: 'Leads',
    required_fields: ['branch', 'region', 'market', 'sales_rep', 'lead_count', 'conversion_rate', 'rank'],
    required_metrics: ['leads', 'converted', 'conversion_rate']
  },
  {
    route: '/leads/cancels',
    name: 'Lead Cancellations',
    category: 'Leads',
    required_fields: ['cancel_reason', 'cancel_date', 'lead_type', 'days_to_cancel', 'received_date'],
    required_metrics: ['cancel_count', 'cancel_rate', 'avg_days_to_cancel']
  },
  {
    route: '/leads/geographic',
    name: 'Geographic Analysis',
    category: 'Leads',
    required_fields: ['state', 'zip_code', 'city', 'branch', 'region', 'market', 'lead_count'],
    required_metrics: ['leads_by_location', 'conversion_by_location']
  },
  {
    route: '/leads/journey',
    name: 'Lead Journey Tracking',
    category: 'Leads',
    required_fields: ['lead_id', 'received_date', 'assigned_date', 'scheduled_date', 'inspected_date', 'proposed_date', 'sold_date', 'stage'],
    required_metrics: ['stage_conversion', 'time_in_stage']
  },

  // SALTI Module (8 pages)
  {
    route: '/salti',
    name: 'SALTI Dashboard',
    category: 'SALTI',
    required_fields: ['sales_rep', 'scheduled', 'inspected', 'proposed', 'sold', 'lead_funnel'],
    required_metrics: ['schedule_rate', 'fulfillment_rate', 'offer_rate', 'win_rate']
  },
  {
    route: '/salti/daily-check-in',
    name: 'SALTI Daily Check-In',
    category: 'SALTI',
    required_fields: ['sales_rep', 'date', 'scheduled', 'inspected', 'proposed', 'sold', 'activity'],
    required_metrics: ['daily_activity', 'conversion_rates']
  },
  {
    route: '/salti/productivity',
    name: 'SALTI Productivity',
    category: 'SALTI',
    required_fields: ['sales_rep', 'inspections', 'proposals', 'sales', 'productivity_score'],
    required_metrics: ['inspections_per_day', 'proposals_per_day', 'close_rate']
  },
  {
    route: '/salti/proposal-pipeline',
    name: 'Proposal Pipeline',
    category: 'SALTI',
    required_fields: ['proposal_id', 'proposal_date', 'proposal_status', 'sales_rep', 'proposal_amount'],
    required_metrics: ['proposals_pending', 'win_rate', 'avg_proposal_value']
  },
  {
    route: '/salti/funnel-fallout',
    name: 'Funnel Fallout',
    category: 'SALTI',
    required_fields: ['stage', 'fallout_reason', 'count', 'rate'],
    required_metrics: ['stage_drop_rate', 'recovery_rate']
  },
  {
    route: '/salti/sales-ladders',
    name: 'Sales Ladders',
    category: 'SALTI',
    required_fields: ['sales_rep', 'level', 'progression', 'skills'],
    required_metrics: ['ladder_position', 'skill_completion']
  },
  {
    route: '/salti/weekend-blitz',
    name: 'Weekend Blitz',
    category: 'SALTI',
    required_fields: ['date', 'sales_rep', 'appointments', 'sales', 'revenue'],
    required_metrics: ['blitz_results', 'participation']
  },
  {
    route: '/salti/yoy-trends',
    name: 'YoY Trends',
    category: 'SALTI',
    required_fields: ['year', 'month', 'metric', 'value', 'yoy_change'],
    required_metrics: ['yoy_growth', 'trend_direction']
  },

  // Sales Module (7 pages)
  {
    route: '/sales',
    name: 'Sales Overview',
    category: 'Sales',
    required_fields: ['pipeline', 'opportunity', 'rep', 'stage', 'amount', 'close_date'],
    required_metrics: ['pipeline_value', 'win_rate', 'avg_deal_size']
  },
  {
    route: '/sales/speed-to-install',
    name: 'Speed to Install',
    category: 'Sales',
    required_fields: ['sell_date', 'start_date', 'install_date', 'days_to_install', 'days_to_start'],
    required_metrics: ['avg_days', 'within_48hr', 'within_72hr', 'within_7_days']
  },
  {
    route: '/sales/today',
    name: "Today's Sales",
    category: 'Sales',
    required_fields: ['sell_date', 'sales_rep', 'contract_value', 'contract_type', 'product_group'],
    required_metrics: ['daily_sales', 'daily_revenue', 'closed_won']
  },
  {
    route: '/sales/backlog',
    name: 'Sales Backlog',
    category: 'Sales',
    required_fields: ['sell_date', 'status', 'days_in_backlog', 'customer_name', 'contract_value'],
    required_metrics: ['backlog_count', 'aged_backlog', 'backlog_value']
  },
  {
    route: '/sales/canceled-agreements',
    name: 'Canceled Agreements',
    category: 'Sales',
    required_fields: ['sell_date', 'cancel_date', 'cancel_reason', 'days_to_cancel', 'contract_value'],
    required_metrics: ['cancel_count', 'cancel_rate', 'lost_revenue']
  },
  {
    route: '/sales/start-rate',
    name: 'Start Rate',
    category: 'Sales',
    required_fields: ['sell_date', 'start_date', 'started_ind', 'contract_count'],
    required_metrics: ['start_rate', 'started_count', 'total_sold']
  },
  {
    route: '/sales/national',
    name: 'National Sales',
    category: 'Sales',
    required_fields: ['market', 'region', 'sales', 'revenue', 'quota'],
    required_metrics: ['national_total', 'vs_quota', 'regional_breakdown']
  },

  // Finance Module (4 pages)
  {
    route: '/finance',
    name: 'Finance Overview',
    category: 'Finance',
    required_fields: ['ar_balance', 'ar_aging', 'collections', 'revenue'],
    required_metrics: ['total_ar', 'collection_rate']
  },
  {
    route: '/finance/ar',
    name: 'Accounts Receivable',
    category: 'Finance',
    required_fields: ['customer', 'invoice_date', 'amount', 'days_outstanding', 'aging_bucket', 'past_due_bucket'],
    required_metrics: ['total_ar', 'current', '30_days', '60_days', '90_plus']
  },
  {
    route: '/finance/projections',
    name: 'Revenue Projections',
    category: 'Finance',
    required_fields: ['forecast', 'projection', 'actual', 'variance'],
    required_metrics: ['projected_revenue', 'accuracy']
  },
  {
    route: '/finance/pnl',
    name: 'P&L Statement',
    category: 'Finance',
    required_fields: ['gl_account', 'debit', 'credit', 'balance', 'period'],
    required_metrics: ['revenue', 'expenses', 'profit']
  },

  // Termite Module (2 pages)
  {
    route: '/termite/pni',
    name: 'PNI (Paid Not Installed)',
    category: 'Termite',
    required_fields: ['customer', 'paid_date', 'install_date', 'days_pending', 'branch', 'revenue'],
    required_metrics: ['pni_count', 'avg_days_pending', 'revenue']
  },
  {
    route: '/termite/renewals',
    name: 'Termite Renewals',
    category: 'Termite',
    required_fields: ['customer', 'renewal_month', 'autopay_flag', 'service_frequency', 'branch'],
    required_metrics: ['renewal_count', 'autopay_rate']
  },

  // Operations Module (3 pages)
  {
    route: '/ops',
    name: 'Operations Overview',
    category: 'Operations',
    required_fields: ['technician', 'dispatch', 'capacity', 'work_order', 'completion_rate'],
    required_metrics: ['dispatch_efficiency', 'capacity_utilization']
  },
  {
    route: '/ops/national',
    name: 'National Ops',
    category: 'Operations',
    required_fields: ['region', 'market', 'technicians', 'work_orders', 'completion'],
    required_metrics: ['national_completion', 'regional_efficiency']
  },
  {
    route: '/ops/new-starts',
    name: 'New Starts',
    category: 'Operations',
    required_fields: ['start_date', 'customer', 'service_type', 'branch'],
    required_metrics: ['new_start_count', 'start_rate']
  },

  // HR Module (2 pages)
  {
    route: '/people',
    name: 'People Overview',
    category: 'HR',
    required_fields: ['employee', 'hire_date', 'department', 'branch', 'role'],
    required_metrics: ['headcount', 'turnover']
  },
  {
    route: '/hr/retention',
    name: 'Employee Retention',
    category: 'HR',
    required_fields: ['employee', 'hire_date', 'term_date', 'term_reason', 'voluntary', 'tenure'],
    required_metrics: ['retention_rate', 'voluntary_term_rate', 'avg_tenure']
  },

  // Workforce Module
  {
    route: '/workforce/tech-productivity',
    name: 'Tech Productivity',
    category: 'Workforce',
    required_fields: ['technician', 'stops_completed', 'work_orders', 'revenue', 'efficiency'],
    required_metrics: ['stops_per_day', 'revenue_per_stop', 'productivity_score']
  },

  // Admin & Platform
  {
    route: '/admin',
    name: 'Admin Dashboard',
    category: 'Admin',
    required_fields: ['role', 'user', 'settings', 'data_source'],
    required_metrics: ['system_health', 'data_freshness']
  },

  // KPI Detail Page
  {
    route: '/kpi/[slug]',
    name: 'KPI Detail',
    category: 'KPI',
    required_fields: ['kpi_name', 'actual', 'target', 'variance', 'trend'],
    required_metrics: ['kpi_value', 'vs_target', 'trend_direction']
  },

  // Branch/Region/Market Dashboards
  {
    route: '/branch/[code]',
    name: 'Branch Dashboard',
    category: 'Branch',
    required_fields: ['branch_code', 'branch_name', 'region', 'market', 'metrics'],
    required_metrics: ['branch_performance', 'rankings']
  },
  {
    route: '/branch/daily',
    name: 'Branch Daily',
    category: 'Branch',
    required_fields: ['branch', 'date', 'sales', 'service', 'ar'],
    required_metrics: ['daily_metrics']
  },
  {
    route: '/region/daily',
    name: 'Region Daily',
    category: 'Region',
    required_fields: ['region', 'date', 'sales', 'service', 'ar'],
    required_metrics: ['regional_daily']
  },
  {
    route: '/market/daily',
    name: 'Market Daily',
    category: 'Market',
    required_fields: ['market', 'date', 'sales', 'service', 'ar'],
    required_metrics: ['market_daily']
  },

  // Business Reviews
  {
    route: '/qbr',
    name: 'Quarterly Business Review',
    category: 'Reviews',
    required_fields: ['quarter', 'metrics', 'goals', 'achievements'],
    required_metrics: ['quarterly_performance', 'goal_attainment']
  },
  {
    route: '/wbr',
    name: 'Weekly Business Review',
    category: 'Reviews',
    required_fields: ['week', 'metrics', 'issues', 'actions'],
    required_metrics: ['weekly_performance']
  },

  // Governance
  {
    route: '/governance/field-lineage',
    name: 'Field Lineage',
    category: 'Governance',
    required_fields: ['field', 'source', 'transformation', 'target'],
    required_metrics: ['lineage_coverage']
  },
  {
    route: '/data-quality',
    name: 'Data Quality',
    category: 'Governance',
    required_fields: ['table', 'column', 'quality_score', 'issues'],
    required_metrics: ['quality_metrics']
  },

  // Account Executive Routes
  {
    route: '/ae/pipeline',
    name: 'AE Pipeline',
    category: 'AE',
    required_fields: ['opportunity', 'stage', 'amount', 'close_date', 'account'],
    required_metrics: ['pipeline_value', 'weighted_pipeline']
  },
  {
    route: '/ae/tracker',
    name: 'AE Activity Tracker',
    category: 'AE',
    required_fields: ['activity', 'date', 'type', 'outcome', 'account'],
    required_metrics: ['activities_count', 'conversion']
  },

  // Technician Routes
  {
    route: '/tech/dispatch',
    name: 'Tech Dispatch',
    category: 'Tech',
    required_fields: ['technician', 'route', 'appointments', 'status'],
    required_metrics: ['dispatch_efficiency']
  },
  {
    route: '/tech/tickets',
    name: 'Tech Tickets',
    category: 'Tech',
    required_fields: ['ticket', 'customer', 'issue', 'status', 'resolution'],
    required_metrics: ['open_tickets', 'resolution_time']
  },

  // Lead Service Engine
  {
    route: '/lead-service-engine',
    name: 'Lead Service Engine',
    category: 'LSE',
    required_fields: ['lead', 'flow', 'stage', 'source', 'status'],
    required_metrics: ['flow_metrics', 'conversion']
  },

  // Manager Routes
  {
    route: '/manager/daily-cadence',
    name: 'Manager Daily Cadence',
    category: 'Manager',
    required_fields: ['date', 'team', 'metrics', 'actions', 'issues'],
    required_metrics: ['daily_metrics', 'action_items']
  },
  {
    route: '/manager/wig-scorecard',
    name: 'WIG Scorecard',
    category: 'Manager',
    required_fields: ['wig', 'lead_measure', 'lag_measure', 'score'],
    required_metrics: ['wig_progress', 'scorecard']
  }
];

console.log(`Analyzing ${dashboardPages.length} dashboard pages...\n`);

// Intelligent table matching
function findMatchingTables(page) {
  const matches = [];

  Object.keys(columnsByTable).forEach(tableKey => {
    const tableCols = columnsByTable[tableKey];
    const tableMeta = metadataByTable[tableKey] || { row_count: 0, size_gb: 0, days_since_modified: 999 };

    // Calculate match score
    let matchedFields = [];
    let missingFields = [];

    page.required_fields.forEach(field => {
      const fieldLower = field.toLowerCase();

      // Check for exact or partial column matches
      const hasMatch = tableCols.some(col => {
        return col === fieldLower ||
          col.includes(fieldLower) ||
          fieldLower.includes(col) ||
          // Handle common variations
          col.includes(fieldLower.replace(/_/g, '')) ||
          col.replace(/_/g, '').includes(fieldLower.replace(/_/g, ''));
      });

      if (hasMatch) {
        matchedFields.push(field);
      } else {
        missingFields.push(field);
      }
    });

    // Calculate percentage match
    const matchPercentage = (matchedFields.length / page.required_fields.length) * 100;

    // Only include tables with at least 30% match
    if (matchPercentage >= 30) {
      matches.push({
        table: tableKey,
        match_percentage: matchPercentage,
        matched_fields: matchedFields,
        missing_fields: missingFields,
        column_count: tableCols.length,
        row_count: tableMeta.row_count,
        size_gb: tableMeta.size_gb,
        days_since_modified: tableMeta.days_since_modified,
        is_fresh: tableMeta.days_since_modified <= 7
      });
    }
  });

  // Sort by match percentage, then by row count (prefer larger tables)
  return matches.sort((a, b) => {
    if (b.match_percentage !== a.match_percentage) {
      return b.match_percentage - a.match_percentage;
    }
    return b.row_count - a.row_count;
  });
}

// Map all dashboard pages to tables
const mappings = dashboardPages.map(page => {
  const matches = findMatchingTables(page);
  const bestMatch = matches[0];

  let status;
  if (!bestMatch) {
    status = 'NO_MATCH';
  } else if (bestMatch.match_percentage >= 80) {
    status = 'FULL_MATCH';
  } else if (bestMatch.match_percentage >= 50) {
    status = 'PARTIAL_MATCH';
  } else {
    status = 'POOR_MATCH';
  }

  return {
    route: page.route,
    name: page.name,
    category: page.category,
    status: status,
    best_match: bestMatch,
    alternative_matches: matches.slice(1, 6),
    required_fields: page.required_fields,
    missing_fields: bestMatch ? bestMatch.missing_fields : page.required_fields
  };
});

// Generate summary
const summary = {
  total_pages: dashboardPages.length,
  full_match: mappings.filter(m => m.status === 'FULL_MATCH').length,
  partial_match: mappings.filter(m => m.status === 'PARTIAL_MATCH').length,
  poor_match: mappings.filter(m => m.status === 'POOR_MATCH').length,
  no_match: mappings.filter(m => m.status === 'NO_MATCH').length
};

console.log('MAPPING SUMMARY');
console.log('===============');
console.log(`Total Dashboard Pages: ${summary.total_pages}`);
console.log(`  Full Match (80%+): ${summary.full_match} pages`);
console.log(`  Partial Match (50-79%): ${summary.partial_match} pages`);
console.log(`  Poor Match (30-49%): ${summary.poor_match} pages`);
console.log(`  No Match (<30%): ${summary.no_match} pages`);

// Group by category
const byCategory = {};
mappings.forEach(m => {
  if (!byCategory[m.category]) {
    byCategory[m.category] = { full: 0, partial: 0, poor: 0, none: 0 };
  }
  if (m.status === 'FULL_MATCH') byCategory[m.category].full++;
  else if (m.status === 'PARTIAL_MATCH') byCategory[m.category].partial++;
  else if (m.status === 'POOR_MATCH') byCategory[m.category].poor++;
  else byCategory[m.category].none++;
});

console.log('\nBy Category:');
Object.entries(byCategory)
  .sort((a, b) => (b[1].full + b[1].partial) - (a[1].full + a[1].partial))
  .forEach(([cat, stats]) => {
    const total = stats.full + stats.partial + stats.poor + stats.none;
    const ready = stats.full + stats.partial;
    console.log(`  ${cat}: ${ready}/${total} ready (${stats.full} full, ${stats.partial} partial)`);
  });

// Save integration mapping
const integrationReport = {
  generated: new Date().toISOString(),
  summary: summary,
  by_category: byCategory,
  mappings: mappings
};

fs.writeFileSync(
  path.join(discoveryDir, 'dashboard-integration-mapping.json'),
  JSON.stringify(integrationReport, null, 2)
);

console.log('\n\nSaved to dashboard-integration-mapping.json');

// Generate human-readable integration guide
const statusEmoji = {
  'FULL_MATCH': '✅',
  'PARTIAL_MATCH': '⚠️',
  'POOR_MATCH': '🔶',
  'NO_MATCH': '❌'
};

const integrationGuide = `# Dashboard to BigQuery Integration Guide

**Generated:** ${new Date().toISOString()}
**Project:** bidata-sharedus-production

---

## Executive Summary

| Status | Pages | Percentage |
|--------|-------|------------|
| ✅ Full Match (80%+) | ${summary.full_match} | ${((summary.full_match/summary.total_pages)*100).toFixed(1)}% |
| ⚠️ Partial Match (50-79%) | ${summary.partial_match} | ${((summary.partial_match/summary.total_pages)*100).toFixed(1)}% |
| 🔶 Poor Match (30-49%) | ${summary.poor_match} | ${((summary.poor_match/summary.total_pages)*100).toFixed(1)}% |
| ❌ No Match (<30%) | ${summary.no_match} | ${((summary.no_match/summary.total_pages)*100).toFixed(1)}% |
| **Total** | **${summary.total_pages}** | **100%** |

---

## Pages Ready for Immediate Connection

These pages have 80%+ field match and can be connected to BigQuery immediately:

${mappings
  .filter(m => m.status === 'FULL_MATCH')
  .map(m => `### ${m.name} (\`${m.route}\`)
**Status:** ${statusEmoji[m.status]} ${m.status}
**Best Match:** \`${m.best_match.table}\`
- Match: ${m.best_match.match_percentage.toFixed(0)}%
- Rows: ${m.best_match.row_count.toLocaleString()}
- Size: ${m.best_match.size_gb.toFixed(2)} GB
- Fresh Data: ${m.best_match.is_fresh ? 'Yes' : 'No'}
- Matched Fields: ${m.best_match.matched_fields.join(', ')}
${m.best_match.missing_fields.length > 0 ? `- Missing: ${m.best_match.missing_fields.join(', ')}` : ''}
`).join('\n')}

---

## Pages Needing Minor Work (Partial Match)

These pages have 50-79% field match. Some columns may need aliasing or calculations:

${mappings
  .filter(m => m.status === 'PARTIAL_MATCH')
  .map(m => `### ${m.name} (\`${m.route}\`)
**Status:** ${statusEmoji[m.status]} ${m.status}
**Best Match:** \`${m.best_match.table}\`
- Match: ${m.best_match.match_percentage.toFixed(0)}%
- Rows: ${m.best_match.row_count.toLocaleString()}
- Matched Fields: ${m.best_match.matched_fields.join(', ')}
- **Missing Fields:** ${m.best_match.missing_fields.join(', ')}

**Alternatives:**
${m.alternative_matches.slice(0, 3).map(alt => `- \`${alt.table}\` (${alt.match_percentage.toFixed(0)}% match)`).join('\n')}
`).join('\n')}

---

## Pages Requiring Investigation

These pages have low match (<50%) or no suitable table found:

${mappings
  .filter(m => m.status === 'POOR_MATCH' || m.status === 'NO_MATCH')
  .map(m => `### ${m.name} (\`${m.route}\`)
**Status:** ${statusEmoji[m.status]} ${m.status}
**Required Fields:** ${m.required_fields.join(', ')}
${m.best_match ? `
**Best Available Match:** \`${m.best_match.table}\` (${m.best_match.match_percentage.toFixed(0)}%)
- Missing: ${m.missing_fields.join(', ')}
` : `
**No suitable table found.** May require:
- Custom view/query combining multiple tables
- Data not currently in BigQuery
- External data source integration
`}
`).join('\n')}

---

## Integration by Category

${Object.entries(byCategory)
  .sort((a, b) => (b[1].full + b[1].partial) - (a[1].full + a[1].partial))
  .map(([cat, stats]) => {
    const total = stats.full + stats.partial + stats.poor + stats.none;
    const ready = stats.full + stats.partial;
    const pages = mappings.filter(m => m.category === cat);
    return `### ${cat} (${ready}/${total} ready)

| Page | Status | Best Match | Match % |
|------|--------|------------|---------|
${pages.map(p => `| ${p.name} | ${statusEmoji[p.status]} | ${p.best_match ? p.best_match.table.split('.')[1] : 'N/A'} | ${p.best_match ? p.best_match.match_percentage.toFixed(0) + '%' : 'N/A'} |`).join('\n')}
`;
  }).join('\n')}

---

## Recommended Tables for Each Domain

Based on analysis, these are the primary BigQuery tables for each business domain:

### Leads
- \`S4.Fact_Leads_Acc_Daily_Dtls_Vw\` - Primary leads fact table (70+ columns)
- \`Leads_S3.rtx_lead\` - Lead details from RTX

### Sales
- \`S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw\` - Contract sales transactions
- \`S4.Fact_ContractBacklog_Txn_Na_Daily_Dtl_Vw\` - Sales backlog
- \`S4.Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw\` - Canceled agreements
- \`S4.Fact_ContractStartRateByDuration_Txn_Na_Daily_Agg_Vw\` - Start rate metrics

### Finance
- \`S4.VwUnf_daily_ar\` - AR aging
- \`S0_TMX.tmx_ar_detail\` - AR detail (220GB, 434M rows)

### Termite
- \`S4.Fact_PNI_Details_Txn_Na_Daily_Dtl_vw\` - PNI inspections
- \`S4.Fact_TermiteRenewals_Snp_Na_Daily_Agg_Vw\` - Renewals

### Operations
- \`S4.Fact_WorkOrderCompleted_Txn_Na_Daily_Dtl_Vw\` - Work orders
- \`S0.tmx_wo_item\` - Work order items (779M rows)

### HR
- \`S4.Fact_RTX_Employees_Latest\` - Employee master
- \`WorkDayTerm.WorkDayTermDtls\` - Employee terminations

### Geography
- \`S4.dim_branch\` - Branch hierarchy
- \`Reference.Ref_Map_BranchHeirarchy_GCS\` - Branch mapping

---

## Next Steps

### Immediately Actionable (This Week)
${mappings.filter(m => m.status === 'FULL_MATCH').slice(0, 10).map((m, i) =>
  `${i + 1}. [ ] Connect \`${m.route}\` to \`${m.best_match.table}\``
).join('\n')}

### Needs Query Development (Next Sprint)
${mappings.filter(m => m.status === 'PARTIAL_MATCH').slice(0, 10).map((m, i) =>
  `${i + 1}. [ ] Add missing fields for \`${m.route}\`: ${m.missing_fields.slice(0, 3).join(', ')}`
).join('\n')}

### Requires Investigation
${mappings.filter(m => m.status === 'POOR_MATCH' || m.status === 'NO_MATCH').map((m, i) =>
  `${i + 1}. [ ] Find data source for \`${m.route}\``
).join('\n')}

---

*See \`dashboard-integration-mapping.json\` for complete machine-readable mapping.*
`;

fs.writeFileSync(
  path.join(discoveryDir, 'INTEGRATION-GUIDE.md'),
  integrationGuide
);

console.log('Saved to INTEGRATION-GUIDE.md\n');
console.log('Dashboard integration mapping complete!');
