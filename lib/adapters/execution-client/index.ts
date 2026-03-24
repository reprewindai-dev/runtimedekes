import { env, isSearchConfigured } from '@/lib/env'
import { canonicalizeUrl } from '@/lib/utils'
import { buildSearchQueryVariants } from '@/lib/adapters/execution-client/query-expansion'

export type SearchResult = {
  title: string
  url: string
  snippet: string
  matchedQueries?: string[]
  hitCount?: number
}

type SearchInput = {
  query: string
  market?: string
}

type EvidenceIntent = 'funding' | 'content' | 'evaluation'

function resolveMarket(input = 'en-US') {
  const [language, country] = input.split('-')
  return {
    language: language?.toLowerCase() ?? 'en',
    country: country?.toUpperCase() ?? 'US',
  }
}

async function searchSerper(input: SearchInput): Promise<SearchResult[]> {
  const { country, language } = resolveMarket(input.market)
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': env.serperApiKey,
    },
    body: JSON.stringify({
      q: input.query,
      gl: country.toLowerCase(),
      hl: language,
      num: 10,
    }),
    signal: AbortSignal.timeout(env.executionTimeoutMs),
  })

  if (!response.ok) {
    throw new Error(`Search provider failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>
  }

  return (payload.organic ?? [])
    .filter((result) => result.title && result.link)
    .map((result) => ({
      title: result.title ?? '',
      url: result.link ?? '',
      snippet: result.snippet ?? '',
      matchedQueries: [input.query],
      hitCount: 1,
    }))
}

async function searchBrave(input: SearchInput): Promise<SearchResult[]> {
  const { country, language } = resolveMarket(input.market)
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', input.query)
  url.searchParams.set('country', country)
  url.searchParams.set('search_lang', language)
  url.searchParams.set('count', '10')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': env.braveSearchApiKey,
    },
    signal: AbortSignal.timeout(env.executionTimeoutMs),
  })

  if (!response.ok) {
    throw new Error(`Search provider failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> }
  }

  return (payload.web?.results ?? [])
    .filter((result) => result.title && result.url)
    .map((result) => ({
      title: result.title ?? '',
      url: result.url ?? '',
      snippet: result.description ?? '',
      matchedQueries: [input.query],
      hitCount: 1,
    }))
}

async function searchSerpApi(input: SearchInput): Promise<SearchResult[]> {
  const { country, language } = resolveMarket(input.market)
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google')
  url.searchParams.set('q', input.query)
  url.searchParams.set('api_key', env.serpApiKey)
  url.searchParams.set('gl', country.toLowerCase())
  url.searchParams.set('hl', language)
  url.searchParams.set('num', '10')

  const response = await fetch(url, {
    signal: AbortSignal.timeout(env.executionTimeoutMs),
  })

  if (!response.ok) {
    throw new Error(`Search provider failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>
  }

  return (payload.organic_results ?? [])
    .filter((result) => result.title && result.link)
    .map((result) => ({
      title: result.title ?? '',
      url: result.link ?? '',
      snippet: result.snippet ?? '',
      matchedQueries: [input.query],
      hitCount: 1,
    }))
}

async function runProviderSearch(input: SearchInput) {
  if (env.searchProvider === 'brave') {
    return searchBrave(input)
  }

  if (env.searchProvider === 'serpapi') {
    return searchSerpApi(input)
  }

  return searchSerper(input)
}

function consolidateSearchResults(rows: SearchResult[], fallbackQuery: string) {
  const consolidated = new Map<string, SearchResult>()

  for (const row of rows) {
    const key = canonicalizeUrl(row.url)
    const existing = consolidated.get(key)
    if (!existing) {
      consolidated.set(key, {
        ...row,
        url: key,
        matchedQueries: [...new Set(row.matchedQueries ?? [fallbackQuery])],
        hitCount: row.hitCount ?? 1,
      })
      continue
    }

    consolidated.set(key, {
      ...existing,
      title: existing.title.length >= row.title.length ? existing.title : row.title,
      snippet: existing.snippet.length >= row.snippet.length ? existing.snippet : row.snippet,
      matchedQueries: [...new Set([...(existing.matchedQueries ?? []), ...(row.matchedQueries ?? [])])],
      hitCount: (existing.hitCount ?? 1) + (row.hitCount ?? 1),
    })
  }

  return [...consolidated.values()].sort((left, right) => {
    const hitDelta = (right.hitCount ?? 1) - (left.hitCount ?? 1)
    if (hitDelta !== 0) {
      return hitDelta
    }

    return (right.matchedQueries?.length ?? 1) - (left.matchedQueries?.length ?? 1)
  })
}

function buildDomainEvidenceQueries(domain: string, intents: EvidenceIntent[]) {
  const queries: string[] = []

  if (intents.includes('funding')) {
    queries.push(`site:${domain} ("series a" OR "series b" OR "series c" OR funding OR raised OR financing OR expansion)`)
  }

  if (intents.includes('content')) {
    queries.push(`site:${domain} (webinar OR newsletter OR podcast OR "case study" OR blog)`)
  }

  if (intents.includes('evaluation')) {
    queries.push(`site:${domain} ("pricing" OR "compare" OR "alternatives" OR "/vs")`)
  }

  return [...new Set(queries)]
}

export async function searchDomainEvidence(input: {
  domain: string
  intents: EvidenceIntent[]
  market?: string
}) {
  if (!isSearchConfigured || !input.intents.length) {
    return []
  }

  const queries = buildDomainEvidenceQueries(input.domain, input.intents)
  const settled = await Promise.allSettled(
    queries.map((query) =>
      runProviderSearch({
        query,
        market: input.market,
      }),
    ),
  )

  const successful = settled.filter((result): result is PromiseFulfilledResult<SearchResult[]> => result.status === 'fulfilled')
  if (!successful.length) {
    return []
  }

  return consolidateSearchResults(
    successful.flatMap((result) => result.value),
    input.domain,
  ).slice(0, 12)
}

export async function searchWeb(input: SearchInput) {
  if (!isSearchConfigured) {
    throw new Error('Search provider is not configured')
  }

  const variants = buildSearchQueryVariants(input.query)
  const settled = await Promise.allSettled(
    variants.map((variant) =>
      runProviderSearch({
        ...input,
        query: variant,
      }),
    ),
  )

  const successful = settled.filter((result): result is PromiseFulfilledResult<SearchResult[]> => result.status === 'fulfilled')
  if (!successful.length) {
    const rejected = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    throw rejected?.reason instanceof Error ? rejected.reason : new Error('Search provider failed')
  }

  return consolidateSearchResults(
    successful.flatMap((result) => result.value),
    input.query,
  ).slice(0, 30)
}
