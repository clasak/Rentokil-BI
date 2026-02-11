/**
 * BigQuery Query Functions
 *
 * Exports all production-ready query functions for dashboard pages.
 *
 * These queries target the production BigQuery tables (bidata-sharedus-production)
 * and are designed to work with the dashboard pages that have full data match.
 *
 * BigQuery Datasets (15 total):
 * - S4: Unified views (21 tables, 67 views) - CRITICAL
 * - S0_TMX: TMX source data (255 tables, 74M+ lead rows) - CRITICAL
 * - W3_Contract_Checker: Contract sales (7.9M rows) - CRITICAL
 * - BCG_RTD_DB: BCG analytics (74 tables, 596M rows) - HIGH
 * - Reports, S4_Reports, AR: Finance/AR data - HIGH
 * - Reference, WorkDayTerm, S0: Reference and HR data
 *
 * See src/lib/data-dictionary-bigquery.ts for complete dataset catalog.
 */

// Date filter helpers (standardized date filtering across all queries)
export {
  buildDateFilter,
  buildTodayFilter,
  buildMonthToDateFilter,
  buildYearToDateFilter,
  buildTrailingMonthsFilter,
  buildYearMonthFilter,
  buildDateFilterWithNull,
  type DateFilterOptions,
  type YearMonthFilterOptions,
} from './date-filters'

// Leads queries
export {
  getLeadsByPestType,
  getLeadTrends,
  getLeadRankings,
  getLeadCancellations,
  getLeadGeographic,
  getLeadFunnel,
  type LeadsByPestType,
  type LeadTrend,
  type LeadRanking,
  type LeadCancellation,
  type LeadGeographic,
  type LeadFunnel,
  type LeadsQueryOptions,
} from './leads'

// Sales queries
export {
  getSpeedToInstall,
  getSalesToday,
  getBacklog,
  getCanceledAgreements,
  getStartRate,
  getSalesMarkets,
  getSalesRegions,
  getSalesBranches,
  getSalesFilterHierarchy,
  type SpeedToInstall,
  type SalesToday,
  type BacklogItem,
  type CanceledAgreement,
  type StartRateMetric,
  type SalesQueryOptions,
} from './sales'

// Sales Pipeline queries (pipeline, rep performance, at-risk, KPIs)
export {
  getPipelineByStage,
  getRepPerformance,
  getAtRiskLeads,
  getSalesPipelineSummary,
  getSalesKPIs,
  getTopOpportunities,
  getOpportunityById,
  type PipelineByStage,
  type RepPerformance,
  type AtRiskLead,
  type SalesPipelineSummary,
  type SalesKPIs,
  type TopOpportunity,
  type OpportunityDetail,
  type SalesPipelineQueryOptions,
} from './sales-pipeline'

// Finance queries
export {
  getARAging,
  getARSummary,
  getARByBranch,
  getARDetails,
  getInvoiceById,
  getRevenueProjections,
  getProjectionAccuracy,
  getVarianceAnalysis,
  type ARAging,
  type ARSummary,
  type ARByBranch,
  type ARDetailRecord,
  type RevenueProjectionRecord,
  type ProjectionAccuracyRecord,
  type VarianceAnalysisRecord,
  type FinanceQueryOptions,
} from './finance'

// P&L queries (S0_TMX.vfct_gl_activity - 61M rows)
export {
  getPnLSummary,
  getRevenueBreakdown,
  getExpenseBreakdown,
  getPnLTrend,
  type PnLSummary,
  type RevenueBreakdown,
  type ExpenseBreakdown,
  type PnLTrend,
  type PnLQueryOptions,
} from './pnl'

// Termite queries
export {
  getPNIByBranch,
  getPNIDetails,
  getTermiteRenewals,
  getTermiteRenewalSummary,
  type PNIInspection,
  type PNIDetail,
  type TermiteRenewal,
  type RenewalSummary,
  type TermiteQueryOptions,
} from './termite'

// SALTI queries
export {
  getSALTIOverview,
  getSALTIDailyCheckIn,
  getSALTIProductivity,
  getSALTIProposalPipeline,
  getSALTIWeekendBlitz,
  getSALTIYoYTrends,
  getSALTIFunnelFallout,
  getSALTISalesLadders,
  type SALTIOverview,
  type SALTIDailyCheckIn,
  type SALTIProductivity,
  type SALTIProposalPipeline,
  type SALTIWeekendBlitz,
  type SALTIYoYTrends,
  type SALTIFunnelFallout,
  type SALTISalesLadders,
  type SALTIQueryOptions,
} from './salti'

