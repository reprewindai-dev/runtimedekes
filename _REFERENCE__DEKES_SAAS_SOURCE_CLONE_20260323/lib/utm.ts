export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export interface UTMData extends UTMParams {
  captured_at?: string
}

const UTM_STORAGE_KEY = 'dekes_utm_data'
const MAX_UTM_LENGTH = 255

/**
 * Extract UTM parameters from current URL
 */
export function extractUTMFromURL(): UTMParams {
  if (typeof window === 'undefined') {
    return {}
  }

  const urlParams = new URLSearchParams(window.location.search)
  
  return {
    utm_source: sanitizeUTM(urlParams.get('utm_source')),
    utm_medium: sanitizeUTM(urlParams.get('utm_medium')),
    utm_campaign: sanitizeUTM(urlParams.get('utm_campaign')),
    utm_term: sanitizeUTM(urlParams.get('utm_term')),
    utm_content: sanitizeUTM(urlParams.get('utm_content')),
  }
}

/**
 * Get UTM parameters with environment fallback
 */
export function getUTMWithFallback(): UTMData {
  // First try to get from URL
  const urlUTM = extractUTMFromURL()
  const hasURLUTM = Object.values(urlUTM).some(value => value && value.length > 0)

  if (hasURLUTM) {
    // Store URL UTM data for persistence
    const utmData: UTMData = {
      ...urlUTM,
      captured_at: new Date().toISOString(),
    }
    storeUTMData(utmData)
    return utmData
  }

  // Fall back to stored data
  const storedUTM = getStoredUTMData()
  if (storedUTM) {
    return storedUTM
  }

  // Fall back to environment defaults
  return getEnvironmentUTM()
}

/**
 * Get environment default UTM values
 */
export function getEnvironmentUTM(): UTMData {
  return {
    utm_source: sanitizeUTM(process.env.NEXT_PUBLIC_UTM_SOURCE),
    utm_medium: sanitizeUTM(process.env.NEXT_PUBLIC_UTM_MEDIUM),
    utm_campaign: sanitizeUTM(process.env.NEXT_PUBLIC_UTM_CAMPAIGN),
    utm_term: sanitizeUTM(process.env.NEXT_PUBLIC_UTM_TERM),
    utm_content: sanitizeUTM(process.env.NEXT_PUBLIC_UTM_CONTENT),
  }
}

/**
 * Store UTM data in localStorage
 */
export function storeUTMData(utmData: UTMData): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData))
  } catch (error) {
    console.warn('Failed to store UTM data:', error)
  }
}

/**
 * Get stored UTM data from localStorage
 */
export function getStoredUTMData(): UTMData | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.warn('Failed to retrieve UTM data:', error)
    return null
  }
}

/**
 * Clear stored UTM data
 */
export function clearStoredUTMData(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(UTM_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear UTM data:', error)
  }
}

/**
 * Sanitize UTM parameter values
 */
function sanitizeUTM(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  // Trim whitespace
  let sanitized = value.trim()
  
  // Remove potential script injections
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Limit length
  if (sanitized.length > MAX_UTM_LENGTH) {
    sanitized = sanitized.substring(0, MAX_UTM_LENGTH)
  }
  
  return sanitized || undefined
}

/**
 * Merge UTM data with priority: URL > stored > environment
 */
export function mergeUTMData(urlUTM?: UTMParams, storedUTM?: UTMData | null, envUTM?: UTMData): UTMData {
  const result: UTMData = {}

  // Helper to get value with priority
  const getValue = (urlValue?: string, storedValue?: string, envValue?: string): string | undefined => {
    return urlValue || storedValue || envValue
  }

  result.utm_source = getValue(urlUTM?.utm_source, storedUTM?.utm_source, envUTM?.utm_source)
  result.utm_medium = getValue(urlUTM?.utm_medium, storedUTM?.utm_medium, envUTM?.utm_medium)
  result.utm_campaign = getValue(urlUTM?.utm_campaign, storedUTM?.utm_campaign, envUTM?.utm_campaign)
  result.utm_term = getValue(urlUTM?.utm_term, storedUTM?.utm_term, envUTM?.utm_term)
  result.utm_content = getValue(urlUTM?.utm_content, storedUTM?.utm_content, envUTM?.utm_content)

  // Preserve capture timestamp if we have stored data
  if (storedUTM?.captured_at) {
    result.captured_at = storedUTM.captured_at
  } else {
    result.captured_at = new Date().toISOString()
  }

  return result
}

/**
 * Check if UTM data has any values
 */
export function hasUTMData(utmData?: UTMData): boolean {
  if (!utmData) {
    return false
  }

  return Object.values(utmData).some(value => value && value.length > 0 && value !== 'captured_at')
}

/**
 * Format UTM data for display
 */
export function formatUTMForDisplay(utmData: UTMData): Record<string, string> {
  const display: Record<string, string> = {}

  if (utmData.utm_source) display.Source = utmData.utm_source
  if (utmData.utm_medium) display.Medium = utmData.utm_medium
  if (utmData.utm_campaign) display.Campaign = utmData.utm_campaign
  if (utmData.utm_term) display.Term = utmData.utm_term
  if (utmData.utm_content) display.Content = utmData.utm_content

  return display
}
