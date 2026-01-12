/**
 * Feedback Types for Sophia Agent
 *
 * Enhanced feedback system for alpha testing with structured types,
 * severity levels, status workflow, and resolution tracking.
 */

// ==============================================
// Feedback Classification Types
// ==============================================

export type FeedbackType =
  | 'bug'           // Something is broken
  | 'ui_ux'         // Visual/usability issues
  | 'feature'       // Feature request
  | 'performance'   // Speed/loading issues
  | 'data'          // Data accuracy/calculation issues
  | 'idea'          // General improvement ideas
  | 'documentation' // Help/docs issues

export type FeedbackSeverity = 'critical' | 'high' | 'medium' | 'low'

export type FeedbackStatus =
  | 'new'           // Just submitted
  | 'acknowledged'  // Sophia has seen it
  | 'investigating' // Being looked into
  | 'triaged'       // Prioritized and categorized
  | 'in_progress'   // Work started
  | 'blocked'       // Waiting on something
  | 'resolved'      // Fix implemented
  | 'closed'        // Verified and closed
  | 'wont_fix'      // Declined with reason

export type ResolutionType =
  | 'fixed'             // Issue was fixed
  | 'wont_fix'          // Intentional decision not to fix
  | 'duplicate'         // Already reported
  | 'cannot_reproduce'  // Could not reproduce the issue
  | 'by_design'         // Working as intended

// ==============================================
// Feedback Data Interfaces
// ==============================================

/**
 * Full feedback submission record (from database)
 */
export interface FeedbackSubmission {
  id: string
  submitter_id: string | null
  submitter_name: string | null
  submitter_email: string | null
  submitter_role: string | null
  submitter_department: string | null
  feedback_type: FeedbackType
  severity: FeedbackSeverity
  status: FeedbackStatus
  title: string
  description: string
  steps_to_reproduce: string | null
  page_url: string
  component_path: string | null
  screenshot_urls: string[] | null
  assigned_to: string | null
  resolution_notes: string | null
  resolution_type: ResolutionType | null
  incident_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  acknowledged_at: string | null
  resolved_at: string | null
}

/**
 * Input for creating new feedback (from frontend)
 */