// Operations queries
export {
  getOpsOverview,
  getOpsNational,
  getOpsNewStarts,
  getOpsAccounts,
  getOpsServiceEvents,
  getOpsComplaints,
  getTechnicianRoute,
  type OpsOverview,
  type OpsNational,
  type OpsNewStarts,
  type OpsAccount,
  type OpsServiceEvent,
  type OpsComplaint,
  type TechnicianRouteStop,
  type TechnicianRouteQueryOptions,
  type OpsQueryOptions,
} from './ops'

// Executive queries
export {
  getExecutiveCommandCenter,
  getKPIDetail,
  type ExecutiveCommandCenter,
  type KPIDetail,
  type ExecutiveQueryOptions,
} from './executive'

// KPI Historical Comparison queries
export {
  getKPIHistoricalComparisons,
  getKPIMonthlyTrends,
  type KPIHistoricalComparison,
  type KPIMonthlyTrend,
  type KPIHistoricalOptions,
} from './kpi-historical'

// Branch/Region/Market queries
export {
  getBranchDetail,
  getBranchDaily,
  getRegionDaily,
  getMarketDaily,
  getBranchOverview,
  type BranchDetail,
  type BranchDaily,
  type RegionDaily,
  type MarketDaily,
  type BranchOverview,
  type BranchQueryOptions,
} from './branch'

// Account Executive queries
export {
  getAEPipeline,
  getAETracker,
  getTechTickets,
  getTechDispatch,
  // AE Tracker Totals
  getAETrackerTotals,
  getAECategoryBreakdown,
  getAEMonthlyProgression,
  getMonthlyTotalsDetail,
  // Xactly-linked compensation queries
  getAECompensationSummary,
  getAESalesDetails,
  getAESalesPersonList,
  getAEMonthlyCompensation,
  // New Start Log queries (AE-specific with salesPerson filter)
  getNewStartLogEntries,
  getNewStartLogSummary,
  // Salesforce integration queries
  getSalesforceOpportunities,
  getSalesforceQuotes,
  // Integrated dashboard (Salesforce + PestPac + Xactly)
  getAEIntegratedDashboard,
  // IRIS national accounts
  getIRISNationalAccounts,
  getIRISNationalAccountSummary,
  type AEPipeline,
  type AETracker,
  type TechTickets,
  type TechDispatch,
  type AEQueryOptions,
  // AE Tracker Totals types
  type AETrackerTotals,
  type AECategoryBreakdown,
  type AEMonthlyProgress,
  type MonthlyTotalsDetail,
  // Xactly compensation types
  type AECompensationSummary,
  type AESalesDetail,
  // New Start Log types
  type NewStartLogEntry,
  type NewStartLogSummary,
  // Integrated dashboard type
  type AEIntegratedDashboard,
  // IRIS national account types
  type IRISNationalAccount,
} from './ae'

// HR queries
export {
  getHRRetention,
  getPeopleOverview,
  getRetentionByDepartment,
  getTerminationReasons,
  getHeadcountSummary,
  type HRRetention,
  type PeopleOverview,
  type RetentionByDepartment,
  type TerminationReason,
  type HeadcountSummary,
  type HRQueryOptions,
} from './hr'

// Workforce queries
export {
  getTechProductivity,
  getTechProductivitySummary,
  getTechnicianList,
  type TechProductivity,
  type TechProductivitySummary,
  type WorkforceQueryOptions,
} from './workforce'

// Organization hierarchy queries
export {
  getMarkets,
  getRegions,
  getBranches as getOrgBranches,
  getOrganizationHierarchy,
  getMarketNames,
  getRegionNamesForMarket,
  getBranchNamesForRegion,
  type OrganizationMarket,
  type OrganizationRegion,
  type OrganizationBranch,
  type OrganizationHierarchy,
  type OrganizationQueryOptions,
} from './organization'

// Field calculators (utility functions)
export * from './field-calculators'

// Lead Service Engine queries (server-side only - imports BigQuery SDK)
export {
  getLeadServiceStageMetrics,
  getLeadServiceHandoffMetrics,
  getLeadServiceHandoffTrend,
  getLeadServicePipelineSummary,
  getLeadServiceAtRiskLeads,
  getLeadServiceHandoffLeads,
  getLeadServiceRiskReasons,
  type LeadServiceQueryOptions,
} from './lead-service'

