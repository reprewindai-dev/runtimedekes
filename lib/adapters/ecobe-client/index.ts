import { env } from '@/lib/env'

export type EcobeDecision = {
  decisionId: string
  action: string
  selectedRegion?: string | null
  carbonDelta?: number | null
  qualityTier?: string | null
}

async function callRouteEndpoint(path: string, body: Record<string, unknown>) {
  const response = await fetch(new URL(path, env.ecobeBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ecobeApiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(env.executionTimeoutMs),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`ECOBE routing failed with ${response.status}`)
  }

  return (await response.json()) as {
    decisionId?: string
    action?: string
    selectedRegion?: string
    carbonDelta?: number
    qualityTier?: string
  }
}

export async function routeDekesExecution(input: {
  organizationId: string
  source: string
  workloadType: string
}) {
  if (!env.ecobeBaseUrl || !env.ecobeApiKey) {
    return null
  }

  const body = {
    organizationId: input.organizationId,
    source: input.source,
    workloadType: input.workloadType,
    candidateRegions: ['us-east-1', 'us-west-2', 'eu-west-1'],
  }

  const payload =
    (await callRouteEndpoint('/api/v1/route', body)) ??
    (await callRouteEndpoint('/api/v1/dekes/route', body))

  if (!payload) {
    return null
  }

  return {
    decisionId: payload.decisionId ?? `ecobe_${Date.now()}`,
    action: payload.action ?? 'execute',
    selectedRegion: payload.selectedRegion ?? null,
    carbonDelta: payload.carbonDelta ?? null,
    qualityTier: payload.qualityTier ?? null,
  } satisfies EcobeDecision
}
