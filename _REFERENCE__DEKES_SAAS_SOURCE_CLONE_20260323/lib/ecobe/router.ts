import { validateRequest, EcobeRouteRequestSchema, EcobeCompleteRequestSchema } from '../validation/ecobe-schemas'

const ECOBE_BASE = (
  process.env.ECOBE_API_BASE_URL ||
  process.env.ECOBE_ENGINE_URL ||
  'https://ecobe-engineclaude-production.up.railway.app'
).replace(/\/+$/, '')
const ECOBE_INTEGRATION_BASE = `${ECOBE_BASE}/api/v1/integrations/dekes`

function getHeaders(): Record<string, string> {
  const key =
    process.env.DEKES_API_KEY ||
    process.env.ECOBE_API_KEY ||
    process.env.ECOBE_ENGINE_API_KEY

  return {
    'Content-Type': 'application/json',
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  }
}

export type WorkloadType =
  | 'lead_generation_batch'
  | 'enrichment_job'
  | 'intent_classification_batch'
  | 'web_discovery_task'

export type EcobeRouteRequest = {
  organizationId: string
  source: 'DEKES'
  workloadType: WorkloadType
  candidateRegions: string[]
  durationMinutes: number
  delayToleranceMinutes: number
}

export type EcobeRouteAction = 'execute' | 'delay' | 'reroute'

export type EcobeRouteResponse = {
  decisionId: string
  action: EcobeRouteAction
  selectedRegion?: string
  target?: string
  predicted_clean_window?: {
    expected_minutes: number
    region?: string
  }
  carbonDelta?: number
  qualityTier?: string
  policyAction?: string
  timestamp: string
}

export type EcobeCompleteRequest = {
  decision_id: string
  executionRegion: string
  durationMinutes: number
  status: 'success' | 'failed' | 'partial'
}

export async function ecobeRouteWorkload(req: unknown): Promise<EcobeRouteResponse> {
  const validatedRequest = validateRequest(EcobeRouteRequestSchema, req)

  const res = await fetch(`${ECOBE_INTEGRATION_BASE}/route`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(validatedRequest),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ECOBE route failed (${res.status}): ${text}`)
  }

  return (await res.json()) as EcobeRouteResponse
}

export async function ecobeCompleteWorkload(req: unknown): Promise<void> {
  const validatedRequest = validateRequest(EcobeCompleteRequestSchema, req)

  const res = await fetch(`${ECOBE_INTEGRATION_BASE}/workloads/complete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(validatedRequest),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ECOBE complete failed (${res.status}): ${text}`)
  }
}
