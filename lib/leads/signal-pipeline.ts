import type { LeadStatus } from '@prisma/client'

import { searchDomainEvidence, type SearchResult } from '@/lib/adapters/execution-client'
import { fetchPageIntelligence } from '@/lib/enrichment/page-intelligence'
import { classifyResultPageType, filterSearchResults } from '@/lib/leads/junk-filter'
import { resolveLeadStatus } from '@/lib/leads/status'
import { canonicalizeUrl, extractRootDomain, humanizeCompanyName } from '@/lib/utils'

type SignalKey =
  | 'HIRING_GROWTH'
  | 'PRODUCT_COMPARISON'
  | 'RESEARCH_SPIKE'
  | 'FUNDING_HIRING'
  | 'CONTENT_WITHOUT_DISTRIBUTION'

type StrongSignal = {
  key: SignalKey
  label: string
  explanation: string
  excerpt: string
  sourceUrl: string
  source: string
  strength: number
  observedAt: string
  timingWindowDays: number
  buyingStage: string
  outreachAngle: string
}

export type PackagedLead = {
  companyName: string
  domain: string
  canonicalUrl: string
  sourceUrl: string
  sourceTitle: string
  snippet: string
  score: number
  status: LeadStatus
  whyBuying: string
  whyNow: string
  outreachAngle: string
  recentActivity: string
  businessContext: string
  intentSummary: string
  buyingStage: string
  timingWindowDays: number
  strongSignalCount: number
  evidenceSummary: string
  contactEmail?: string | null
  evidence: Array<{
    signalKey: string
    label: string
    excerpt: string
    sourceUrl: string
    confidence: number
    isStrong: boolean
  }>
}

const growthRoleTerms = [
  'growth',
  'demand generation',
  'demand gen',
  'marketing',
  'sales',
  'revenue operations',
  'revops',
  'sdr',
  'bdr',
  'account executive',
  'lifecycle',
  'content marketer',
]

const fundingTerms = ['series a', 'series b', 'series c', 'funding', 'raised', 'seed round', 'venture-backed']
const fundingSignalTerms = ['series a', 'series b', 'series c', 'raised', 'closed', 'seed round', 'venture-backed', 'funding round', 'financing']
const comparisonTerms = ['compare', 'comparison', 'alternatives', 'vs', 'vendor', 'evaluate', 'evaluation', 'rfp']
const contentTerms = ['podcast', 'webinar', 'newsletter', 'video', 'content', 'case study', 'blog']
const distributionTerms = ['paid social', 'performance marketing', 'distribution', 'growth team', 'seo', 'demand gen']
const nonBuyerContextTerms = [
  'job board',
  'job search',
  'jobs platform',
  'remote jobs',
  'find jobs',
  'recruiting marketplace',
  'career marketplace',
  'talent marketplace',
  'staffing platform',
  'consulting',
  'consultancy',
  'advisory',
  'executive search',
  'recruitment firm',
  'startup directory',
  'startup launches',
  'discover startups',
  'startup community',
  'news',
  'media',
  'publisher',
  'journal',
  'newspaper',
  'magazine',
  'reviews and ratings',
  'software marketplace',
]

const signalWeights: Record<SignalKey, number> = {
  HIRING_GROWTH: 28,
  PRODUCT_COMPARISON: 34,
  RESEARCH_SPIKE: 18,
  FUNDING_HIRING: 30,
  CONTENT_WITHOUT_DISTRIBUTION: 16,
}

const signalStrengths: Record<SignalKey, number> = {
  HIRING_GROWTH: 4,
  PRODUCT_COMPARISON: 5,
  RESEARCH_SPIKE: 3,
  FUNDING_HIRING: 5,
  CONTENT_WITHOUT_DISTRIBUTION: 4,
}

const directComparisonPathTerms = ['/compare', '/comparison', '/alternatives', '/pricing', '/vs']
const commercialSignalKeys: SignalKey[] = ['HIRING_GROWTH', 'PRODUCT_COMPARISON', 'FUNDING_HIRING']
const anchorSignalKeys: SignalKey[] = ['PRODUCT_COMPARISON', 'FUNDING_HIRING', 'CONTENT_WITHOUT_DISTRIBUTION']

