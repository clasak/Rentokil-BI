/**
 * Input validation for BigQuery query parameters
 * Prevents SQL injection by validating user-supplied filter values
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate organization codes (market, region, branch)
 */
export function validateOrgCode(
  code: string | undefined,
  type: 'market' | 'region' | 'branch'
): string | undefined {
  // Explicitly check for undefined/null (allow empty string to be caught later)
  if (code === undefined || code === null) return undefined

  // Remove whitespace
  const trimmed = code.trim()

  // Reject empty string after trim
  if (trimmed.length === 0) {
    throw new ValidationError(`Invalid ${type} code: empty string not allowed`)
  }

  const patterns = {
    market: /^[A-Z0-9]{2,10}$/,      // Alphanumeric market codes (e.g., M536, 2941, NE, SW)
    region: /^[A-Z0-9]{2,10}$/,      // Alphanumeric region codes
    branch: /^\d{3,4}$/,              // 3-4 digit branch codes
  }

  if (!patterns[type].test(trimmed)) {
    throw new ValidationError(`Invalid ${type} code: "${code}". Expected pattern: ${patterns[type]}`)
  }

  return trimmed
}

/**
 * Validate numeric parameters (daysBack, limit)
 */
export function validateNumeric(
  value: number | undefined,
  paramName: string,
  min: number = 0,
  max: number = 10000
): number | undefined {
  if (value === undefined) return undefined

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`Invalid ${paramName}: ${value}. Must be integer between ${min} and ${max}`)
  }

  return value
}

/**
 * Validate string parameters (salesPerson, employeeId)
 * Allows alphanumeric, spaces, hyphens, underscores, periods, apostrophes
 */
export function validateString(
  value: string | undefined,
  paramName: string,
  maxLength: number = 100
): string | undefined {
  if (!value) return undefined

  // Type guard: ensure value is actually a string (return undefined if not, don't throw)
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  // Return undefined for empty string after trim
  if (trimmed.length === 0) return undefined

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${paramName} too long: ${trimmed.length} chars (max ${maxLength})`)
  }

  // Allow alphanumeric, spaces, hyphens, underscores, periods, apostrophes
  if (!/^[a-zA-Z0-9\s\-_.\']+$/.test(trimmed)) {
    throw new ValidationError(`Invalid ${paramName}: "${value}". Contains disallowed characters`)
  }

  return trimmed
}

/**
 * Validate date strings (YYYY-MM-DD format)
 */
export function validateDateString(
  value: string | undefined,
  paramName: string
): string | undefined {
  if (!value) return undefined

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`Invalid ${paramName}: "${value}". Expected YYYY-MM-DD format`)
  }

  // Validate date components separately to catch invalid dates like 2024-02-30
  const [yearStr, monthStr, dayStr] = value.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)

  // Validate month
  if (month < 1 || month > 12) {
    throw new ValidationError(`Invalid ${paramName}: "${value}" - month must be 1-12`)
  }

  // Validate day based on month
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) {
    throw new ValidationError(`Invalid ${paramName}: "${value}" - day must be 1-${daysInMonth} for month ${month}`)
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid ${paramName}: "${value}" is not a valid date`)
  }

  return value
}

/**
 * Validate email address format
 *
 * Uses RFC 5321 compliant length limits to prevent ReDoS:
 * - Local part (before @): max 64 characters
 * - Domain part: max 253 characters
 * - Top-level domain: 2-24 characters
 *
 * @param email - Email address to validate
 * @returns Validated and normalized email (lowercase) or undefined
 * @throws ValidationError if email format is invalid
 */
