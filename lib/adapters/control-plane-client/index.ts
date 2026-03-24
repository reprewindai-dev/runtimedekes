import { env } from '@/lib/env'

export async function validateGovernedRun(input: {
  organizationSlug: string
  queryText: string
  resultCount: number
}) {
  if (!env.controlPlaneBaseUrl || !env.controlPlaneApiKey) {
    return null
  }

  const response = await fetch(new URL('/api/v1/runs', env.controlPlaneBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.controlPlaneApiKey}`,
    },
    body: JSON.stringify({
      input: {
        organizationSlug: input.organizationSlug,
        queryText: input.queryText,
        resultCount: input.resultCount,
      },
      operation: 'dekes.query.run',
      requestCount: 1,
    }),
    signal: AbortSignal.timeout(env.executionTimeoutMs),
  })

  if (!response.ok) {
    throw new Error(`Control plane validation failed with ${response.status}`)
  }

  return (await response.json()) as {
    id?: string
    status?: string
    region?: string
  }
}