function buildKeywordRegex(terms: string[]) {
  return new RegExp(terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
}

const hiringRegex = /\b(hiring|open role|job opening|join our team|careers?)\b/i
const growthRoleRegex = buildKeywordRegex(growthRoleTerms)
const fundingRegex = buildKeywordRegex(fundingTerms)
const fundingSignalRegex = buildKeywordRegex(fundingSignalTerms)
const comparisonRegex = buildKeywordRegex(comparisonTerms)
const contentRegex = buildKeywordRegex(contentTerms)
const distributionRegex = buildKeywordRegex(distributionTerms)

function createSignal(
  input: Omit<StrongSignal, 'label' | 'strength' | 'source' | 'observedAt'> & {
    label?: string
    strength?: number
    source?: string
    observedAt?: string
  },
): StrongSignal {
  return {
    label: input.label ?? input.key,
    strength: input.strength ?? signalStrengths[input.key],
    source: input.source ?? 'company_site',
    observedAt: input.observedAt ?? new Date().toISOString(),
    ...input,
  }
}

function detectQueryRequirements(queryInput: string) {
  const lower = queryInput.toLowerCase()

  return {
    requiresHiring: hiringRegex.test(lower),
    requiresEvaluation: comparisonRegex.test(lower),
    requiresFunding: fundingRegex.test(lower),
    requiresContent:
      contentRegex.test(lower) ||
      lower.includes('webinar') ||
      lower.includes('newsletter') ||
      lower.includes('podcast') ||
      lower.includes('blog'),
    requiresSoftwareContext:
      lower.includes('software') || lower.includes('saas') || lower.includes('ai') || lower.includes('platform'),
  }
}

function getStageFromSignals(signals: StrongSignal[]) {
  return signals[0]?.buyingStage ?? 'Active evaluation'
}

function sortSignalsByPriority(signals: StrongSignal[]) {
  return [...signals].sort((left, right) => {
    const strengthDelta = right.strength - left.strength
    if (strengthDelta !== 0) {
      return strengthDelta
    }

    const weightDelta = signalWeights[right.key] - signalWeights[left.key]
    if (weightDelta !== 0) {
      return weightDelta
    }

    return left.timingWindowDays - right.timingWindowDays
  })
}

function getStrongSignals(signals: StrongSignal[]) {
  return signals.filter((signal) => signal.strength >= 3)
}

function getRecentSignals(signals: StrongSignal[]) {
  return signals.filter((signal) => signal.timingWindowDays <= 30)
}

function hasMinimumSignals(signals: StrongSignal[]) {
  return getStrongSignals(signals).length >= 2
}

function getSignalComboScore(signals: StrongSignal[]) {
  const keys = new Set(signals.map((signal) => signal.key))

  if (keys.has('HIRING_GROWTH') && keys.has('PRODUCT_COMPARISON')) return 5
  if (keys.has('PRODUCT_COMPARISON') && keys.has('RESEARCH_SPIKE')) return 5
  if (keys.has('FUNDING_HIRING') && keys.has('HIRING_GROWTH')) return 5
  if (keys.has('CONTENT_WITHOUT_DISTRIBUTION') && keys.has('HIRING_GROWTH')) return 4
  if (keys.has('CONTENT_WITHOUT_DISTRIBUTION') && keys.has('PRODUCT_COMPARISON')) return 4

  return 2
}

function scoreCandidate(input: {
  queryInput: string
  signals: StrongSignal[]
  businessContext: string
}) {
  const overlapTerms = input.queryInput
    .toLowerCase()
    .split(/\W+/)
    .filter((term) => term.length > 3)
  const context = input.businessContext.toLowerCase()
  const overlapCount = overlapTerms.filter((term) => context.includes(term)).length
  const earliestWindow = Math.min(...input.signals.map((signal) => signal.timingWindowDays))
  const comboScore = getSignalComboScore(input.signals)

  let score =
    input.signals.reduce((total, signal) => total + signalWeights[signal.key], 0) +
    input.signals.reduce((total, signal) => total + signal.strength * 2, 0) +
    Math.min(overlapCount * 3, 12)

  if (earliestWindow <= 7) score += 16
  else if (earliestWindow <= 14) score += 12
  else if (earliestWindow <= 30) score += 8

  if (
    input.signals.some((signal) => signal.key === 'PRODUCT_COMPARISON') &&
    input.signals.some((signal) => signal.key === 'HIRING_GROWTH')
  ) {
    score += 12
  }

  if (
    input.signals.some((signal) => signal.key === 'FUNDING_HIRING') &&
    input.signals.some((signal) => signal.key === 'HIRING_GROWTH')
  ) {
    score += 8
  }

  if (
    input.signals.some((signal) => signal.key === 'CONTENT_WITHOUT_DISTRIBUTION') &&
    input.signals.some((signal) => signal.key === 'HIRING_GROWTH')
  ) {
    score += 5
  }

  score += comboScore * 4

  return Math.min(score, 100)
}

function selectOutreachAngle(signals: StrongSignal[], companyName: string) {
  const keys = new Set(signals.map((signal) => signal.key))

  if (keys.has('HIRING_GROWTH') && keys.has('PRODUCT_COMPARISON')) {
    return `${companyName} is staffing revenue roles while exposing live evaluation surfaces. Lead with how you shorten time-to-pipeline from buyers already in-market.`
  }

  if (keys.has('FUNDING_HIRING') && keys.has('HIRING_GROWTH')) {
    return `${companyName} has capital momentum and is adding growth headcount. Lead with a fast execution offer that turns budget into pipeline before the team is fully ramped.`
  }

  if (keys.has('CONTENT_WITHOUT_DISTRIBUTION') && keys.has('HIRING_GROWTH')) {
    return `${companyName} is already producing content while building its GTM team. Lead with a distribution and conversion angle that creates revenue before new hires fully scale.`
  }

  if (keys.has('CONTENT_WITHOUT_DISTRIBUTION') && keys.has('PRODUCT_COMPARISON')) {
    return `${companyName} is showing both content momentum and active evaluation behavior. Lead with how you convert existing attention into qualified pipeline faster than competing options.`
  }

  const primary = signals[0]
  if (!primary) {
    return `Reach out to ${companyName} with a clear point of view on the buying problem you detected.`
  }

  return primary.outreachAngle.replace('{company}', companyName)
}

function buildWhyNow(signals: StrongSignal[], timingWindowDays: number) {
  const recentSignals = getRecentSignals(signals)
  const [primary, secondary] = signals
  if (!primary) {
    return `Buying window is likely within ${timingWindowDays} days based on current signal recency.`
  }

  if (recentSignals.length >= 3) {
    return `High activity detected in the last 14 days. ${primary.label} is visible now and multiple corroborating signals are active at the same time.`
  }

  if (recentSignals.length >= 2 && secondary) {
    return `Multiple buying signals were detected this month because ${primary.label.toLowerCase()} is live now and ${secondary.label.toLowerCase()} confirms active motion in the buying cycle.`
  }

  if (!secondary) {
    return `Buying window is likely within ${timingWindowDays} days because ${primary.label.toLowerCase()} is visible on the company domain right now.`
  }

  return `Buying window is likely within ${timingWindowDays} days because ${primary.label.toLowerCase()} is live now and ${secondary.label.toLowerCase()} confirms active motion in the buying cycle.`
}

function buildBusinessContext(input: {
  companyName: string
  domain: string
  homepageDescription?: string | null
  secondaryDescription?: string | null
  queryInput: string
}) {
  return (
    input.homepageDescription ??
    input.secondaryDescription ??
    `${input.companyName} is operating on ${input.domain} and surfacing live demand signals tied to ${input.queryInput}.`
  )
}

function isCareerOrJobPage(result: SearchResult) {
  const value = `${result.url} ${result.title} ${result.snippet}`.toLowerCase()
  return (
    value.includes('/careers') ||
    value.includes('/career') ||
    value.includes('/jobs') ||
    value.includes('job id') ||
    value.includes('apply now') ||
    value.includes('employment')
  )
}

function hasDirectComparisonSurface(results: SearchResult[], homepageSurface: { hasPricing: boolean; hasCompare: boolean }) {
  return (
    homepageSurface.hasPricing ||
    homepageSurface.hasCompare ||
    results.some(
      (result) =>
        !isCareerOrJobPage(result) &&
        directComparisonPathTerms.some((term) => result.url.toLowerCase().includes(term)),
    )
  )
}

export function passesLeadQualityGate(input: {
  domain: string
  companyName: string
  businessContext: string
  homepagePageType?: string | null
  signals: StrongSignal[]
}) {
  const rootLabel = input.domain.split('.')[0]?.toLowerCase() ?? ''
  const qualityBlob = `${input.companyName} ${input.businessContext}`.toLowerCase()
  const commercialSignalCount = input.signals.filter((signal) => commercialSignalKeys.includes(signal.key)).length
  const anchorSignalCount = input.signals.filter((signal) => anchorSignalKeys.includes(signal.key)).length

  if (['jobs', 'careers', 'talent', 'recruit', 'staffing', 'nomads'].some((term) => rootLabel.includes(term))) {
    return false
  }

  if (nonBuyerContextTerms.some((term) => qualityBlob.includes(term))) {
    return false
  }

  if (input.homepagePageType && ['article', 'list', 'directory', 'forum'].includes(input.homepagePageType)) {
    return false
  }

  if (commercialSignalCount === 0) {
    return false
  }

  if (anchorSignalCount === 0) {
    return false
  }

  if (!hasMinimumSignals(input.signals)) {
    return false
  }

  if (getRecentSignals(input.signals).length < 2) {
    return false
  }

  if (getSignalComboScore(input.signals) < 4) {
    return false
  }

  return true
}

export function matchesSoftwareCategory(businessContext: string) {
  const lower = businessContext.toLowerCase()
  return ['software', 'saas', 'platform', 'cloud', 'ai', 'application', 'automation', 'product'].some((term) =>
    lower.includes(term),
  )
}

async function buildDomainCandidate(queryInput: string, domain: string, results: SearchResult[], market = 'en-US') {
  const homepageUrl = `https://${domain}`
  const homepage = await fetchPageIntelligence(homepageUrl)
  const requirements = detectQueryRequirements(queryInput)
  const evidenceIntents = [
    ...(requirements.requiresFunding ? (['funding'] as const) : []),
    ...(requirements.requiresContent ? (['content'] as const) : []),
  ]
  const domainEvidence = await searchDomainEvidence({
    domain,
    intents: evidenceIntents,
    market,
  })
  const mergedResults = [...results, ...domainEvidence].reduce<SearchResult[]>((collection, result) => {
    const url = canonicalizeUrl(result.url)
    if (collection.some((entry) => entry.url === url)) {
      return collection
    }

    collection.push({
      ...result,
      url,
    })
    return collection
  }, [])

  const pageIntel = await Promise.all(mergedResults.slice(0, 5).map((result) => fetchPageIntelligence(result.url)))
  const validPages = pageIntel.filter(Boolean)
  const combinedText = [
    homepage?.title,
    homepage?.description,
    homepage?.bodyText,
    ...mergedResults.flatMap((result) => [result.title, result.snippet, result.url]),
    ...validPages.flatMap((page) => [page?.title, page?.description, page?.bodyText]),
  ]
    .filter(Boolean)
    .join(' ')
  const surface = homepage?.surface ?? {
    hasPricing: false,
    hasCompare: false,
    hasBlog: false,
    hasWebinar: false,
    hasNewsletter: false,
    hasPodcast: false,
  }

  const companyName =
    homepage?.companyName ??
    validPages.find((page) => page?.companyName)?.companyName ??
    humanizeCompanyName(domain.split('.')[0] ?? '')

  if (!companyName || companyName.length < 2) {
    return null
  }

  const pageTypes = validPages.map((page) => page?.pageType)
  if (pageTypes.length && pageTypes.every((pageType) => pageType !== 'company' && pageType !== 'unknown')) {
    return null
  }

  const signals: StrongSignal[] = []
  const bestResult = mergedResults[0]
  const lowerText = combinedText.toLowerCase()
  const corroboratedQueryCount = new Set(mergedResults.flatMap((result) => result.matchedQueries ?? [])).size
  const fundingSource =
    mergedResults.find(
      (result) =>
        !isCareerOrJobPage(result) &&
        fundingSignalRegex.test(`${result.title} ${result.snippet}`.toLowerCase()),
    ) ?? null
  const comparisonCueText = [
    bestResult.title,
    bestResult.snippet,
    homepage?.title,
    homepage?.description,
    ...validPages.flatMap((page) => [page?.title, page?.description]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (hiringRegex.test(lowerText) && growthRoleRegex.test(lowerText)) {
    signals.push(
      createSignal({
        key: 'HIRING_GROWTH',
        label: 'Hiring tied to growth',
        explanation:
          'Active hiring for growth, marketing, or sales roles usually means budget and urgency around pipeline execution.',
        excerpt: bestResult.snippet || bestResult.title,
        sourceUrl: bestResult.url,
        source: 'careers_page',
        timingWindowDays: 14,
        buyingStage: 'Solution evaluation',
        outreachAngle:
          '{company} is staffing revenue roles right now. Lead with how you shorten ramp time and create pipeline before those hires are fully productive.',
      }),
    )
  }

  if (hasDirectComparisonSurface(mergedResults, surface)) {
    const comparisonSource =
      mergedResults.find(
        (result) =>
          !isCareerOrJobPage(result) &&
          directComparisonPathTerms.some((term) => result.url.toLowerCase().includes(term)),
      ) ??
      bestResult
    signals.push(
      createSignal({
        key: 'PRODUCT_COMPARISON',
        label: 'Product evaluation behavior',
        explanation:
          'Comparison or alternatives behavior is a direct sign that the company is evaluating vendors now.',
        excerpt: comparisonSource.snippet || comparisonSource.title,
        sourceUrl: comparisonSource.url,
        source: 'evaluation_page',
        timingWindowDays: 7,
        buyingStage: 'Active evaluation',
        outreachAngle:
          '{company} is already comparing options. Open with a sharp point of difference and an offer to collapse their evaluation time.',
      }),
    )
  }

  if (
    !signals.some((signal) => signal.key === 'PRODUCT_COMPARISON') &&
    hasDirectComparisonSurface(mergedResults, surface) &&
    hiringRegex.test(lowerText)
  ) {
    signals.push(
      createSignal({
        key: 'PRODUCT_COMPARISON',
        label: 'Evaluation surface detected',
        explanation:
          'The company exposes pricing or comparison surfaces on its own domain while staffing revenue roles, which usually indicates active evaluation and conversion pressure.',
        excerpt: `${companyName} exposes pricing or comparison paths directly on the company site.`,
        sourceUrl: homepage?.url ?? bestResult.url,
        source: 'homepage_surface',
        timingWindowDays: 10,
        buyingStage: 'Active evaluation',
        outreachAngle:
          '{company} already has public evaluation surfaces live while staffing growth roles. Lead with how you improve conversion from active buyers already in-market.',
      }),
    )
  }

  if (mergedResults.length >= 2 || corroboratedQueryCount >= 2) {
    signals.push(
      createSignal({
        key: 'RESEARCH_SPIKE',
        label: 'Research spike',
        explanation:
          corroboratedQueryCount >= 2
            ? 'The company surfaced across multiple DEKES search strategies, which suggests repeated commercial intent around this problem.'
            : 'Multiple live pages from the same company surfaced in one targeted search, which suggests active investigation around this problem.',
        excerpt: mergedResults.map((result) => result.title).join(' | '),
        sourceUrl: bestResult.url,
        source: corroboratedQueryCount >= 2 ? 'multi_query_corroboration' : 'search_result_cluster',
        timingWindowDays: corroboratedQueryCount >= 2 ? 5 : 7,
        buyingStage: 'Problem framing',
        outreachAngle:
          '{company} is showing an unusual concentration of live intent around this problem. Lead with the fastest path to clarity and execution.',
      }),
    )
  }

  if (fundingSource && hiringRegex.test(lowerText)) {
    signals.push(
      createSignal({
        key: 'FUNDING_HIRING',
        label: 'Funding plus hiring',
        explanation:
          'Growth capital combined with new hiring usually creates a compressed buying window for execution help.',
        excerpt: fundingSource.snippet || fundingSource.title,
        sourceUrl: fundingSource.url,
        source: 'funding_signal',
        timingWindowDays: 30,
        buyingStage: 'Budget activated',
        outreachAngle:
          '{company} has both capital and headcount momentum. Position your offer as a way to turn that momentum into measurable revenue fast.',
      }),
    )
  }

  if (
    (
      (contentRegex.test(lowerText) && !surface.hasBlog) ||
      surface.hasWebinar ||
      surface.hasNewsletter ||
      surface.hasPodcast ||
      (surface.hasBlog && contentRegex.test(comparisonCueText))
    ) &&
    !distributionRegex.test(lowerText)
  ) {
    signals.push(
      createSignal({
        key: 'CONTENT_WITHOUT_DISTRIBUTION',
        label: 'Content production without distribution',
        explanation:
          'The company is publishing content but there is little evidence of distribution muscle, which creates immediate pressure on pipeline performance.',
        excerpt: homepage?.description || bestResult.snippet || bestResult.title,
        sourceUrl: homepage?.url ?? bestResult.url,
        source: 'content_surface',
        timingWindowDays: 21,
        buyingStage: 'Execution gap',
        outreachAngle:
          '{company} is already producing content. Lead with a distribution and conversion angle that helps that content turn into pipeline.',
      }),
    )
  }

  const uniqueSignals = signals.filter(
    (signal, index, collection) => collection.findIndex((entry) => entry.key === signal.key) === index,
  )

  if (uniqueSignals.length < 2) {
    return null
  }

  const businessContext = buildBusinessContext({
    companyName,
    domain,
    homepageDescription: homepage?.description,
    secondaryDescription: validPages.find((page) => page?.description)?.description,
    queryInput,
  })
  const lowerCompanyName = companyName.toLowerCase()

  if (['indeed', 'ziprecruiter', 'glassdoor', 'greenhouse', 'lever', 'workable', 'ashby'].some((term) => lowerCompanyName.includes(term))) {
    return null
  }

  const prioritizedSignals = sortSignalsByPriority(uniqueSignals)
  const signalKeys = new Set(prioritizedSignals.map((signal) => signal.key))

  if (
    !passesLeadQualityGate({
      domain,
      companyName,
      businessContext,
      homepagePageType: homepage?.pageType,
      signals: prioritizedSignals,
    })
  ) {
    return null
  }

  if (requirements.requiresHiring && !signalKeys.has('HIRING_GROWTH') && !signalKeys.has('FUNDING_HIRING')) {
    return null
  }

  if (requirements.requiresEvaluation && !signalKeys.has('PRODUCT_COMPARISON')) {
    return null
  }

  if (requirements.requiresFunding && !signalKeys.has('FUNDING_HIRING')) {
    return null
  }

  if (requirements.requiresContent && !signalKeys.has('CONTENT_WITHOUT_DISTRIBUTION')) {
    return null
  }

  if (requirements.requiresSoftwareContext && !matchesSoftwareCategory(businessContext)) {
    return null
  }

  const score = scoreCandidate({
    queryInput,
    signals: prioritizedSignals,
    businessContext,
  })
  const status = resolveLeadStatus(score)

  if (status === 'REJECTED') {
    return null
  }

  const timingWindowDays = Math.min(...prioritizedSignals.map((signal) => signal.timingWindowDays))
  const whyBuying = prioritizedSignals
    .slice(0, 2)
    .map((signal) => signal.explanation)
    .join(' ')
  const whyNow = buildWhyNow(prioritizedSignals, timingWindowDays)
  const outreachAngle = selectOutreachAngle(prioritizedSignals, companyName)
  const recentActivity = prioritizedSignals[0].excerpt
  const intentSummary = `${companyName} shows ${prioritizedSignals
    .map((signal) => signal.label.toLowerCase())
    .join(' and ')} tied to ${queryInput}.`

  if (!whyBuying || !whyNow || !outreachAngle) {
    return null
  }

  return {
    companyName,
    domain,
    canonicalUrl: homepageUrl,
    sourceUrl: bestResult.url,
    sourceTitle: bestResult.title,
    snippet: bestResult.snippet,
    score,
    status,
    whyBuying,
    whyNow,
    outreachAngle,
    recentActivity,
    businessContext,
    intentSummary,
    buyingStage: getStageFromSignals(prioritizedSignals),
    timingWindowDays,
    strongSignalCount: prioritizedSignals.length,
    evidenceSummary: prioritizedSignals.map((signal) => signal.label).join(' | '),
    contactEmail: homepage?.contactEmail ?? validPages.find((page) => page?.contactEmail)?.contactEmail ?? null,
    evidence: prioritizedSignals.map((signal) => ({
      signalKey: signal.key,
      label: signal.label,
      excerpt: signal.excerpt,
      sourceUrl: signal.sourceUrl,
      confidence: Math.max(Math.min((score + signal.strength * 4) / 100, 1), 0.55),
      isStrong: true,
    })),
  } satisfies PackagedLead
}

export async function packageBuyerIntelligence(
  queryInput: string,
  rawResults: SearchResult[],
  options?: { market?: string },
) {
  const { kept, rejected } = filterSearchResults(rawResults)
  const grouped = new Map<string, SearchResult[]>()

  for (const result of kept) {
    const domain = extractRootDomain(result.url)
    if (!domain) {
      continue
    }

    const bucket = grouped.get(domain) ?? []
    bucket.push({
      ...result,
      url: canonicalizeUrl(result.url),
    })
    grouped.set(domain, bucket)
  }

  const leads: PackagedLead[] = []
  for (const [domain, results] of grouped.entries()) {
    const dedupedResults = results.filter(
      (result, index, collection) => collection.findIndex((entry) => entry.url === result.url) === index,
    )
    const lead = await buildDomainCandidate(queryInput, domain, dedupedResults, options?.market)
    if (lead) {
      leads.push(lead)
    }
  }

  return {
    leads: leads.sort((left, right) => right.score - left.score),
    rejectedCount: rejected.length + (grouped.size - leads.length),
    keptCount: kept.length,
    rawCount: rawResults.length,
  }
}