export function validateEmail(email: string | undefined): string | undefined {
  if (!email) return undefined

  const trimmed = email.trim()

  // Quick length check (RFC 5321 max: 320 chars total)
  if (trimmed.length > 320) {
    throw new ValidationError(`Email too long: ${trimmed.length} chars (max 320)`)
  }

  // Safe regex with bounded quantifiers (prevents ReDoS)
  // Local part: 1-64 chars
  // @ symbol: required
  // Domain: 1-253 chars (labels separated by dots)
  // TLD: 2-24 chars (handles new gTLDs like .photography)
  const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,24}$/

  if (!emailRegex.test(trimmed)) {
    throw new ValidationError(
      `Invalid email: "${email}". Must be a valid email address (e.g., user@example.com)`
    )
  }

  // Additional validation: check for consecutive dots (not allowed)
  if (trimmed.includes('..')) {
    throw new ValidationError(`Invalid email: "${email}". Cannot contain consecutive dots`)
  }

  // Additional validation: check for leading/trailing dots in local part
  const [localPart, domainPart] = trimmed.split('@')
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    throw new ValidationError(`Invalid email: "${email}". Local part cannot start or end with a dot`)
  }

  // Additional validation: RFC 5321 length limits
  if (localPart.length > 64) {
    throw new ValidationError(`Invalid email: "${email}". Local part exceeds 64 characters`)
  }
  if (domainPart.length > 253) {
    throw new ValidationError(`Invalid email: "${email}". Domain part exceeds 253 characters`)
  }

  // Additional validation: check for leading/trailing hyphens in domain
  const domainLabels = domainPart.split('.')
  for (const label of domainLabels) {
    if (label.startsWith('-') || label.endsWith('-')) {
      throw new ValidationError(`Invalid email: "${email}". Domain labels cannot start or end with hyphens`)
    }
  }

  // Return normalized (lowercase) email
  return trimmed.toLowerCase()
}

/**
 * Validate year-month format (YYYY-MM)
 */
export function validateYearMonth(
  value: string | undefined,
  paramName: string
): string | undefined {
  if (!value) return undefined

  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new ValidationError(`Invalid ${paramName}: "${value}". Expected YYYY-MM format`)
  }

  const [year, month] = value.split('-').map(Number)
  if (year < 2020 || year > 2100 || month < 1 || month > 12) {
    throw new ValidationError(`Invalid ${paramName}: "${value}". Year must be 2020-2100, month 1-12`)
  }

  return value
}

/**
 * Validate date range (startDate must be before endDate)
 */
export function validateDateRange(
  startDate: string | undefined,
  endDate: string | undefined
): { startDate?: string; endDate?: string } {
  const validatedStart = validateDateString(startDate, 'startDate')
  const validatedEnd = validateDateString(endDate, 'endDate')

  if (validatedStart && validatedEnd && validatedStart > validatedEnd) {
    throw new ValidationError('startDate must be before endDate')
  }

  return { startDate: validatedStart, endDate: validatedEnd }
}

/**
 * Validate KPI slug (alphanumeric with hyphens)
 */
export function validateSlug(
  value: string | undefined,
  paramName: string = 'slug'
): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    throw new ValidationError(`Invalid ${paramName}: "${value}". Must be lowercase alphanumeric with hyphens`)
  }

  if (trimmed.length > 100) {
    throw new ValidationError(`${paramName} too long: ${trimmed.length} chars (max 100)`)
  }

  return trimmed
}

/**
 * Validate array of strings (e.g., multiple branch codes)
 */
export function validateStringArray(
  values: string[] | undefined,
  paramName: string,
  maxLength: number = 100
): string[] | undefined {
  if (!values || values.length === 0) return undefined

  if (values.length > maxLength) {
    throw new ValidationError(`${paramName} array too large: ${values.length} items (max ${maxLength})`)
  }

  return values.map(value => {
    const validated = validateString(value, paramName)
    if (!validated) {
      throw new ValidationError(`${paramName} contains empty value`)
    }
    return validated
  })
}

/**
 * Validate department name
 */
export function validateDepartment(
  value: string | undefined
): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  const allowedDepartments = [
    'Sales',
    'Operations',
    'Finance',
    'HR',
    'IT',
    'Customer Service',
    'Marketing',
    'Executive'
  ]

  if (!allowedDepartments.includes(trimmed)) {
    throw new ValidationError(`Invalid department: "${value}". Must be one of: ${allowedDepartments.join(', ')}`)
  }

  return trimmed
}

/**
 * Sanitize SQL LIKE pattern (escape special characters)
 */
export function sanitizeLikePattern(value: string | undefined): string | undefined {
  if (!value) return undefined

  // Escape SQL LIKE wildcards and special characters
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/'/g, "''")
}
