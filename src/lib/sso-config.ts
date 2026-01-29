/**
 * SSO Provider Configuration
 *
 * Maps email domains to SSO identity providers (Okta, Microsoft Entra ID).
 * Used to route users to the correct SSO provider during login.
 */

export type SSOProviderType = 'azure' | 'okta' | null

export interface SSOProviderConfig {
  name: SSOProviderType
  displayName: string
  icon: string
  domains: string[]
  enabled: boolean
}

/**
 * SSO provider configurations
 *
 * Add new domains here as Rentokil acquires brands or
 * as different divisions onboard to the platform.
 */
export const SSO_PROVIDERS: SSOProviderConfig[] = [
  {
    name: 'azure',
    displayName: 'Microsoft',
    icon: 'microsoft',
    domains: [
      'rentokil.com',
      'terminix.com',
      'ehrlichpest.com',
      'jcehrlich.com',
      'westernpest.com',
      'andersonpestcontrol.com',
      'hometeam.com',
    ],
    enabled: true,
  },
  {
    name: 'okta',
    displayName: 'Okta',
    icon: 'okta',
    domains: [
      'prestox.com',
      'presto-x.com',
    ],
    enabled: true,
  },
]

/**
 * Domains that are allowed to sign up (even without SSO)
 * Used for magic link fallback during testing/dev
 */
export const ALLOWED_EMAIL_DOMAINS = [
  ...SSO_PROVIDERS.flatMap((p) => p.domains),
  // Add any additional allowed domains for dev/testing
]

/**
 * Detect which SSO provider to use based on email domain
 *
 * @param email - User's email address
 * @returns SSO provider config or null if no SSO required
 */
export function detectSSOProvider(email: string): SSOProviderConfig | null {
  if (!email || !email.includes('@')) {
    return null
  }

  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  for (const provider of SSO_PROVIDERS) {
    if (provider.enabled && provider.domains.includes(domain)) {
      return provider
    }
  }

  return null
}

/**
 * Check if an email domain requires SSO authentication
 *
 * @param email - User's email address
 * @returns true if SSO is required for this domain
 */
export function requiresSSO(email: string): boolean {
  return detectSSOProvider(email) !== null
}

/**
 * Check if an email domain is allowed to access the app
 *
 * @param email - User's email address
 * @returns true if the domain is allowed
 */
export function isAllowedDomain(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false
  }

  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false

  return ALLOWED_EMAIL_DOMAINS.includes(domain)
}

/**
 * Get display info for a provider by name
 */
export function getProviderInfo(providerName: string | null): {
  displayName: string
  icon: string
} {
  if (!providerName) {
    return { displayName: 'Email', icon: 'mail' }
  }

  const provider = SSO_PROVIDERS.find((p) => p.name === providerName)
  if (provider) {
    return { displayName: provider.displayName, icon: provider.icon }
  }

  return { displayName: providerName, icon: 'key' }
}

/**
 * Get all enabled SSO providers
 */
export function getEnabledProviders(): SSOProviderConfig[] {
  return SSO_PROVIDERS.filter((p) => p.enabled)
}

/**
 * Get all domains for a specific provider
 */
export function getProviderDomains(providerName: SSOProviderType): string[] {
  const provider = SSO_PROVIDERS.find((p) => p.name === providerName)
  return provider?.domains || []
}
