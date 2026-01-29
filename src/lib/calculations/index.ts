/**
 * Business Calculation Functions
 *
 * Centralized calculation functions to replace magic numbers throughout the application.
 * All calculations are documented with business logic and statistical justifications.
 */

// Finance calculations
export {
  calculateARCollectedMTD,
  calculateARVsTarget,
  calculateARChangeVsLastMonth,
  calculateWeightedDSO,
  getDSOTarget,
  calculateCollectionEfficiency,
  calculateGrossMargin,
  calculateOperatingMargin,
} from './finance'

// Sales calculations
export {
  calculateMedianDaysToInstall,
  calculateBranchStartRate,
  calculateRegionalStartRate,
  distributePNIInspectionsBySource,
  calculateCustomerRating,
  calculateMedianTenure,
  calculateFlowThreshold,
  calculateCancelRateTrend,
} from './sales'