// Lead Service Engine types & transformers (client-safe - no BigQuery SDK import)
// NOTE: Use './lead-service-transformers' directly in client components
export {
  transformStageMetrics,
  transformHandoffMetrics,
  transformPipelineSummary,
  transformAtRiskLeads,
  transformHandoffLeads,
  transformRiskReasons,
  type BQStageMetricsRow,
  type BQHandoffMetricsRow,
  type BQHandoffTrendRow,
  type BQPipelineSummaryRow,
  type BQAtRiskLeadRow,
  type BQHandoffLeadRow,
  type BQRiskReasonRow,
  type LeadServiceAtRiskLead,
  type HandoffLead,
  type RiskReasonBreakdown,
} from './lead-service-transformers'

// Data Summary queries (admin dashboard)
export {
  getDataSummary,
  getDataSummaryMetrics,
  type DataSummary,
  type DataSummaryMetric,
  type DataSummaryQueryOptions,
} from './summary'

// BCG Analytics queries - BCG_RTD_DB (70 tables, 596M rows)
// Core analytics tables:
// - DR_Leads: 3.3M rows - Lead analytics
// - DR_ContractSales: 3.2M rows - Sales analytics
// - DR_Cancels: 513K rows - Cancellation analytics
// - DR_PNI: 3.8M rows - PNI analytics
// - DR_GLActivity: 3.4M rows - GL/Finance
// Extended tables:
// - DR_Terminations, DR_WorkOrders, DR_TechWorkOrders
// - DR_PortfolioDaily, DR_PortfolioMonthly
// - DR_PayrollBranch, MRLTVSummary, MRLTVConversion
// - DR_BranchWOCompleted, DR_WOSupervisor
export {
  // Core BCG queries
  getBCGLeadAnalytics,
  getBCGSalesAnalytics,
  getBCGCancellationAnalytics,
  getBCGPNIAnalytics,
  getBCGGLActivity,
  getBCGAnalyticsSummary,
  // Extended BCG queries
  getBCGTerminations,
  getBCGWorkOrders,
  getBCGTechWorkOrders,
  getBCGPortfolioDaily,
  getBCGPortfolioMonthly,
  getBCGPayrollBranch,
  getBCGMRLTVSummary,
  getBCGMRLTVConversion,
  getBCGBranchWOCompleted,
  getBCGWOSupervisor,
  // BCG Sales Page queries
  getBCGSalesKPIs,
  getBCGPipelineByStage,
  getBCGRepPerformance,
  getBCGAtRiskLeads,
  getBCGSalesToday,
  getBCGBacklog,
  // Core types
  type BCGLeadAnalytics,
  type BCGSalesAnalytics,
  type BCGCancellationAnalytics,
  type BCGPNIAnalytics,
  type BCGGLActivity,
  type BCGQueryOptions,
  // Extended types
  type BCGTermination,
  type BCGWorkOrder,
  type BCGTechWorkOrder,
  type BCGPortfolioDaily,
  type BCGPortfolioMonthly,
  type BCGPayrollBranch,
  type BCGMRLTVSummary,
  type BCGMRLTVConversion,
  type BCGBranchWOCompleted,
  type BCGWOSupervisor,
} from './bcg-analytics'

// Lead Journey queries - Channel/source tracking with res/comm breakdown
export {
  getLeadJourneyByChannel,
  getLeadJourneyTrends,
  getLeadJourneySummary,
  getLeadGapAnalysis,
  getLeadFunnelByChannel,
  type LeadJourneyByChannel,
  type LeadJourneyTrend,
  type LeadJourneySummary,
  type LeadGapAnalysisRow,
  type LeadFunnelByChannel,
  type LeadJourneyQueryOptions,
} from './lead-journey'

// Organization Workforce queries - Hierarchy with role breakdown
// Combines S2.VwUnf_Branch with S0_TMX.tmx_employee
// Provides Market → Region → Branch breakdown with employee counts by role
export {
  getMarketWorkforce,
  getRegionWorkforce,
  getBranchWorkforce,
  getWorkforceHierarchy,
  getWorkforceMarketNames,
  getWorkforceRegionNames,
  getWorkforceBranchNames,
  type RoleCategory,
  type WorkforceByRole,
  type MarketWorkforce,
  type RegionWorkforce,
  type BranchWorkforce,
  type WorkforceHierarchy,
  type WorkforceQueryOptions as OrgWorkforceQueryOptions,
} from './organization-workforce'

