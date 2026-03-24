import { URLSearchParams } from 'node:url'

export type SerpApiOrganicResult = {
  position?: number
  title?: string
  link?: string
  displayed_link?: string
  snippet?: string
  date?: string
  type?: string
  source?: string
}

export type SerpApiSearchOptions = {
  query: string
  location?: string
  gl?: string
  hl?: string
  num?: number
}

const SERPAPI_ENDPOINT = process.env.SERPAPI_API_URL || 'https://serpapi.com/search.json'
const DEFAULT_LOCATION = process.env.SERPAPI_LOCATION || undefined
const DEFAULT_GL = process.env.SERPAPI_GL || 'us'
const DEFAULT_HL = process.env.SERPAPI_HL || 'en'
const DEFAULT_NUM = Number(process.env.SERPAPI_NUM || '20')

export async function fetchSerpOrganicResults(
  options: SerpApiSearchOptions
): Promise<SerpApiOrganicResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    throw new Error('Missing SERPAPI_API_KEY environment variable')
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google',
    q: options.query,
    location: options.location || DEFAULT_LOCATION || '',
    gl: options.gl || DEFAULT_GL || '',
    hl: options.hl || DEFAULT_HL || '',
    num: String(options.num || DEFAULT_NUM),
  })

  const res = await fetch(`${SERPAPI_ENDPOINT}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const details = await res.text().catch(() => '')
    throw new Error(`SerpAPI request failed (${res.status}): ${details}`)
  }

  const payload = (await res.json()) as { organic_results?: SerpApiOrganicResult[] }
  return payload.organic_results || []
}
