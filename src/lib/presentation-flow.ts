/**
 * Presentation Flow Configuration
 *
 * Defines the 7-step guided presentation script with talking points,
 * transition narratives, element focus targets, and sub-step navigation.
 * Sourced from DEMO_FLOW_WITH_COMPARISON.md.
 *
 * Only consumed when Presentation Mode is enabled.
 */

export interface TalkingPointFocus {
  elementId: string
  label?: string
  scrollIntoView?: boolean // default true
}

export interface PresentationStep {
  id: string
  title: string
  subtitle: string
  route: string
  /** Secondary route to navigate to mid-step (e.g., drill from /finance to /finance/ar) */
  drillRoute?: string
  duration: string
  businessQuestion: string
  audienceResonance: string[]
  talkingPoints: string[]
  /** Optional focus targets per talking point (null = no highlight for that TP) */
  talkingPointFocus?: (TalkingPointFocus | null)[]
  positioning: string
  transition: string
  avoidNotes?: string[]
}

export const PRESENTATION_FLOW: PresentationStep[] = [
  {
    id: 'command-center',
    title: 'Executive Command Center',
    subtitle: 'Screen 1 of 7',
    route: '/',
    duration: '5 min',
    businessQuestion: 'Where do I focus today?',
    audienceResonance: [
      'Susan (VP): This is the executive view she\'d use daily',
      'Jason (Director BI): Architecture that serves all roles from one component',
    ],
    talkingPoints: [
      'Four summary cards at top: Revenue MTD shows $39M at -9.1% vs prior, KPI Health shows 2 warnings and 2 critical items, Priority Actions shows 60 items with 49 critical.',
      'Six KPI cards below show Revenue, AR Aging, DSO, Win Rate, Forecast Revenue, and Net Revenue Retention - each with current value and trend vs prior period.',
      'Priority Actions panel on the right lists urgent items sorted by severity - click any row to see details and next best action.',
    ],
    talkingPointFocus: [
      { elementId: 'executive-summary-cards', label: 'Summary Cards' },
      { elementId: 'executive-kpi-grid', label: 'KPI Grid' },
      { elementId: 'priority-actions-panel', label: 'Priority Actions' },
    ],
    positioning: 'This is the missing layer. Today, leadership opens multiple systems for a fragmented view. This connects KPIs into a unified decision framework with drill-through capability.',
    transition: 'That\'s the executive view. Now let\'s see what a Region Director sees at 7am for their morning huddle...',
  },
  {
    id: 'daily-performance',
    title: 'Daily Performance',
    subtitle: 'Screen 2 of 7',
    route: '/daily-performance',
    duration: '5 min',
    businessQuestion: 'Is my team on track today?',
    audienceResonance: [
      'Lindsey (Sr Mgr SI): This is how Sales Intelligence monitors which markets and regions need support',
      'John (Mgr SI): Maps to how branch/region managers think about their day -- shows SI where to focus coaching',
    ],
    talkingPoints: [
      'Tabs at top switch between Market, Region, and Branch views - same metrics at each organizational level.',
      'Summary metrics show actual performance. The data table breaks down each entity with color-coded status.',
      'Workforce columns show headcount alongside performance - identifies if underperformance is staffing-related.',
    ],
    talkingPointFocus: [
      { elementId: 'daily-perf-tabs', label: 'Org Level Tabs' },
      { elementId: 'daily-perf-metrics', label: 'Performance Metrics' },
      null,
    ],
    positioning: 'Traditional operational views require scrolling through dense tables. This gives the same answer in a visual format that matches how people process information, with the workforce overlay adding diagnostic context.',
    transition: 'Performance metrics tell you if you\'re on track. Finance tells you the health of the engine driving it...',
  },
  {
    id: 'finance',
    title: 'Finance + AR Aging',
    subtitle: 'Screen 3 of 7',
    route: '/finance',
    drillRoute: '/finance/ar',
    duration: '4 min',
    businessQuestion: 'Where is cash at risk?',
    audienceResonance: [
      'Susan (VP): AR aging is a top-of-mind metric for any VP',
      'Jason (Director BI): BCG data enrichment demonstrates technical depth and data architecture thinking',
    ],
    talkingPoints: [
      'KPI cards show Revenue MTD, AR Aging, DSO, NRR, and Margin status at a glance.',
      'AR Aging Breakdown chart shows current vs overdue buckets - red indicates 90+ days, that\'s cash at risk.',
      'Click Drill to see individual overdue accounts with customer names and amounts.',
    ],
    talkingPointFocus: [
      { elementId: 'finance-kpi-cards', label: 'Finance KPIs' },
      { elementId: 'finance-ar-aging-chart', label: 'AR Aging Chart' },
      null, // Drill action -- no highlight
    ],
    positioning: 'Standard financial reporting shows the data. What this adds is the diagnostic workflow -- from summary KPIs to aging breakdown to specific overdue accounts, all visual with drill-through capability and cross-dataset enrichment.',
    transition: 'Revenue health depends on what\'s feeding the pipeline. Let\'s trace that upstream to leads...',
  },
  {
    id: 'leads',
    title: 'Lead Rankings + Journey',
    subtitle: 'Screen 4 of 7',
    route: '/leads/rankings',
    drillRoute: '/leads/journey',
    duration: '5 min',
    businessQuestion: 'Where are leads falling through?',
    audienceResonance: [
      'Lindsey (Sr Mgr SI): This IS her function - lead intelligence and conversion optimization',
      'John (Mgr SI): Rankings create accountability; journey tracking shows where leads drop off',
    ],
    talkingPoints: [
      'Top 3 performers shown with medals - gold, silver, bronze based on lead conversion.',
      'Full rankings table below with sortable columns. Use Group By to switch Market/Region/Branch views.',
      'Click any row to drill into that entity\'s lead funnel details.',
    ],
    talkingPointFocus: [
      { elementId: 'lead-top-performers', label: 'Top Performers' },
      { elementId: 'lead-rankings-table', label: 'Rankings Table' },
      null, // Drill action -- no highlight
    ],
    positioning: 'Traditional lead reporting shows volume. This adds the diagnostic layer -- channel attribution, cross-system match rates, and competitive ranking -- so leadership sees both where leads are and where they\'re falling through.',
    transition: 'Leads are the input. Sales execution is the throughput. Here\'s how we track that process...',
  },
  {
    id: 'salti',
    title: 'SALTI Overview',
    subtitle: 'Screen 5 of 7',
    route: '/salti',
    duration: '4 min',
    businessQuestion: 'Where in the funnel are we losing revenue?',
    audienceResonance: [
      'Lindsey (Sr Mgr SI): SALTI is her team\'s primary framework',
      'John (Mgr SI): The sub-dashboards map to how his team operates weekly',
    ],
    talkingPoints: [
      'Six-stage lead funnel from MQL through Sold - shows volume and conversion rate at each stage.',
      'Navigation cards link to different views: Daily Check-In, Productivity tracking, Year-over-Year comparisons.',
      'All data is live from BigQuery - over 2 million lead records from TMX.',
    ],
    talkingPointFocus: [
      { elementId: 'salti-lead-funnel', label: 'Lead Funnel' },
      { elementId: 'salti-nav-cards', label: 'Navigation Cards' },
      null,
    ],
    positioning: 'A SALTI scorecard exists in other systems as a single table. This shows the SALTI operating system -- structured around how sales leaders actually manage their teams, with dedicated views for each management cadence.',
    transition: 'Every metric I\'ve shown depends on data trust. Here\'s what I built to ensure that trust isn\'t fragile...',
    avoidNotes: ['Do NOT drill into /salti/proposal-pipeline'],
  },
  {
    id: 'governance',
    title: 'Data Governance + Platform Admin',
    subtitle: 'Screen 6 of 7',
    route: '/governance/data-quality',
    drillRoute: '/platform-admin',
    duration: '4 min',
    businessQuestion: 'Can you trust the numbers?',
    audienceResonance: [
      'Susan (VP): Governance is what separates a proof-of-concept from a production platform',
      'Jason (Director BI): This is the infrastructure layer he\'d need to maintain any BI platform',
    ],
    talkingPoints: [
      'Data Quality score shows overall health. Neither Branch 360 nor RTX DataHub has governance like this.',
      'Dimension breakdown: Completeness, Accuracy, Timeliness, Consistency. Each dimension scored separately.',
      'Tabs show Validation issues, Data Sources status, and Reconciliation results.',
    ],
    talkingPointFocus: [
      { elementId: 'dq-overall-score', label: 'Quality Score' },
      null,
      { elementId: 'dq-tabs', label: 'Detail Tabs' },
    ],
    positioning: 'This is the strategic thinking layer. When a BI platform has no governance, data quality erodes silently and users stop trusting the numbers. This ensures trust, adoption, and long-term platform viability.',
    transition: 'This is the strategic layer -- platform reliability and data trust governance that I\'d recommend as a foundational capability for any enterprise BI platform.',
  },
  {
    id: 'closing',
    title: 'Discussion',
    subtitle: 'Screen 7 of 7',
    route: '',
    duration: '5 min',
    businessQuestion: 'Where do we go from here?',
    audienceResonance: [
      'Susan (VP): Opportunity to connect platform capabilities to org design decisions',
      'Jason (Director BI): Technical validation and next-steps alignment',
    ],
    talkingPoints: [
      'What questions do you have?',
      'How does this compare to what you\'re seeing in Branch 360?',
      'What would you need to see to take this further?',
    ],
    talkingPointFocus: [null, null, null],
    positioning: 'CLOSING ASK: Susan, you mentioned the org is still being designed with strategic oversight roles. I\'d like to be considered for that. What would you need to see from me to make that decision easier?',
    transition: '',
  },
]

export type SpotlightIntensity = 'subtle' | 'medium' | 'prominent'