// WIG (Wildly Important Goals) Scorecard queries
// Branch/region-level performance metrics for weekly tracking
export {
  getWIGBranchMetrics,
  getWIGLaggingMetrics,
  getWIGRegionSummary,
  type WIGBranchMetrics,
  type WIGLaggingMetrics,
  type WIGRegionSummary,
  type WIGQueryOptions,
} from './wig'

// Employee lookup queries (SSO auto-role detection)
// Used for matching SSO users to Workday employee records
export {
  getEmployeeByEmail,
  getEmployeeByNumber,
  getEmployeeByName,
  getEmployeesByRole,
  searchEmployees,
  getEmployeeFilterOptions,
  type EmployeeRecord,
  type EmployeeSearchResult,
} from './employee'

// New Starts queries (Sales → Operations handoff tracking)
// Tracks contracts sold but not yet started
export {
  getNewStarts,
  getNewStartsSummary,
  getNewStartsBySalesPerson,
  type NewStartRecord,
  type NewStartsSummary,
  type NewStartsQueryOptions,
} from './new-starts'

// Cross-Functional Dashboard queries
// Aggregates data from multiple sources for unified visibility
export {
  getCrossFunctionalKPIs,
  getDepartmentHealth,
  getCrossFunctionalTrends,
  getCrossFunctionalSummary,
  getCrossFunctionalByMarket,
  getDataQualityDiagnostics,
  type CrossFunctionalKPI,
  type DepartmentHealth,
  type CrossFunctionalTrend,
  type CrossFunctionalSummary,
  type CrossFunctionalQueryOptions,
  type MarketBreakdown,
  type DataQualityDiagnostic,
} from './cross-functional'

// Data Freshness SLA Tracking queries
// Monitors ETL pipeline freshness against SLA targets
export {
  getDataFreshness,
  getSourceFreshness,
  hasCriticalBreaches,
  type DataFreshnessSLA,
  type DataFreshnessSummary,
  type SLAStatus,
  type TrendDirection,
} from './data-freshness'

// Data Quality Monitoring queries
// Real BigQuery metadata tracking: table health, NULL rates, duplicates, quality scores
export {
  getTableHealthMetrics,
  getDataQualityIssuesReal,
  getDataQualityScoreReal,
  getDataSourceHealthReal,
  getDataQualityScorecardDimensions,
  getDataQualityDetails,
  saveDataQualitySnapshot,
  getDataQualityHistoricalTrends,
  getDataQualityPeriodComparisons,
  getDataQualityAlerts,
  type TableHealthMetric,
  type DataQualityIssueReal,
  type DataQualityScoreReal,
  type DataSourceHealthReal,
  type DataQualityQueryOptions,
  type DataQualityScorecardDimension,
  type DataQualityHistoryRecord,
  type DataQualityTrend,
} from './data-quality'

// Sales Tracker queries (Transaction-level tracking)
// Pulls individual transactions from DR_ContractSales for sales tracker dashboard
export {
  getSalesTrackerTransactions,
  getSalesTrackerMonthlyTotals,
  getSalesTrackerDataFreshness,
  type SalesTrackerQueryOptions,
} from './sales-tracker'

// Sold Accounts Full Details (Address + Install + Technician)
// Complete lifecycle tracking from sale to install with full service address
export {
  getSoldAccountsFullDetails,
  getSoldAccountsSummary,
  type SoldAccountFullDetails,
  type SoldAccountQueryOptions,
} from './sold-accounts-full-details'

// Customer Satisfaction (NPS) queries
// S0_TMX.tmx_survey_Qualtrics_V5 (5.7M rows) - Qualtrics CVC surveys
export {
  getNPSScore,
  getSurveyResponses,
  getDetractorAnalysis,
  getBranchNPSComparison,
  type NPSScore,
  type SurveyResponse,
  type DetractorAnalysis,
  type BranchNPSComparison,
  type CustomerSatisfactionQueryOptions,
} from './customer-satisfaction'

// Call Center Performance queries
// S0_TMX.Five9_CallLog_Export (59.8M rows) - Five9 CTI system
export {
  getCallVolume,
  getAgentPerformance,
  getCallOutcomes,
  getHourlyDistribution,
  type CallVolume,
  type AgentPerformance,
  type CallOutcome,
  type HourlyDistribution,
  type CallCenterQueryOptions,
} from './call-center'

