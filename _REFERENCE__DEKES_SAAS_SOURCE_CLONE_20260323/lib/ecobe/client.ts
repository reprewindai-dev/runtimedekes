import {
  validateRequest,
  EcobeOptimizeRequestSchema,
  EcobeReportCarbonUsageRequestSchema,
  EcobeProspectPayloadSchema,
  EcobeTenantPayloadSchema,
  EcobeDemoPayloadSchema,
} from '../validation/ecobe-schemas'
import { isValidEcobeResponse, isValidEcobeStats, safeTypeAssertion } from '../utils/type-guards'
import { createApiError, createNetworkError, classifyError, logError } from '../error/error-handler'

const LEGACY_DEFAULT_BASE = 'http://localhost:3000'
const MODERN_DEFAULT_BASE = 'https://ecobe-engineclaude-production.up.railway.app'
const INTEGRATION_BASE_PATH = '/api/v1/integrations/dekes'

export type EcobeOptimizeRequest = {
  query: {
    id: string
    query: string
    estimatedResults: number
  }
  carbonBudget: number
  regions: string[]
}

export type EcobeOptimizeResponse = {
  selectedRegion: string
  estimatedCO2?: number
  scheduledTime?: string
  [key: string]: unknown
}

export type EcobeReportCarbonUsageRequest = {
  queryId: string
  actualCO2: number
}

export type EcobeAnalyticsResponse = {
  totalWorkloads: number
  totalCO2Saved: number
  averageCarbonIntensity: number
  workloads: Array<{
    id: string
    queryString: string
    selectedRegion: string
    actualCO2: number
    status: string
    createdAt: string
  }>
}

export type EcobeProspectPayload = {
  organization: {
    name: string
    domain?: string | null
    sizeLabel?: string | null
    region?: string | null
  }
  intent: {
    score: number
    reason: string
    keywords: string[]
  }
  contact?: {
    name?: string | null
    email?: string | null
    linkedin?: string | null
  }
  source: {
    leadId: string
    queryId?: string | null
    runId?: string | null
  }
}

export type EcobeTenantPayload = {
  organizationName: string
  externalOrgId: string
  ownerEmail: string
  plan?: string
}

export type EcobeDemoPayload = {
  organizationName: string
  contactEmail: string
  workloadSummary: string
  priority?: 'low' | 'medium' | 'high'
  metadata?: Record<string, unknown>
}

export type EcobeHandoffStatusResponse = {
  status: string
  externalLeadId?: string
  externalOrgId?: string
  convertedAt?: string
  notes?: string
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function getLegacyBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.ECOBE_ENGINE_BASE_URL || process.env.ECOBE_ENGINE_URL || LEGACY_DEFAULT_BASE
  )
}

function getSharedApiKey(): string {
  const key =
    process.env.DEKES_API_KEY ||
    process.env.ECOBE_API_KEY ||
    process.env.ECOBE_ENGINE_API_KEY

  if (!key) {
    throw new Error('Missing DEKES_API_KEY, ECOBE_API_KEY, or ECOBE_ENGINE_API_KEY')
  }

  return key
}

function getLegacyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  try {
    headers.Authorization = `Bearer ${getSharedApiKey()}`
  } catch {
    // Keep legacy calls unauthenticated in local-only setups.
  }

  return headers
}

function getModernBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.ECOBE_API_BASE_URL || process.env.ECOBE_ENGINE_URL || MODERN_DEFAULT_BASE
  )
}

function getModernApiKey(): string {
  return getSharedApiKey()
}

