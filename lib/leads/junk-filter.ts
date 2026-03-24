import type { SearchResult } from '@/lib/adapters/execution-client'
import { extractRootDomain } from '@/lib/utils'

const blockedHosts = new Set([
  'youtube.com',
  'linkedin.com',
  'reddit.com',
  'facebook.com',
  'instagram.com',
  'medium.com',
  'clutch.co',
  'businessinsider.com',
  'forbes.com',
  'techcrunch.com',
  'venturebeat.com',
  'crunchbase.com',
  'bizjournals.com',
  'g2.com',
  'capterra.com',
  'indeed.com',
  'ziprecruiter.com',
  'glassdoor.com',
  'greenhouse.io',
  'greenhouse.com',
  'lever.co',
  'workable.com',
  'ashbyhq.com',
])

const blockedTitleTerms = ['top', 'best', 'list', 'directory', 'companies', 'agencies', 'platforms', 'roundup']
const blockedMarketplaceTerms = [
  '1-click apply',
  'browse jobs',
  'salary',
  'job board',
  'remote jobs',
  'startup jobs',
  'find openings near you',
  'hiring platform',
  'startup directory',
  'discover startups',
  'startup launches',
]

const blockedHostTerms = ['jobs', 'careers', 'talent', 'recruit', 'staffing', 'nomads']

const articlePaths = ['/blog', '/article', '/articles', '/news', '/resources', '/guide', '/post']
const directoryPaths = ['/directory', '/vendors', '/agencies', '/companies', '/partners', '/marketplace']
const forumPaths = ['/forum', '/community', '/discussions']

export type ResultPageType = 'company' | 'article' | 'list' | 'directory' | 'forum' | 'unknown'

export function classifyResultPageType(result: SearchResult): ResultPageType {
  const title = result.title.toLowerCase()
  const snippet = result.snippet.toLowerCase()
  const url = result.url.toLowerCase()

  if (blockedTitleTerms.some((term) => title.includes(term))) {
    return 'list'
  }

  if (forumPaths.some((path) => url.includes(path)) || snippet.includes('discussion')) {
    return 'forum'
  }

  if (directoryPaths.some((path) => url.includes(path))) {
    return 'directory'
  }

  if (articlePaths.some((path) => url.includes(path))) {
    return 'article'
  }

  if (url.includes('/compare') || url.includes('/alternatives') || url.includes('/pricing') || url.includes('/careers')) {
    return 'company'
  }

  return 'unknown'
}

export function isJunkResult(result: SearchResult) {
  const title = result.title.toLowerCase()
  const snippet = result.snippet.toLowerCase()
  const host = extractRootDomain(result.url) ?? ''
  const rootLabel = host.split('.')[0] ?? ''
  const pageType = classifyResultPageType(result)

  if (!host || blockedHosts.has(host)) {
    return true
  }

  if (blockedHostTerms.some((term) => rootLabel.includes(term))) {
    return true
  }

  if (blockedTitleTerms.some((term) => title.includes(term))) {
    return true
  }

  if (blockedMarketplaceTerms.some((term) => title.includes(term) || snippet.includes(term))) {
    return true
  }

  return pageType === 'article' || pageType === 'list' || pageType === 'directory' || pageType === 'forum'
}

export function filterSearchResults(results: SearchResult[]) {
  const kept: SearchResult[] = []
  const rejected: SearchResult[] = []

  for (const result of results) {
    if (isJunkResult(result)) {
      rejected.push(result)
    } else {
      kept.push(result)
    }
  }

  return { kept, rejected }
}