// Payroll Analytics queries
// BCG_RTD_DB.BCG_EmployeePayData_NT (9.4M rows) - Payroll data
// SENSITIVE DATA - Restricted to exec, market_vp, region_director only
export {
  getLaborCostAnalysis,
  getOvertimeTrends,
  getRevenuePerLaborDollar,
  getCompensationBenchmarks,
  type LaborCostAnalysis,
  type OvertimeTrend,
  type RevenuePerLaborDollar,
  type CompensationBenchmark,
  type PayrollQueryOptions,
} from './payroll'

// Portfolio Analytics queries
// BCG_RTD_DB.DR_PortfolioDaily, DR_PortfolioMonthly - Customer retention and churn
export {
  getAccountRetention,
  getRevenueChurn,
  getCustomerLifetimeValue,
  getPortfolioGrowth,
  type AccountRetention,
  type RevenueChurn,
  type CustomerLifetimeValue,
  type PortfolioGrowth,
  type PortfolioQueryOptions,
} from './portfolio'

// AI & Data Science Roadmap queries
// __TABLES__ metadata - Zero-cost row counts for AI readiness indicators
export {
  getAIRoadmapDataCounts,
  type AIRoadmapTableCount,
  type AIRoadmapDataCounts,
} from './ai-roadmap'

// Salesforce Discovery queries
// INFORMATION_SCHEMA - Discover and analyze Salesforce-related tables
export {
  discoverSalesforceTables,
  getSalesforceTableSchema,
  getSalesforceTableSample,
  getSalesforceTableQuality,
  type SalesforceTableDiscovery,
  type SalesforceColumnSchema,
  type SalesforceTableSample,
  type SalesforceDiscoveryOptions,
} from './salesforce-discovery'

// Salesforce Data queries (Phase 2A - Tier 1)
// S0.Raw_RTXSF_* - Account, Contact, OpportunityHistory, Employee, Quote, Lead
export {
  getSalesforceAccounts,
  getSalesforceAccountDetail,
  getSalesforceContacts,
  getSalesforceAccountOpportunities,
  getSalesforceOpportunityHistory,
  getSalesforceEmployees,
  getSalesforceQuoteDetail,
  // Quote Builder queries
  getProductCatalog,
  getOpportunityForQuote,
  getLeads,
  getUserMostUsedServices,
  type SalesforceQueryOptions,
  type SalesforceAccount,
  type SalesforceAccountDetail,
  type SalesforceContact,
  type SalesforceOpportunityHistory,
  type SalesforceEmployee,
  type SalesforceQuoteDetail,
  type SalesforceQuoteLineItem,
  // Quote Builder types
  type SalesforceProduct,
  type SalesforceOpportunity,
  type SalesforceLead,
} from './salesforce'

// Platform Health Monitoring queries
// INFORMATION_SCHEMA.JOBS_BY_PROJECT - Real-time platform health metrics
export {
  getPlatformHealthMetrics,
  getFailedJobs,
  getETLJobStats,
  type PlatformHealthMetrics,
  type FailedJob,
} from './platform-health'

// User Adoption Analytics queries
// S0_TMX.tmx_employee + Supabase ops_events - Dashboard usage tracking
export {
  getUserAdoptionMetrics,
  type UserAdoptionMetrics,
} from './user-adoption'

// Anomaly Detection queries
// W3_Contract_Checker.T0_unf_Contract_All - Statistical anomaly detection
export {
  getAnomalyAlerts,
  acknowledgeAnomaly,
  type AnomalyAlert,
  type AnomalySeverity,
} from './anomaly-detection'

// Revenue Forecasting queries
// W3_Contract_Checker.T0_unf_Contract_All - Historical revenue for time series forecasting
export {
  getHistoricalRevenue,
  getRevenueKPIs,
  getForecastMetrics,
  type HistoricalRevenueRow,
  type RevenueKPIs,
  type ForecastMetrics,
} from './forecast'

// Account Details queries
// W3_Contract_Checker, S4, S0_TMX, Reports - Comprehensive account information
export {
  getAccountDetails,
  getAccountOpportunities,
  getAccountServiceHistory,
  getAccountComplaints,
  getAccountInvoices,
  getAccountOwner,
  type AccountDetails,
  type AccountOpportunity,
  type ServiceEvent,
  type AccountComplaint,
  type AccountInvoice,
  type AccountOwner,
} from './accounts'
