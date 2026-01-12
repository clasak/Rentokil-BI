import { KPIDefinition } from '@/types'

export const KPI_DICTIONARY: KPIDefinition[] = [
  {
    slug: 'revenue_mtd',
    name: 'Revenue MTD',
    category: 'revenue',
    definition: 'Total recognized revenue from all invoices in the current month to date.',
    calculationNotes: 'SUM(invoice.amount) WHERE invoice.status IN (paid, open) AND invoice.invoice_date >= month_start AND invoice.invoice_date <= today. Excludes void and credited invoices.',
    grain: 'Daily rollup',
    filters: ['date_range', 'market', 'branch', 'vertical'],
    primarySource: 'Billing/ERP',
    secondarySources: ['CRM (for account mapping)'],
    refreshCadence: 'Every 4 hours',
    owner: 'Finance - Controller',
    reconciliationTarget: 'Invoice table sum should match within 0.1%',
    dataQualityChecks: ['No duplicate invoice numbers', 'All invoices have valid account mapping', 'Invoice dates within expected range'],
    drillPath: '/kpi/revenue_mtd → by market → by branch → by account → invoice detail',
    format: 'currency',
    unit: '$',
    higherIsBetter: true,
    // M8: Extended formula and lineage fields
    formula: 'Σ(Invoice Amount) for current month where Status ∈ {Paid, Open}',
    sqlFormula: `SELECT SUM(amount) FROM invoices WHERE status IN ('paid', 'open') AND invoice_date >= DATE_TRUNC('month', CURRENT_DATE)`,
    lineage: {
      sourceSystem: 'RTX Data Hub',
      sourceTable: 'rtx.fact_invoices',
      sourceFields: ['invoice_amount', 'invoice_date', 'status', 'account_id'],
      transformations: ['Currency standardization (USD)', 'Void/credit exclusion', 'MTD date filtering'],
      updateFrequency: 'Every 4 hours',
      dataLag: 'T-0 (same-day)'
    },
    dependencies: [],
    usedBy: ['forecast_revenue_8w', 'variance_to_target', 'margin_proxy'],
    businessContext: 'Primary measure of commercial performance in pest control. Monthly billing cycles for service contracts mean MTD revenue reflects both recurring and one-time services. Used for territory performance assessment and commission calculations.',
    benchmarks: [
      { name: 'Industry Average', value: 15000000, source: 'NPMA Annual Report 2024', asOfDate: '2024-01' },
      { name: 'Top Quartile', value: 22000000, source: 'Internal Benchmark Study', asOfDate: '2024-06' }
    ]
  },
  {
    slug: 'pipeline_30_60_90',
    name: 'Pipeline 30/60/90',
    category: 'sales',
    definition: 'Total opportunity value segmented by expected close date: 0-30 days, 31-60 days, 61-90 days.',
    calculationNotes: 'SUM(opportunity.amount * opportunity.probability) WHERE opportunity.stage NOT IN (closed_won, closed_lost) GROUP BY close_date bucket.',
    grain: 'Daily snapshot',
    filters: ['close_date_range', 'market', 'branch', 'owner', 'stage'],
    primarySource: 'CRM (Salesforce)',
    secondarySources: [],
    refreshCadence: 'Every 2 hours',
    owner: 'Sales Ops - Director',
    reconciliationTarget: 'Sum of weighted pipeline should match opportunity list total',
    dataQualityChecks: ['Close dates not in past for open opps', 'Probability matches stage', 'Owner assigned for all opps'],
    drillPath: '/kpi/pipeline_30_60_90 → by time bucket → by stage → opportunity list → opportunity detail',
    format: 'currency',
    unit: '$',
    higherIsBetter: true,
    // M8: Extended formula and lineage fields
    formula: 'Σ(Opportunity Amount × Stage Probability) grouped by close date buckets (0-30, 31-60, 61-90 days)',
    sqlFormula: `SELECT
  CASE
    WHEN close_date <= CURRENT_DATE + 30 THEN '0-30 days'
    WHEN close_date <= CURRENT_DATE + 60 THEN '31-60 days'
    ELSE '61-90 days'
  END as bucket,
  SUM(amount * probability) as weighted_value
FROM opportunities
WHERE stage NOT IN ('closed_won', 'closed_lost')
  AND close_date <= CURRENT_DATE + 90
GROUP BY bucket`,
    lineage: {
      sourceSystem: 'Salesforce CRM',
      sourceTable: 'sfdc.opportunity',
      sourceFields: ['amount', 'probability', 'close_date', 'stage', 'owner_id'],
      transformations: ['Stage-to-probability mapping', 'Close date bucket assignment', 'Weighted value calculation'],
      updateFrequency: 'Every 2 hours',
      dataLag: 'T-0 (real-time sync)'
    },
    dependencies: ['win_rate'],
    usedBy: ['forecast_revenue_8w', 'variance_to_target_mtd'],
    businessContext: 'Critical sales planning metric for pest control services. The 30/60/90 day view aligns with typical commercial sales cycles for recurring service contracts. Stage probabilities calibrated quarterly using historical win rate analysis.',
    benchmarks: [
      { name: 'Pipeline Coverage Ratio', value: 3.0, source: 'Sales Best Practices', asOfDate: '2024-01' },
      { name: 'Healthy Pipeline Mix', value: 0.4, source: 'Internal Analysis (% in 0-30 bucket)', asOfDate: '2024-06' }
    ]
  },
  {
    slug: 'win_rate',
    name: 'Win Rate',
    category: 'sales',
    definition: 'Percentage of opportunities that closed as won out of all opportunities that closed (won + lost) in the period.',
    calculationNotes: 'COUNT(closed_won) / COUNT(closed_won + closed_lost) for opportunities with close_date in period.',
    grain: 'Monthly rollup',
    filters: ['date_range', 'market', 'branch', 'owner', 'vertical'],
    primarySource: 'CRM (Salesforce)',
    secondarySources: [],
    refreshCadence: 'Daily',
    owner: 'Sales Ops - Director',
    reconciliationTarget: 'Win rate calculated from closed opp counts should match',
    dataQualityChecks: ['Lost reason populated for lost opps', 'No opps closed without stage history', 'Stage transitions logged'],
    drillPath: '/kpi/win_rate → by market → by owner → won/lost breakdown → opportunity detail',
    format: 'percent',
    unit: '%',
    higherIsBetter: true,
    target: 0.35,
    warningThreshold: 0.28,
    criticalThreshold: 0.20,
    // M8: Extended formula and lineage fields
    formula: 'COUNT(Closed Won) / COUNT(Closed Won + Closed Lost) × 100',
    sqlFormula: `SELECT
  COUNT(CASE WHEN stage = 'closed_won' THEN 1 END)::float /
  NULLIF(COUNT(*), 0) as win_rate
FROM opportunities
WHERE stage IN ('closed_won', 'closed_lost')
  AND close_date >= DATE_TRUNC('month', CURRENT_DATE)`,
    lineage: {
      sourceSystem: 'Salesforce CRM',
      sourceTable: 'sfdc.opportunity',
      sourceFields: ['stage', 'close_date', 'owner_id', 'lost_reason'],
      transformations: ['Stage filtering (closed only)', 'Period aggregation', 'Ratio calculation'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['pipeline_30_60_90', 'forecast_revenue_8w'],
    businessContext: 'Key efficiency metric for sales organization. Pest control industry average is ~30-35%. Lower win rates may indicate lead quality issues, competitive pressure, or pricing concerns. Used for sales coaching and territory assignment decisions.',
    benchmarks: [
      { name: 'Industry Average', value: 0.32, source: 'NPMA Sales Benchmark Survey', asOfDate: '2024-01' },
      { name: 'Top Performer', value: 0.45, source: 'Internal Top Quartile Analysis', asOfDate: '2024-06' }
    ]
  },
  {
    slug: 'avg_cycle_time_days',
    name: 'Avg Sales Cycle (Days)',
    category: 'sales',
    definition: 'Average number of days from opportunity creation to close for won opportunities.',
    calculationNotes: 'AVG(close_date - created_date) WHERE stage = closed_won AND close_date in period.',
    grain: 'Monthly rollup',
    filters: ['date_range', 'market', 'branch', 'owner', 'deal_size_tier'],
    primarySource: 'CRM (Salesforce)',
    secondarySources: [],
    refreshCadence: 'Daily',
    owner: 'Sales Ops - Director',
    reconciliationTarget: 'Manual calculation from opp list should match',
    dataQualityChecks: ['Created date <= close date', 'No negative cycle times', 'Stage history complete'],
    drillPath: '/kpi/avg_cycle_time_days → by market → by deal size → opportunity list',
    format: 'days',
    unit: 'days',
    higherIsBetter: false,
    target: 45,
    warningThreshold: 60,
    criticalThreshold: 90,
    // M8: Extended formula and lineage fields
    formula: 'AVG(Close Date - Created Date) for Closed Won opportunities',
    sqlFormula: `SELECT AVG(close_date - created_date) as avg_cycle_days
FROM opportunities
WHERE stage = 'closed_won'
  AND close_date >= DATE_TRUNC('month', CURRENT_DATE)`,
    lineage: {
      sourceSystem: 'Salesforce CRM',
      sourceTable: 'sfdc.opportunity',
      sourceFields: ['created_date', 'close_date', 'stage', 'amount'],
      transformations: ['Date difference calculation', 'Won-only filtering', 'Average aggregation'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['forecast_revenue_8w'],
    businessContext: 'Measures sales velocity for pest control contracts. Residential deals typically close in 15-30 days, commercial in 45-90 days. Longer cycles may indicate complex decision processes or stalled deals requiring intervention.',
    benchmarks: [
      { name: 'Residential Target', value: 21, source: 'Internal Standard', asOfDate: '2024-01' },
      { name: 'Commercial Target', value: 60, source: 'Internal Standard', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'forecast_revenue_8w',
    name: 'Forecast Revenue (8 Weeks)',
    category: 'revenue',
    definition: 'Projected revenue for the next 8 weeks based on weighted pipeline, historical conversion rates, and seasonality adjustments.',
    calculationNotes: 'SUM(pipeline.weighted_amount) + baseline_recurring_revenue + seasonality_adjustment. Uses last 12-week conversion rates by stage.',
    grain: 'Weekly projection',
    filters: ['market', 'branch', 'scenario'],
    primarySource: 'CRM (Salesforce)',
    secondarySources: ['Billing/ERP (historical patterns)', 'Workforce/HR (capacity constraints)'],
    refreshCadence: 'Weekly (Monday 6am)',
    owner: 'Finance - FP&A',
    reconciliationTarget: 'Backtest MAE should be < 8%',
    dataQualityChecks: ['All open opps have valid close dates', 'Probability aligned with stage', 'Historical data complete'],
    drillPath: '/forecast → scenario toggle → assumptions → backtest → pipeline detail',
    format: 'currency',
    unit: '$',
    higherIsBetter: true,
    // M8: Extended formula and lineage fields
    formula: 'Σ(Pipeline × Historical Conversion Rate) + Recurring Revenue Base + Seasonality Factor',
    sqlFormula: `WITH pipeline_forecast AS (
  SELECT SUM(amount * probability * hist_conv_rate) as pipeline_contrib
  FROM opportunities o
  JOIN stage_conversion_rates scr ON o.stage = scr.stage
  WHERE o.close_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 56
),
recurring_base AS (
  SELECT AVG(weekly_revenue) * 8 as recurring_contrib
  FROM weekly_revenue_history
  WHERE week >= CURRENT_DATE - 90
)
SELECT (p.pipeline_contrib + r.recurring_contrib) * seasonality_factor as forecast_8w
FROM pipeline_forecast p, recurring_base r`,
    lineage: {
      sourceSystem: 'RTX Data Hub (composite)',
      sourceTable: 'analytics.forecast_model',
      sourceFields: ['pipeline_weighted', 'hist_conversion_rates', 'recurring_base', 'seasonality_index'],
      transformations: ['Pipeline weighting by stage', 'Historical conversion rate application', 'Seasonality adjustment', '8-week rollup'],
      updateFrequency: 'Weekly (Monday 6am)',
      dataLag: 'T-0 (generated fresh)'
    },
    dependencies: ['pipeline_30_60_90', 'win_rate', 'revenue_mtd', 'avg_cycle_time_days'],
    usedBy: ['variance_to_target_mtd'],
    businessContext: 'Primary planning metric for operations capacity and financial projections. Pest control revenue is seasonal (spring peak). Model incorporates 3 scenarios: base, upside (+15% conversion), downside (-20% conversion). Backtest accuracy tracked monthly.',
    benchmarks: [
      { name: 'Target Accuracy (MAE)', value: 0.08, source: 'FP&A Standard', asOfDate: '2024-01' },
      { name: 'Historical Accuracy', value: 0.062, source: 'Last 12 Months Backtest', asOfDate: '2024-06' }
    ]
  },
  {
    slug: 'variance_to_target_mtd',
    name: 'Variance to Target MTD',
    category: 'revenue',
    definition: 'Difference between actual revenue MTD and the prorated monthly target.',
    calculationNotes: '(Revenue_MTD - (Monthly_Target * days_elapsed / days_in_month)) / (Monthly_Target * days_elapsed / days_in_month).',
    grain: 'Daily',
    filters: ['market', 'branch'],
    primarySource: 'Billing/ERP',
    secondarySources: ['Planning (targets)'],
    refreshCadence: 'Every 4 hours',
    owner: 'Finance - Controller',
    reconciliationTarget: 'Target from planning system should match',
    dataQualityChecks: ['Targets loaded for all markets', 'No missing daily revenue data'],
    drillPath: '/kpi/variance_to_target_mtd → variance drivers → by market → by revenue type',
    format: 'percent',
    unit: '%',
    higherIsBetter: true,
    target: 0,
    warningThreshold: -0.05,
    criticalThreshold: -0.10,
    // M8: Extended formula and lineage fields
    formula: '(Revenue MTD - Prorated Target) / Prorated Target × 100',
    sqlFormula: `SELECT
  (rev.revenue_mtd - (t.monthly_target * EXTRACT(DAY FROM CURRENT_DATE) / EXTRACT(DAY FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))) /
  NULLIF(t.monthly_target * EXTRACT(DAY FROM CURRENT_DATE) / EXTRACT(DAY FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'), 0) as variance_pct
FROM revenue_mtd rev
JOIN monthly_targets t ON rev.market_id = t.market_id`,
    lineage: {
      sourceSystem: 'RTX Data Hub (composite)',
      sourceTable: 'analytics.revenue_variance',
      sourceFields: ['revenue_mtd', 'monthly_target', 'days_elapsed', 'days_in_month'],
      transformations: ['Target proration', 'Variance calculation', 'Percentage conversion'],
      updateFrequency: 'Every 4 hours',
      dataLag: 'T-0 (same-day)'
    },
    dependencies: ['revenue_mtd'],
    usedBy: [],
    businessContext: 'Executive pacing metric for revenue attainment. Prorated target accounts for billing timing patterns. Negative variance triggers escalation at -5% (warning) and -10% (critical). Used in WBR reviews and territory coaching.',
    benchmarks: [
      { name: 'On Track', value: 0, source: 'Internal Standard', asOfDate: '2024-01' },
      { name: 'Acceptable Range', value: -0.03, source: 'Finance Policy', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'service_risk_index',
    name: 'Service Risk Index',
    category: 'operations',
    definition: 'Composite score (0-100) measuring service delivery risk based on callbacks, missed services, complaints, and response time.',
    calculationNotes: '100 - (callback_rate * 25 + missed_rate * 30 + complaint_rate * 25 + response_time_penalty * 20). Higher is better.',
    grain: 'Daily rollup',
    filters: ['market', 'branch', 'route', 'technician'],
    primarySource: 'PestPac/Field Service',
    secondarySources: ['CRM (complaints)', 'Workforce/HR (capacity)'],
    refreshCadence: 'Every 2 hours',
    owner: 'Operations - VP',
    reconciliationTarget: 'Component metrics should sum to index',
    dataQualityChecks: ['All service events have status', 'Technician assigned', 'Time-on-site reasonable'],
    drillPath: '/kpi/service_risk_index → component breakdown → by branch → at-risk accounts',
    format: 'index',
    unit: 'pts',
    higherIsBetter: true,
    target: 85,
    warningThreshold: 75,
    criticalThreshold: 65,
    // M8: Extended formula and lineage fields
    formula: '100 - (Callback Rate × 25 + Missed Rate × 30 + Complaint Rate × 25 + Response Penalty × 20)',
    sqlFormula: `SELECT 100 - (
  (callback_rate * 25) +
  (missed_service_rate * 30) +
  (complaint_rate * 25) +
  (CASE WHEN avg_response_hours > 48 THEN 1 WHEN avg_response_hours > 24 THEN 0.5 ELSE 0 END * 20)
) as service_risk_index
FROM daily_ops_metrics
WHERE date = CURRENT_DATE`,
    lineage: {
      sourceSystem: 'PestPac Field Service',
      sourceTable: 'pestpac.daily_service_metrics',
      sourceFields: ['callback_rate', 'missed_service_rate', 'complaint_rate', 'avg_response_hours'],
      transformations: ['Component normalization (0-1 scale)', 'Weighted aggregation', 'Inverse scoring (higher = better)'],
      updateFrequency: 'Every 2 hours',
      dataLag: 'T-0 (real-time)'
    },
    dependencies: ['callback_rate', 'missed_service_rate', 'avg_response_time_hours', 'complaint_rate'],
    usedBy: ['retention_risk'],
    businessContext: 'Holistic operations health score for pest control service delivery. Weighted to prioritize missed services (customer impact) over callbacks (rework cost). Used for branch manager performance reviews and resource allocation decisions.',
    benchmarks: [
      { name: 'Excellent', value: 90, source: 'Internal Standard', asOfDate: '2024-01' },
      { name: 'Industry Average', value: 75, source: 'NPMA Operations Survey', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'callback_rate',
    name: 'Callback Rate',
    category: 'operations',
    definition: 'Percentage of completed service visits that required a callback within 14 days.',
    calculationNotes: 'COUNT(callbacks) / COUNT(completed_services) WHERE callback.date <= original.completed_date + 14 days.',
    grain: 'Weekly rollup',
    filters: ['date_range', 'market', 'branch', 'route', 'technician', 'service_type'],
    primarySource: 'PestPac/Field Service',
    secondarySources: [],
    refreshCadence: 'Daily',
    owner: 'Operations - Director',
    reconciliationTarget: 'Callback count / service count should match',
    dataQualityChecks: ['Callbacks linked to original service', 'Service dates valid', 'Technician assigned'],
    drillPath: '/kpi/callback_rate → by branch → by technician → service event detail',
    format: 'percent',
    unit: '%',
    higherIsBetter: false,
    target: 0.05,
    warningThreshold: 0.08,
    criticalThreshold: 0.12,
    // M8: Extended formula and lineage fields
    formula: 'COUNT(Callbacks within 14 days) / COUNT(Completed Services) × 100',
    sqlFormula: `SELECT
  COUNT(DISTINCT c.callback_id)::float / NULLIF(COUNT(DISTINCT s.service_id), 0) as callback_rate
FROM service_events s
LEFT JOIN service_events c ON c.original_service_id = s.service_id
  AND c.type = 'callback'
  AND c.created_date <= s.completed_date + INTERVAL '14 days'
WHERE s.status = 'completed'
  AND s.completed_date >= CURRENT_DATE - 7`,
    lineage: {
      sourceSystem: 'PestPac Field Service',
      sourceTable: 'pestpac.service_events',
      sourceFields: ['service_id', 'original_service_id', 'type', 'status', 'completed_date', 'technician_id'],
      transformations: ['Callback linkage to original service', '14-day window filter', 'Rate calculation'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['service_risk_index'],
    businessContext: 'Key quality metric for pest control technicians. High callback rates indicate incomplete treatment, wrong pest identification, or access issues. Target <5% is industry best practice. Used for technician coaching and training needs assessment.',
    benchmarks: [
      { name: 'Industry Best Practice', value: 0.05, source: 'NPMA Operations Benchmark', asOfDate: '2024-01' },
      { name: 'Unacceptable', value: 0.10, source: 'Internal Standard', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'missed_service_rate',
    name: 'Missed Service Rate',
    category: 'operations',
    definition: 'Percentage of scheduled services that were not completed as planned.',
    calculationNotes: 'COUNT(missed) / COUNT(scheduled) for services with scheduled_date in period.',
    grain: 'Weekly rollup',
    filters: ['date_range', 'market', 'branch', 'route'],
    primarySource: 'PestPac/Field Service',
    secondarySources: ['Workforce/HR (absence data)'],
    refreshCadence: 'Daily',
    owner: 'Operations - Director',
    reconciliationTarget: 'Missed count / scheduled count should match',
    dataQualityChecks: ['All scheduled services have final status', 'Reason code for missed services'],
    drillPath: '/kpi/missed_service_rate → by branch → by route → missed service list',
    format: 'percent',
    unit: '%',
    higherIsBetter: false,
    target: 0.02,
    warningThreshold: 0.04,
    criticalThreshold: 0.06,
    // M8: Extended formula and lineage fields
    formula: 'COUNT(Missed Services) / COUNT(Scheduled Services) × 100',
    sqlFormula: `SELECT
  COUNT(CASE WHEN status = 'missed' THEN 1 END)::float /
  NULLIF(COUNT(*), 0) as missed_rate
FROM service_events
WHERE scheduled_date >= CURRENT_DATE - 7
  AND scheduled_date < CURRENT_DATE`,
    lineage: {
      sourceSystem: 'PestPac Field Service',
      sourceTable: 'pestpac.service_events',
      sourceFields: ['status', 'scheduled_date', 'miss_reason', 'route_id', 'branch_id'],
      transformations: ['Status categorization', 'Period filtering', 'Rate calculation'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['service_risk_index', 'retention_risk'],
    businessContext: 'Critical customer satisfaction metric. Missed services in pest control can lead to infestations and contract cancellations. Common causes: technician absence, access issues, weather. Requires root cause analysis by miss reason code.',
    benchmarks: [
      { name: 'Target', value: 0.02, source: 'Internal Standard', asOfDate: '2024-01' },
      { name: 'Industry Average', value: 0.035, source: 'NPMA Operations Survey', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'avg_response_time_hours',
    name: 'Avg Response Time (Hours)',
    category: 'operations',
    definition: 'Average time from service request to service completion for on-demand requests.',
    calculationNotes: 'AVG(completed_date - request_date) in hours for on-demand service type.',
    grain: 'Weekly rollup',
    filters: ['date_range', 'market', 'branch', 'service_type'],
    primarySource: 'PestPac/Field Service',
    secondarySources: [],
    refreshCadence: 'Daily',
    owner: 'Operations - Director',
    reconciliationTarget: 'Manual calculation from service events should match',
    dataQualityChecks: ['Request timestamp captured', 'Completed timestamp captured', 'No negative response times'],
    drillPath: '/kpi/avg_response_time_hours → by branch → by priority → service event detail',
    format: 'number',
    unit: 'hrs',
    higherIsBetter: false,
    target: 24,
    warningThreshold: 36,
    criticalThreshold: 48,
    // M8: Extended formula and lineage fields
    formula: 'AVG(Completed Timestamp - Request Timestamp) in hours',
    sqlFormula: `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - requested_at)) / 3600) as avg_response_hours
FROM service_events
WHERE type = 'on_demand'
  AND status = 'completed'
  AND completed_at >= CURRENT_DATE - 7`,
    lineage: {
      sourceSystem: 'PestPac Field Service',
      sourceTable: 'pestpac.service_events',
      sourceFields: ['requested_at', 'completed_at', 'type', 'priority', 'branch_id'],
      transformations: ['On-demand filtering', 'Timestamp difference (hours)', 'Average aggregation'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['service_risk_index'],
    businessContext: 'Measures responsiveness to urgent pest issues. Commercial customers expect <24hr response for emergencies. Residential SLA typically 24-48 hours. Priority-weighted analysis helps identify capacity constraints by service type.',
    benchmarks: [
      { name: 'Emergency Target', value: 4, source: 'SLA Requirement', asOfDate: '2024-01' },
      { name: 'Standard Target', value: 24, source: 'Internal Standard', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'ar_aging',
    name: 'AR Aging',
    category: 'finance',
    definition: 'Total accounts receivable balance segmented by aging buckets (0-30, 31-60, 61-90, 90+ days).',
    calculationNotes: 'SUM(invoice.amount - payments) WHERE invoice.status = open GROUP BY days_since_due_date bucket.',
    grain: 'Daily snapshot',
    filters: ['market', 'branch', 'vertical', 'aging_bucket'],
    primarySource: 'Billing/ERP',
    secondarySources: [],
    refreshCadence: 'Daily (6am)',
    owner: 'Finance - AR Manager',
    reconciliationTarget: 'Sum of buckets = total AR balance',
    dataQualityChecks: ['All invoices have due date', 'Payment amounts valid', 'No orphaned payments'],
    drillPath: '/kpi/ar_aging → by bucket → by market → invoice list → invoice detail',
    format: 'currency',
    unit: '$',
    higherIsBetter: false,
    // M8: Extended formula and lineage fields
    formula: 'Σ(Open Invoice Balance) grouped by days past due (0-30, 31-60, 61-90, 90+)',
    sqlFormula: `SELECT
  CASE
    WHEN CURRENT_DATE - due_date <= 30 THEN '0-30'
    WHEN CURRENT_DATE - due_date <= 60 THEN '31-60'
    WHEN CURRENT_DATE - due_date <= 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket,
  SUM(amount - COALESCE(paid_amount, 0)) as balance
FROM invoices
WHERE status = 'open'
GROUP BY aging_bucket`,
    lineage: {
      sourceSystem: 'SAP ERP',
      sourceTable: 'erp.ar_invoices',
      sourceFields: ['invoice_amount', 'paid_amount', 'due_date', 'status', 'account_id'],
      transformations: ['Payment netting', 'Aging bucket calculation', 'Balance aggregation'],
      updateFrequency: 'Daily (6am)',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['dso', 'retention_risk'],
    businessContext: 'Cash flow management metric for pest control contracts. Commercial accounts often pay Net-30/60, while residential tends toward auto-pay. 90+ day balances often indicate disputes or collection risk requiring escalation.',
    benchmarks: [
      { name: 'Target 90+ %', value: 0.05, source: 'Finance Policy', asOfDate: '2024-01' },
      { name: 'Industry Average 90+ %', value: 0.08, source: 'NPMA Finance Survey', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'dso',
    name: 'Days Sales Outstanding',
    category: 'finance',
    definition: 'Average number of days to collect payment after invoicing.',
    calculationNotes: '(AR Balance / Revenue_Last_30_Days) * 30.',
    grain: 'Monthly rollup',
    filters: ['market', 'branch', 'vertical'],
    primarySource: 'Billing/ERP',
    secondarySources: [],
    refreshCadence: 'Daily',
    owner: 'Finance - AR Manager',
    reconciliationTarget: 'AR balance and revenue figures should be consistent',
    dataQualityChecks: ['Revenue data complete', 'AR balance accurate'],
    drillPath: '/kpi/dso → trend over time → by market → collection actions',
    format: 'days',
    unit: 'days',
    higherIsBetter: false,
    target: 35,
    warningThreshold: 45,
    criticalThreshold: 55,
    // M8: Extended formula and lineage fields
    formula: '(Total AR Balance / Revenue Last 30 Days) × 30',
    sqlFormula: `SELECT
  (SUM(ar.balance) / NULLIF(SUM(rev.revenue_30d), 0)) * 30 as dso_days
FROM ar_balances ar
JOIN revenue_30d rev ON ar.market_id = rev.market_id`,
    lineage: {
      sourceSystem: 'SAP ERP',
      sourceTable: 'erp.ar_summary',
      sourceFields: ['ar_balance', 'revenue_30d', 'market_id'],
      transformations: ['AR balance aggregation', 'Revenue period calculation', 'DSO formula application'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: ['ar_aging', 'revenue_mtd'],
    usedBy: [],
    businessContext: 'Working capital efficiency metric. Pest control industry average DSO is 35-40 days. Higher DSO indicates collection challenges or payment term issues. Residential auto-pay programs can significantly reduce DSO.',
    benchmarks: [
      { name: 'Best in Class', value: 28, source: 'Internal Top Quartile', asOfDate: '2024-01' },
      { name: 'Industry Average', value: 38, source: 'NPMA Finance Survey', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'capacity_utilization',
    name: 'Capacity Utilization',
    category: 'workforce',
    definition: 'Percentage of available technician hours that are scheduled/used.',
    calculationNotes: 'SUM(used_hours) / SUM(available_hours) across all technicians.',
    grain: 'Daily',
    filters: ['date_range', 'market', 'branch', 'route'],
    primarySource: 'Workforce/HR',
    secondarySources: ['PestPac/Field Service (actual time)'],
    refreshCadence: 'Every 4 hours',
    owner: 'Operations - Director',
    reconciliationTarget: 'Used hours from service events should match capacity system',
    dataQualityChecks: ['Available hours set for all techs', 'Time-on-site captured', 'No impossible utilization (>120%)'],
    drillPath: '/kpi/capacity_utilization → by branch → by technician → schedule detail',
    format: 'percent',
    unit: '%',
    higherIsBetter: true,
    target: 0.85,
    warningThreshold: 0.70,
    criticalThreshold: 0.60,
    // M8: Extended formula and lineage fields
    formula: 'Σ(Used Hours) / Σ(Available Hours) × 100',
    sqlFormula: `SELECT
  SUM(actual_hours)::float / NULLIF(SUM(available_hours), 0) as utilization_rate
FROM technician_capacity tc
JOIN service_time_summary sts ON tc.technician_id = sts.technician_id
WHERE tc.date = CURRENT_DATE`,
    lineage: {
      sourceSystem: 'Workday / PestPac',
      sourceTable: 'workforce.technician_capacity',
      sourceFields: ['available_hours', 'actual_hours', 'scheduled_hours', 'technician_id', 'date'],
      transformations: ['Capacity source from Workday', 'Actual hours from PestPac', 'Utilization calculation'],
      updateFrequency: 'Every 4 hours',
      dataLag: 'T-0 (real-time)'
    },
    dependencies: [],
    usedBy: ['scheduling_pressure_index', 'forecast_revenue_8w'],
    businessContext: 'Workforce efficiency metric. Target 85% allows for drive time, breaks, and on-demand capacity. Over-utilization (>95%) indicates burnout risk and reduced quality. Under-utilization represents lost revenue opportunity.',
    benchmarks: [
      { name: 'Optimal', value: 0.85, source: 'Operations Best Practice', asOfDate: '2024-01' },
      { name: 'Maximum Safe', value: 0.95, source: 'HR Guidelines', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'scheduling_pressure_index',
    name: 'Scheduling Pressure Index',
    category: 'workforce',
    definition: 'Composite index measuring scheduling strain based on utilization, overtime, and unfilled slots.',
    calculationNotes: '(utilization_score * 40 + overtime_score * 30 + unfilled_score * 30). Lower is better, 0-100 scale.',
    grain: 'Daily',
    filters: ['market', 'branch'],
    primarySource: 'Workforce/HR',
    secondarySources: ['PestPac/Field Service'],
    refreshCadence: 'Daily',
    owner: 'Operations - Director',
    reconciliationTarget: 'Component scores should sum correctly',
    dataQualityChecks: ['Overtime hours tracked', 'Schedule gaps identified', 'Capacity data current'],
    drillPath: '/kpi/scheduling_pressure_index → component breakdown → by branch → staffing detail',
    format: 'index',
    unit: 'pts',
    higherIsBetter: false,
    target: 30,
    warningThreshold: 50,
    criticalThreshold: 70,
    // M8: Extended formula and lineage fields
    formula: '(Over-Utilization Score × 40) + (Overtime Score × 30) + (Unfilled Slots Score × 30)',
    sqlFormula: `SELECT
  (CASE WHEN utilization > 0.95 THEN (utilization - 0.85) * 400 ELSE 0 END) * 0.4 +
  (overtime_pct * 100) * 0.3 +
  (unfilled_rate * 100) * 0.3 as pressure_index
FROM daily_scheduling_metrics
WHERE date = CURRENT_DATE`,
    lineage: {
      sourceSystem: 'Workday / PestPac',
      sourceTable: 'workforce.scheduling_metrics',
      sourceFields: ['utilization_rate', 'overtime_hours', 'unfilled_slots', 'total_slots'],
      transformations: ['Component score normalization', 'Weighted aggregation', 'Index calculation'],
      updateFrequency: 'Daily',
      dataLag: 'T-0 (same-day)'
    },
    dependencies: ['capacity_utilization'],
    usedBy: ['forecast_revenue_8w'],
    businessContext: 'Early warning indicator for staffing constraints. High pressure index suggests need for hiring, route optimization, or overtime approval. Used in weekly ops reviews to identify capacity risks before they impact service delivery.',
    benchmarks: [
      { name: 'Healthy', value: 30, source: 'Operations Standard', asOfDate: '2024-01' },
      { name: 'Crisis Level', value: 70, source: 'Operations Standard', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'crm_hygiene_score',
    name: 'CRM Hygiene Score',
    category: 'quality',
    definition: 'Score (0-100) measuring data quality in CRM: complete fields, current activities, valid stages.',
    calculationNotes: '(complete_fields_pct * 40 + recent_activity_pct * 30 + valid_stage_pct * 30).',
    grain: 'Daily snapshot',
    filters: ['market', 'branch', 'owner'],
    primarySource: 'CRM (Salesforce)',
    secondarySources: [],
    refreshCadence: 'Daily (5am)',
    owner: 'Sales Ops - Director',
    reconciliationTarget: 'Component metrics should calculate to score',
    dataQualityChecks: ['Required fields defined', 'Activity recency threshold set', 'Stage validation rules active'],
    drillPath: '/kpi/crm_hygiene_score → by component → by owner → opp/account issues list',
    format: 'index',
    unit: 'pts',
    higherIsBetter: true,
    target: 90,
    warningThreshold: 75,
    criticalThreshold: 60,
    // M8: Extended formula and lineage fields
    formula: '(Complete Fields % × 40) + (Recent Activity % × 30) + (Valid Stage % × 30)',
    sqlFormula: `WITH hygiene_components AS (
  SELECT
    AVG(CASE WHEN required_fields_complete THEN 1 ELSE 0 END) as complete_fields_pct,
    AVG(CASE WHEN last_activity_date >= CURRENT_DATE - 14 THEN 1 ELSE 0 END) as recent_activity_pct,
    AVG(CASE WHEN stage_valid THEN 1 ELSE 0 END) as valid_stage_pct
  FROM opportunities
  WHERE stage NOT IN ('closed_won', 'closed_lost')
)
SELECT (complete_fields_pct * 40 + recent_activity_pct * 30 + valid_stage_pct * 30) as hygiene_score
FROM hygiene_components`,
    lineage: {
      sourceSystem: 'Salesforce CRM',
      sourceTable: 'sfdc.opportunity_hygiene',
      sourceFields: ['required_fields_complete', 'last_activity_date', 'stage', 'stage_valid'],
      transformations: ['Field completeness check', 'Activity recency (14-day threshold)', 'Stage validation', 'Weighted scoring'],
      updateFrequency: 'Daily (5am)',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['pipeline_30_60_90'],
    businessContext: 'Data quality metric ensuring reliable pipeline reporting. Low hygiene scores correlate with poor forecast accuracy. Required fields include: close date, amount, contact, next step. Used for rep accountability and CRM adoption tracking.',
    benchmarks: [
      { name: 'Target', value: 90, source: 'Sales Ops Policy', asOfDate: '2024-01' },
      { name: 'Minimum Acceptable', value: 75, source: 'Sales Ops Policy', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'stalled_opps',
    name: 'Stalled Opportunities',
    category: 'sales',
    definition: 'Count and value of opportunities with no stage movement or activity in 14+ days.',
    calculationNotes: 'COUNT/SUM(amount) WHERE days_since_stage_change > 14 OR days_since_activity > 14.',
    grain: 'Daily snapshot',
    filters: ['market', 'branch', 'owner', 'stage'],
    primarySource: 'CRM (Salesforce)',
    secondarySources: [],
    refreshCadence: 'Daily',
    owner: 'Sales Ops - Director',
    reconciliationTarget: 'Stalled list count should match',
    dataQualityChecks: ['Stage change dates tracked', 'Activities logged with timestamps'],
    drillPath: '/kpi/stalled_opps → by owner → by stage → opportunity list → opp detail',
    format: 'currency',
    unit: '$',
    higherIsBetter: false,
    // M8: Extended formula and lineage fields
    formula: 'COUNT/SUM(Amount) where Days Since Stage Change > 14 OR Days Since Activity > 14',
    sqlFormula: `SELECT
  COUNT(*) as stalled_count,
  SUM(amount) as stalled_value
FROM opportunities
WHERE stage NOT IN ('closed_won', 'closed_lost')
  AND (
    CURRENT_DATE - last_stage_change_date > 14
    OR CURRENT_DATE - last_activity_date > 14
  )`,
    lineage: {
      sourceSystem: 'Salesforce CRM',
      sourceTable: 'sfdc.opportunity',
      sourceFields: ['amount', 'stage', 'last_stage_change_date', 'last_activity_date', 'owner_id'],
      transformations: ['Stage change date calculation', 'Activity recency check', 'Stall threshold (14 days)'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['crm_hygiene_score'],
    businessContext: 'Pipeline health indicator identifying deals requiring sales manager intervention. Stalled opportunities often indicate lost deals, wrong contacts, or competitor engagement. Weekly review required for all stalled deals >$10K.',
    benchmarks: [
      { name: 'Target % of Pipeline', value: 0.15, source: 'Sales Ops Policy', asOfDate: '2024-01' },
      { name: 'Alert Threshold', value: 0.25, source: 'Sales Ops Policy', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'retention_risk',
    name: 'Retention Risk',
    category: 'operations',
    definition: 'Count and contract value of accounts flagged as high retention risk.',
    calculationNotes: 'SUM(contract_value) WHERE retention_risk = high. Risk based on complaints, service issues, AR delinquency, declining activity.',
    grain: 'Daily snapshot',
    filters: ['market', 'branch', 'vertical', 'risk_level'],
    primarySource: 'PestPac/Field Service',
    secondarySources: ['CRM (complaints)', 'Billing/ERP (AR status)'],
    refreshCadence: 'Daily',
    owner: 'Operations - VP',
    reconciliationTarget: 'At-risk account list total should match',
    dataQualityChecks: ['Risk scoring model validated', 'All data inputs current', 'Thresholds calibrated'],
    drillPath: '/kpi/retention_risk → by risk factor → by market → account list → account detail',
    format: 'currency',
    unit: '$',
    higherIsBetter: false,
    // M8: Extended formula and lineage fields
    formula: 'Σ(Contract Value) where Risk Score > Threshold (based on complaints, service issues, AR, activity)',
    sqlFormula: `WITH risk_scored_accounts AS (
  SELECT
    a.account_id,
    a.contract_value,
    (COALESCE(c.complaint_score, 0) * 0.3 +
     COALESCE(s.service_issue_score, 0) * 0.3 +
     COALESCE(ar.delinquency_score, 0) * 0.25 +
     COALESCE(act.activity_decline_score, 0) * 0.15) as risk_score
  FROM accounts a
  LEFT JOIN complaint_scores c ON a.account_id = c.account_id
  LEFT JOIN service_issue_scores s ON a.account_id = s.account_id
  LEFT JOIN ar_delinquency_scores ar ON a.account_id = ar.account_id
  LEFT JOIN activity_scores act ON a.account_id = act.account_id
)
SELECT COUNT(*) as at_risk_count, SUM(contract_value) as at_risk_value
FROM risk_scored_accounts WHERE risk_score > 0.7`,
    lineage: {
      sourceSystem: 'RTX Data Hub (composite)',
      sourceTable: 'analytics.account_risk_scores',
      sourceFields: ['complaint_count', 'callback_count', 'ar_days_past_due', 'service_frequency_change', 'contract_value'],
      transformations: ['Component score normalization', 'Weighted risk calculation', 'Threshold classification (High >0.7)'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: ['service_risk_index', 'ar_aging', 'complaint_rate', 'missed_service_rate'],
    usedBy: ['nrr'],
    businessContext: 'Proactive churn prevention metric. High-risk accounts require retention outreach within 48 hours. Risk factors include: 2+ callbacks in 30 days, complaints, 60+ day AR, declining service frequency. Saves ~40% of at-risk contracts with intervention.',
    benchmarks: [
      { name: 'Target At-Risk %', value: 0.05, source: 'Customer Success Policy', asOfDate: '2024-01' },
      { name: 'Critical Threshold', value: 0.10, source: 'Customer Success Policy', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'complaint_rate',
    name: 'Complaint Rate',
    category: 'quality',
    definition: 'Number of complaints per 1,000 service events.',
    calculationNotes: '(COUNT(complaints) / COUNT(service_events)) * 1000.',
    grain: 'Monthly rollup',
    filters: ['date_range', 'market', 'branch', 'complaint_type'],
    primarySource: 'CRM (Complaints)',
    secondarySources: ['PestPac/Field Service (service count)'],
    refreshCadence: 'Daily',
    owner: 'Customer Experience - Director',
    reconciliationTarget: 'Complaint count / service count * 1000 should match',
    dataQualityChecks: ['All complaints categorized', 'Service events counted correctly', 'Date ranges aligned'],
    drillPath: '/kpi/complaint_rate → by type → by branch → complaint list → account detail',
    format: 'number',
    unit: '',
    higherIsBetter: false,
    target: 5,
    warningThreshold: 8,
    criticalThreshold: 12,
    // M8: Extended formula and lineage fields
    formula: '(COUNT(Complaints) / COUNT(Service Events)) × 1,000',
    sqlFormula: `SELECT
  (COUNT(c.complaint_id)::float / NULLIF(COUNT(s.service_id), 0)) * 1000 as complaint_rate_per_1000
FROM service_events s
LEFT JOIN complaints c ON c.service_id = s.service_id
WHERE s.completed_date >= DATE_TRUNC('month', CURRENT_DATE)`,
    lineage: {
      sourceSystem: 'Salesforce CRM / PestPac',
      sourceTable: 'crm.complaints',
      sourceFields: ['complaint_id', 'complaint_type', 'service_id', 'created_date', 'resolution_status'],
      transformations: ['Complaint to service linkage', 'Rate calculation per 1,000', 'Monthly aggregation'],
      updateFrequency: 'Daily',
      dataLag: 'T-1 (next day)'
    },
    dependencies: [],
    usedBy: ['service_risk_index', 'retention_risk'],
    businessContext: 'Customer satisfaction proxy for pest control services. Common complaint types: ineffective treatment, property damage, scheduling issues, technician behavior. Target <5 per 1,000 services. Used for technician performance reviews and training.',
    benchmarks: [
      { name: 'Best in Class', value: 3, source: 'Internal Top Quartile', asOfDate: '2024-01' },
      { name: 'Industry Average', value: 7, source: 'NPMA Customer Service Survey', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'nrr',
    name: 'Net Revenue Retention',
    category: 'revenue',
    definition: 'Revenue from existing customers this period vs same customers last period, including expansion and churn.',
    calculationNotes: '(Starting_Revenue + Expansion - Contraction - Churn) / Starting_Revenue.',
    grain: 'Monthly rollup',
    filters: ['market', 'vertical'],
    primarySource: 'Billing/ERP',
    secondarySources: ['CRM (account changes)'],
    refreshCadence: 'Monthly (1st of month)',
    owner: 'Finance - FP&A',
    reconciliationTarget: 'Components should sum to NRR calculation',
    dataQualityChecks: ['Cohort tracking accurate', 'Expansion/contraction categorized', 'Churn reasons captured'],
    drillPath: '/kpi/nrr → component breakdown → by market → churned accounts list',
    format: 'percent',
    unit: '%',
    higherIsBetter: true,
    target: 1.05,
    warningThreshold: 0.98,
    criticalThreshold: 0.95,
    // M8: Extended formula and lineage fields
    formula: '(Starting Revenue + Expansion - Contraction - Churn) / Starting Revenue',
    sqlFormula: `WITH cohort_revenue AS (
  SELECT
    SUM(CASE WHEN period = 'start' THEN revenue END) as starting_revenue,
    SUM(CASE WHEN period = 'current' AND change_type = 'expansion' THEN revenue END) as expansion,
    SUM(CASE WHEN period = 'current' AND change_type = 'contraction' THEN revenue END) as contraction,
    SUM(CASE WHEN period = 'current' AND change_type = 'churn' THEN revenue END) as churn
  FROM account_revenue_cohort
  WHERE cohort_month = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
)
SELECT (starting_revenue + COALESCE(expansion, 0) - COALESCE(contraction, 0) - COALESCE(churn, 0)) / NULLIF(starting_revenue, 0) as nrr
FROM cohort_revenue`,
    lineage: {
      sourceSystem: 'SAP ERP',
      sourceTable: 'erp.account_revenue_cohort',
      sourceFields: ['account_id', 'cohort_month', 'starting_revenue', 'current_revenue', 'change_type'],
      transformations: ['Cohort definition (12-month lookback)', 'Change type classification', 'NRR calculation'],
      updateFrequency: 'Monthly (1st of month)',
      dataLag: 'T-30 (monthly close)'
    },
    dependencies: ['revenue_mtd', 'retention_risk'],
    usedBy: [],
    businessContext: 'Key SaaS-style metric adapted for recurring pest control contracts. NRR >100% indicates healthy growth from existing base. Pest control industry typically sees 95-102% NRR. Expansion comes from upselling additional services (termite, mosquito, wildlife).',
    benchmarks: [
      { name: 'Excellent', value: 1.05, source: 'Industry Best Practice', asOfDate: '2024-01' },
      { name: 'Industry Average', value: 0.98, source: 'NPMA Revenue Survey', asOfDate: '2024-01' }
    ]
  },
  {
    slug: 'margin_proxy',
    name: 'Margin Proxy',
    category: 'finance',
    definition: 'Estimated gross margin based on revenue minus estimated service cost (labor + materials).',
    calculationNotes: '(Revenue - (Labor_Hours * Avg_Cost + Material_Estimate)) / Revenue.',
    grain: 'Monthly rollup',
    filters: ['market', 'branch', 'vertical'],
    primarySource: 'Billing/ERP',
    secondarySources: ['Workforce/HR (labor cost)', 'PestPac (materials)'],
    refreshCadence: 'Weekly',
    owner: 'Finance - Controller',
    reconciliationTarget: 'Labor hours from workforce should match',
    dataQualityChecks: ['Labor rates current', 'Material costs estimated', 'Revenue allocated correctly'],
    drillPath: '/kpi/margin_proxy → cost breakdown → by market → by service type',
    format: 'percent',
    unit: '%',
    higherIsBetter: true,
    target: 0.45,
    warningThreshold: 0.38,
    criticalThreshold: 0.32,
    // M8: Extended formula and lineage fields
    formula: '(Revenue - (Labor Hours × Avg Hourly Cost + Material Cost)) / Revenue',
    sqlFormula: `SELECT
  (SUM(r.revenue) - SUM(l.hours * l.hourly_rate) - SUM(m.material_cost)) /
  NULLIF(SUM(r.revenue), 0) as margin_proxy
FROM revenue_by_service r
JOIN labor_cost l ON r.service_id = l.service_id
JOIN material_cost m ON r.service_id = m.service_id
WHERE r.service_month = DATE_TRUNC('month', CURRENT_DATE)`,
    lineage: {
      sourceSystem: 'RTX Data Hub (composite)',
      sourceTable: 'analytics.service_margin',
      sourceFields: ['revenue', 'labor_hours', 'hourly_rate', 'material_cost', 'service_type'],
      transformations: ['Labor cost calculation (hours × rate)', 'Material cost aggregation', 'Margin calculation'],
      updateFrequency: 'Weekly',
      dataLag: 'T-7 (weekly close)'
    },
    dependencies: ['revenue_mtd', 'capacity_utilization'],
    usedBy: [],
    businessContext: 'Profitability proxy metric while full cost accounting is in development. Pest control gross margins typically 40-50%. Lower margins may indicate route inefficiency, excessive callbacks, or material waste. Used for pricing and territory profitability analysis.',
    benchmarks: [
      { name: 'Target', value: 0.45, source: 'Finance Policy', asOfDate: '2024-01' },
      { name: 'Industry Average', value: 0.42, source: 'NPMA Financial Benchmark', asOfDate: '2024-01' }
    ]
  },
]

export const getKPIBySlug = (slug: string): KPIDefinition | undefined => {
  return KPI_DICTIONARY.find(kpi => kpi.slug === slug)
}

export const getKPIsByCategory = (category: string): KPIDefinition[] => {
  return KPI_DICTIONARY.filter(kpi => kpi.category === category)
}

export const TOP_10_KPIS = [
  'revenue_mtd',
  'variance_to_target_mtd',
  'pipeline_30_60_90',
  'win_rate',
  'forecast_revenue_8w',
  'service_risk_index',
  'callback_rate',
  'ar_aging',
  'capacity_utilization',
  'crm_hygiene_score',
]

export const DATA_SOURCES: { name: string; system: string; description: string }[] = [
  { name: 'CRM', system: 'Salesforce', description: 'Opportunities, Activities, Accounts, Contacts' },
  { name: 'Billing/ERP', system: 'SAP/Oracle', description: 'Invoices, Payments, AR, Revenue' },
  { name: 'Field Service', system: 'PestPac', description: 'Service Events, Routes, Callbacks, Materials' },
  { name: 'Workforce/HR', system: 'Workday', description: 'Technicians, Capacity, Scheduling, Labor Costs' },
]
