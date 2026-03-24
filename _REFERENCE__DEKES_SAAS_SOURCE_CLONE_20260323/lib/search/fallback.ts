import { fetchSerpOrganicResults, SerpApiOrganicResult } from './serpapi'
import { fetchApifyOrganicResults, ApifyOrganicResult } from './apify'

export type SearchResult = {
  position?: number
  title?: string
  link?: string
  displayed_link?: string
  snippet?: string
  date?: string
  type?: string
  source?: string
  provider: 'serpapi' | 'apify'
}

export type SearchOptions = {
  query: string
  location?: string
  gl?: string
  hl?: string
  num?: number
}

const SEARCH_FALLBACK = process.env.SEARCH_FALLBACK || 'false'
const SEARCH_PROVIDER = process.env.SEARCH_PROVIDER || 'serpapi'

async function trySerpApi(options: SearchOptions): Promise<SearchResult[]> {
  try {
    const results = await fetchSerpOrganicResults(options)
    return results.map(result => ({
      ...result,
      provider: 'serpapi' as const,
    }))
  } catch (error) {
    console.warn('SerpApi search failed:', error)
    return []
  }
}

async function tryApify(options: SearchOptions): Promise<SearchResult[]> {
  try {
    const results = await fetchApifyOrganicResults(options)
    return results.map(result => ({
      ...result,
      provider: 'apify' as const,
    }))
  } catch (error) {
    console.warn('Apify search failed:', error)
    return []
  }
}

export async function fetchSearchResults(
  options: SearchOptions
): Promise<SearchResult[]> {
  // Primary search provider
  let results: SearchResult[] = []

  if (SEARCH_PROVIDER === 'serpapi') {
    results = await trySerpApi(options)
    
    // Fallback to Apify if enabled and primary failed
    if (SEARCH_FALLBACK === 'apify' && results.length === 0) {
      console.log('Primary search (SerpApi) failed, trying fallback (Apify)')
      results = await tryApify(options)
    }
  } else if (SEARCH_PROVIDER === 'apify') {
    results = await tryApify(options)
    
    // Fallback to SerpApi if enabled and primary failed
    if (SEARCH_FALLBACK === 'serpapi' && results.length === 0) {
      console.log('Primary search (Apify) failed, trying fallback (SerpApi)')
      results = await trySerpApi(options)
    }
  }

  // If still no results and fallback is enabled, try the other provider
  if (SEARCH_FALLBACK && results.length === 0) {
    console.log('All primary attempts failed, trying all providers')
    const serpResults = await trySerpApi(options)
    const apifyResults = await tryApify(options)
    
    // Merge results, preferring SerpApi for same positions
    const allResults = [...serpResults, ...apifyResults]
      .sort((a, b) => (a.position || 999) - (b.position || 999))
      .slice(0, options.num || 20)
    
    return allResults
  }

  return results
}

// Legacy function for backward compatibility
export async function fetchSerpOrganicResultsWithFallback(
  options: SearchOptions
): Promise<SearchResult[]> {
  return fetchSearchResults(options)
}