async function callModernApi<T = any>(path: string, init: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${getModernBaseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getModernApiKey()}`,
        ...(init.headers || {}),
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const error = createApiError(res.status, `ECOBE API ${path} failed (${res.status}): ${text}`)
      logError(error, { path, method: init.method })
      throw error
    }

    if (res.status === 204) {
      return undefined as T
    }

    const json = await res.json()
    const validatedResponse = safeTypeAssertion(
      json,
      isValidEcobeResponse,
      'Invalid ECOBE API response format'
    )

    return validatedResponse as T
  } catch (error) {
    if (error instanceof Error && error.name === 'StandardError') {
      throw error
    }

    const standardError =
      error instanceof Error && error.message.includes('fetch')
        ? createNetworkError(`Failed to connect to ECOBE API: ${error.message}`, { path })
        : classifyError(error)

    logError(standardError, { path, method: init.method })
    throw standardError
  }
}

function getOptimizeUrl(): string {
  if (process.env.ECOBE_OPTIMIZE_URL) return normalizeBaseUrl(process.env.ECOBE_OPTIMIZE_URL)
  return `${getLegacyBaseUrl()}/api/v1/dekes/optimize`
}

function getReportUrl(): string {
  const direct = process.env.ECOBE_REPORT_URL
  if (direct) return normalizeBaseUrl(direct)
  return `${getLegacyBaseUrl()}/api/v1/dekes/report`
}

function getAnalyticsUrl(): string {
  const direct = process.env.ECOBE_ANALYTICS_URL
  if (direct) return normalizeBaseUrl(direct)
  return `${getLegacyBaseUrl()}/api/v1/dekes/analytics`
}

export async function ecobeOptimizeQuery(request: unknown): Promise<EcobeOptimizeResponse> {
  try {
    const validatedRequest = validateRequest(EcobeOptimizeRequestSchema, request)

    const res = await fetch(getOptimizeUrl(), {
      method: 'POST',
      headers: getLegacyHeaders(),
      body: JSON.stringify(validatedRequest),
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const error = createApiError(res.status, `ECOBE optimize failed (${res.status}): ${text}`)
      logError(error, { endpoint: 'optimize' })
      throw error
    }

    return (await res.json()) as EcobeOptimizeResponse
  } catch (error) {
    if (error instanceof Error && error.name === 'StandardError') {
      throw error
    }

    const standardError = classifyError(error)
    logError(standardError, { endpoint: 'optimize' })
    throw standardError
  }
}

export async function ecobeReportCarbonUsage(request: unknown): Promise<void> {
  const validatedRequest = validateRequest(EcobeReportCarbonUsageRequestSchema, request)

  const res = await fetch(getReportUrl(), {
    method: 'POST',
    headers: getLegacyHeaders(),
    body: JSON.stringify(validatedRequest),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ECOBE report failed (${res.status}): ${text}`)
  }
}

export async function ecobeFetchAnalytics(): Promise<EcobeAnalyticsResponse> {
  const res = await fetch(getAnalyticsUrl(), {
    method: 'GET',
    headers: getLegacyHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ECOBE analytics failed (${res.status}): ${text}`)
  }

  const json = await res.json()

  if (!isValidEcobeStats(json)) {
    throw new Error('Invalid analytics response format from ECOBE API')
  }

  return json as EcobeAnalyticsResponse
}

export async function createEcobeProspect(payload: unknown) {
  const validatedPayload = validateRequest(EcobeProspectPayloadSchema, payload)

  return callModernApi<{ id: string; status: string; externalLeadId?: string }>(
    `${INTEGRATION_BASE_PATH}/prospects`,
    {
      method: 'POST',
      body: JSON.stringify(validatedPayload),
    }
  )
}

export async function createEcobeTenant(payload: unknown) {
  const validatedPayload = validateRequest(EcobeTenantPayloadSchema, payload)

  return callModernApi<{ id: string; status: string; externalOrgId?: string }>(
    `${INTEGRATION_BASE_PATH}/tenants`,
    {
      method: 'POST',
      body: JSON.stringify(validatedPayload),
    }
  )
}

export async function triggerEcobeDemo(payload: unknown) {
  const validatedPayload = validateRequest(EcobeDemoPayloadSchema, payload)

  return callModernApi<{ id: string; status: string }>(`${INTEGRATION_BASE_PATH}/demos`, {
    method: 'POST',
    body: JSON.stringify(validatedPayload),
  })
}

export async function getEcobeHandoffStatus(externalId: string) {
  return callModernApi<EcobeHandoffStatusResponse>(`${INTEGRATION_BASE_PATH}/handoffs/${externalId}`, {
    method: 'GET',
  })
}
