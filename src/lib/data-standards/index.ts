/**
 * Data Standards - Barrel Export
 *
 * Central export for all enterprise data standards.
 * These standards define "what level of detail" must be collected
 * and how data should flow through the organization.
 */

// Lead Intake Standards
export {
  type CollectionSource,
  type ValidationRuleType,
  type ValidationRule,
  type LeadIntakeStandard,
  LEAD_INTAKE_STANDARDS,
  getRequiredFields as getRequiredLeadFields,
  getFieldsByCategory as getLeadFieldsByCategory,
  getFieldsByCollectionSource,
  validateLeadData,
  getLeadIntakeStats
} from './lead-intake';

// Start Packet Requirements
export {
  type StartPacketSection,
  type StartPacketRequirement,
  START_PACKET_REQUIREMENTS,
  getRequirementsBySection,
  getRequiredFields as getRequiredStartPacketFields,
  getSalesResponsibilityFields,
  getOpsResponsibilityFields,
  getSectionDisplayName,
  getAllSections,
  getStartPacketStats,
  validateStartPacketData
} from './start-packet-requirements';

// At-Risk Definitions
export {
  type AtRiskCategory,
  type AtRiskSeverity,
  type AtRiskOwner,
  type AtRiskDefinition,
  AT_RISK_DEFINITIONS,
  getRisksByCategory,
  getRisksBySeverity,
  getRisksByOwner,
  getCriticalRisks,
  getAutomatedAlerts,
  getCategoryDisplayName as getAtRiskCategoryDisplayName,
  getSeverityColor,
  getAtRiskStats,
  getRiskById,
  getAllCategories as getAllAtRiskCategories
} from './at-risk-definitions';

// Lead Source Classifications
export {
  type LeadChannel,
  type LeadSourceType,
  type LeadSourceClassification,
  LEAD_SOURCE_CLASSIFICATIONS,
  getSourceByType,
  getSourcesByChannel,
  getHighConversionSources,
  getLowCostSources,
  getChannelDisplayName,
  getLeadSourceStats,
  getAllChannels,
  getSourceById,
  getAttributionRulesForSource
} from './lead-source-classifications';

// =============================================================================
// AGGREGATE STATISTICS
// =============================================================================

export function getAllDataStandardsStats() {
  const leadIntake = getLeadIntakeStats();
  const startPacket = getStartPacketStats();
  const atRisk = getAtRiskStats();
  const leadSources = getLeadSourceStats();

  return {
    totalStandards:
      leadIntake.total +
      startPacket.total +
      atRisk.total +
      leadSources.total,
    leadIntake,
    startPacket,
    atRisk,
    leadSources,
    summary: {
      leadIntakeFields: leadIntake.total,
      leadIntakeRequired: leadIntake.required,
      startPacketFields: startPacket.total,
      startPacketRequired: startPacket.required,
      atRiskDefinitions: atRisk.total,
      criticalRisks: atRisk.bySeverity.critical || 0,
      leadSourceTypes: leadSources.total
    }
  };
}

// Import functions for re-export
import { getLeadIntakeStats } from './lead-intake';
import { getStartPacketStats } from './start-packet-requirements';
import { getAtRiskStats } from './at-risk-definitions';
import { getLeadSourceStats } from './lead-source-classifications';