export interface CreateFeedbackInput {
  feedback_type: FeedbackType
  severity?: FeedbackSeverity
  title: string
  description: string
  steps_to_reproduce?: string
  page_url: string
  component_path?: string
  screenshot_urls?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Input for updating feedback status (admin/Sophia)
 */
export interface UpdateFeedbackInput {
  status?: FeedbackStatus
  severity?: FeedbackSeverity
  assigned_to?: string
  resolution_notes?: string
  resolution_type?: ResolutionType
  incident_id?: string
}

/**
 * Feedback stats for dashboard
 */
export interface FeedbackStats {
  total_count: number
  new_count: number
  in_progress_count: number
  resolved_count: number
  critical_count: number
  high_count: number
  avg_resolution_hours: number | null
}

// ==============================================
// UI Helper Types
// ==============================================

/**
 * Feedback type configuration for UI
 */
export interface FeedbackTypeConfig {
  type: FeedbackType
  label: string
  description: string
  icon: string
  color: string
  showSeverity: boolean
  showStepsToReproduce: boolean
}

/**
 * Predefined feedback type configurations
 */
export const FEEDBACK_TYPE_CONFIGS: FeedbackTypeConfig[] = [
  {
    type: 'bug',
    label: 'Bug Report',
    description: 'Something is broken or not working correctly',
    icon: '🐛',
    color: 'orange',
    showSeverity: true,
    showStepsToReproduce: true,
  },
  {
    type: 'ui_ux',
    label: 'UI/UX Issue',
    description: 'Visual or usability problems',
    icon: '🎨',
    color: 'purple',
    showSeverity: true,
    showStepsToReproduce: false,
  },
  {
    type: 'feature',
    label: 'Feature Request',
    description: 'Request a new feature or capability',
    icon: '✨',
    color: 'green',
    showSeverity: false,
    showStepsToReproduce: false,
  },
  {
    type: 'performance',
    label: 'Performance Issue',
    description: 'Slow loading or responsiveness problems',
    icon: '⚡',
    color: 'red',
    showSeverity: true,
    showStepsToReproduce: true,
  },
  {
    type: 'data',
    label: 'Data Issue',
    description: 'Incorrect calculations or data accuracy',
    icon: '📊',
    color: 'blue',
    showSeverity: true,
    showStepsToReproduce: true,
  },
  {
    type: 'idea',
    label: 'Idea / Suggestion',
    description: 'General improvement or enhancement idea',
    icon: '💡',
    color: 'yellow',
    showSeverity: false,
    showStepsToReproduce: false,
  },
  {
    type: 'documentation',
    label: 'Documentation',
    description: 'Help text, tooltips, or documentation issues',
    icon: '📚',
    color: 'gray',
    showSeverity: false,
    showStepsToReproduce: false,
  },
]

/**
 * Severity configuration for UI
 */
export interface SeverityConfig {
  severity: FeedbackSeverity
  label: string
  description: string
  color: string
}

export const SEVERITY_CONFIGS: SeverityConfig[] = [
  {
    severity: 'critical',
    label: 'Critical',
    description: 'Blocks my work entirely',
    color: 'red',
  },
  {
    severity: 'high',
    label: 'High',
    description: 'Significant impact on my work',
    color: 'orange',
  },
  {
    severity: 'medium',
    label: 'Medium',
    description: 'Noticeable but I can work around it',
    color: 'yellow',
  },
  {
    severity: 'low',
    label: 'Low',
    description: 'Minor inconvenience',
    color: 'green',
  },
]

/**
 * Status configuration for UI
 */
export interface StatusConfig {
  status: FeedbackStatus
  label: string
  color: string
  isOpen: boolean
}

export const STATUS_CONFIGS: StatusConfig[] = [
  { status: 'new', label: 'New', color: 'blue', isOpen: true },
  { status: 'acknowledged', label: 'Acknowledged', color: 'cyan', isOpen: true },
  { status: 'investigating', label: 'Investigating', color: 'purple', isOpen: true },
  { status: 'triaged', label: 'Triaged', color: 'indigo', isOpen: true },
  { status: 'in_progress', label: 'In Progress', color: 'yellow', isOpen: true },
  { status: 'blocked', label: 'Blocked', color: 'orange', isOpen: true },
  { status: 'resolved', label: 'Resolved', color: 'green', isOpen: false },
  { status: 'closed', label: 'Closed', color: 'gray', isOpen: false },
  { status: 'wont_fix', label: "Won't Fix", color: 'slate', isOpen: false },
]

// ==============================================
// Helper Functions
// ==============================================

/**
 * Get configuration for a feedback type
 */
export function getFeedbackTypeConfig(type: FeedbackType): FeedbackTypeConfig | undefined {
  return FEEDBACK_TYPE_CONFIGS.find((config) => config.type === type)
}

/**
 * Get configuration for a severity level
 */
export function getSeverityConfig(severity: FeedbackSeverity): SeverityConfig | undefined {
  return SEVERITY_CONFIGS.find((config) => config.severity === severity)
}

/**
 * Get configuration for a status
 */
export function getStatusConfig(status: FeedbackStatus): StatusConfig | undefined {
  return STATUS_CONFIGS.find((config) => config.status === status)
}

/**
 * Check if feedback type requires severity selection
 */
export function requiresSeverity(type: FeedbackType): boolean {
  const config = getFeedbackTypeConfig(type)
  return config?.showSeverity ?? false
}

/**
 * Check if feedback type requires steps to reproduce
 */
export function requiresStepsToReproduce(type: FeedbackType): boolean {
  const config = getFeedbackTypeConfig(type)
  return config?.showStepsToReproduce ?? false
}
