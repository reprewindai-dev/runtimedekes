import { URLSearchParams } from 'node:url'

export type ApifyOrganicResult = {
  position?: number
  title?: string
  url?: string
  displayedUrl?: string
  description?: string
  date?: string
  type?: string
  source?: string
}

export type ApifySearchOptions = {
  query: string
  location?: string
  gl?: string
  hl?: string
  num?: number
}

const APIFY_ENDPOINT = process.env.APIFY_API_URL || 'https://api.apify.com/v2/acts/apify~google-search-results/run-sync-get-dataset-items'
const DEFAULT_LOCATION = process.env.APIFY_LOCATION || undefined
const DEFAULT_GL = process.env.APIFY_GL || undefined
const DEFAULT_HL = process.env.APIFY_HL || undefined
const DEFAULT_NUM = Number(process.env.APIFY_NUM || '10')

export async function fetchApifyOrganicResults(
  options: ApifySearchOptions
): Promise<ApifyOrganicResult[]> {
  const apiKey = process.env.APIFY_TOKEN
  if (!apiKey) {
    throw new Error('Missing APIFY_TOKEN environment variable')
  }

  const params = new URLSearchParams({
    queries: options.query,
    maxResults: String(options.num || DEFAULT_NUM),
    gl: options.gl || DEFAULT_GL || 'us',
    hl: options.hl || DEFAULT_HL || 'en',
    location: options.location || DEFAULT_LOCATION || 'United States',
  })

  const res = await fetch(`${APIFY_ENDPOINT}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const details = await res.text().catch(() => '')
    throw new Error(`Apify request failed (${res.status}): ${details}`)
  }

  const payload = (await res.json()) as any[]
  
  // Transform Apify results to match SerpApi format
  return payload.map((item, index) => ({
    position: index + 1,
    title: item.title,
    link: item.url,
    displayed_link: item.displayedUrl,
    snippet: item.description,
    date: item.date,
    type: item.type,
    source: 'apify_google',
  }))
}
