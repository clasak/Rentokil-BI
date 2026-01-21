/**
 * Admin configuration - centralized list of admin emails
 * Used across middleware, onboarding, admin page, and sidebar
 */

// Admin emails that have elevated privileges:
// - Skip onboarding (auto-assigned exec role)
// - Access to /admin page
// - See admin link in sidebar
export const ADMIN_EMAILS = [
  'cody.lytle@rentokil.com',
  'cody.lytle@prestox.com',
] as const

/**
 * Check if an email belongs to an admin user
 * @param email - The email to check (case-insensitive)
 * @returns true if the email is in the admin list
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase() as typeof ADMIN_EMAILS[number])
}
