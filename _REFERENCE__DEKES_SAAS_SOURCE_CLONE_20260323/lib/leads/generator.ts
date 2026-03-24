import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { fetchSearchResults } from '@/lib/search/fallback'
import { classifyLeadIntent, type IntentClassification } from '@/lib/ai/groq'
import { getCalibratedWeights } from '@/lib/leads/feedback-loop'
import type { UTMData } from '@/lib/utm'

export type LeadGenerationOptions = {
  query: string
  organizationId: string
  queryId: string
  runId: string
  regions: string[]
  selectedRegion?: string
  estimatedResults: number
  utmData?: UTMData
}

export type LeadGenerationResult = {
  requested: number
  attempted: number
  inserted: number
  leads: Prisma.LeadUncheckedCreateInput[]
}

const SOURCE = 'SERPAPI_GOOGLE'
const MIN_SCORE = 45
const MAX_SCORE = 98

function normalizeGl(region?: string): string | undefined {
  if (!region) return undefined
  if (region.length === 2) return region.toLowerCase()
  const match = region.match(/^[A-Z]{2}/i)
  return match ? match[0].toLowerCase() : undefined
}

function hashCanonical(url: string, organizationId: string): string {
  return createHash('sha256').update(`${organizationId}::${url.toLowerCase()}`).digest('hex')
}

function scoreFromPosition(position: number): number {
  const score = MAX_SCORE - position * 4
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score))
}

function secondaryScore(base: number, delta: number): number {
  return Math.max(30, Math.min(95, base + delta))
}

export async function generateLeadsFromSearch(
  options: LeadGenerationOptions
): Promise<LeadGenerationResult> {
  const gl = normalizeGl(options.selectedRegion || options.regions[0])
  const searchResults = await fetchSearchResults({
    query: options.query,
    gl,
    num: Math.min(options.estimatedResults, 100),
  })

  const created: Prisma.LeadUncheckedCreateInput[] = []

  // Load feedback-calibrated scoring weights (defaults to 1.0 if no feedback yet)
  const weights = await getCalibratedWeights()

  // Process leads sequentially to handle async AI classification properly
  for (const [idx, result] of searchResults.entries()) {
    const link = result.link || result.displayed_link
    if (!link) continue

    const canonicalUrl = link.trim()
    if (!canonicalUrl) continue

    const canonicalHash = hashCanonical(canonicalUrl, options.organizationId)
    const baseScore = scoreFromPosition(idx)

    // Get AI-powered intent classification
    let intentClassification
    try {
      intentClassification = await classifyLeadIntent(
        result.title || '',
        result.snippet || '',
        canonicalUrl
      )
    } catch (error) {
      console.warn('AI classification failed, using fallback:', error)
      intentClassification = {
        intentClass: baseScore > 70 ? 'HIGH_INTENT' : 'MEDIUM_INTENT',
        confidence: Math.min(0.99, Math.max(0.4, baseScore / 100)),
        buyerType: 'B2B_SaaS',
        urgencySignals: {
          immediate: baseScore > 80,
          timeline: 'unknown',
          budgetIndicators: [],
        },
        painPoints: [],
        serviceFit: baseScore / 100,
      }
    }

    // ── 5-Layer Scoring Engine ──────────────────────────────────────────
    // Layer 1: Intent depth — AI classification confidence + intent class weight
    const intentWeight = intentClassification.intentClass === 'HIGH_INTENT' ? 15
      : intentClassification.intentClass === 'MEDIUM_INTENT' ? 5 : -5
    const intentDepthScore = secondaryScore(
      baseScore,
      Math.round(intentWeight * intentClassification.confidence)
    )

    // Layer 2: Urgency velocity — immediacy + timeline signals
    const urgencyBoost = intentClassification.urgencySignals.immediate ? 10 : 0
    const timelineBoost = intentClassification.urgencySignals.timeline === 'this_quarter' ? 5
      : intentClassification.urgencySignals.timeline === 'this_month' ? 8 : 0
    const urgencyScore = secondaryScore(baseScore, urgencyBoost + timelineBoost - 5)

    // Layer 3: Budget signals — number of budget indicators detected
    const budgetIndicatorCount = intentClassification.urgencySignals.budgetIndicators?.length ?? 0
    const budgetScore = secondaryScore(baseScore, budgetIndicatorCount * 4 - 8)

    // Layer 4: Fit precision — AI service fit score (0-1)
    const fitScore = secondaryScore(
      baseScore,
      Math.round((intentClassification.serviceFit - 0.5) * 20)
    )

    // Layer 5: Engagement depth — pain point specificity + search position
    const painPointCount = intentClassification.painPoints?.length ?? 0
    const engagementScore = secondaryScore(baseScore, painPointCount * 3 - 3)

    // Composite score: feedback-calibrated weighted blend of all 5 layers
    const rawComposite =
      intentDepthScore * 0.30 * weights.intentWeight +
      urgencyScore * 0.20 * weights.urgencyWeight +
      budgetScore * 0.15 * weights.budgetWeight +
      fitScore * 0.20 * weights.fitWeight +
      engagementScore * 0.15 * weights.engagementWeight
    // Normalize back to 100-point scale (weights are multipliers around 1.0)
    const weightSum =
      0.30 * weights.intentWeight +
      0.20 * weights.urgencyWeight +
      0.15 * weights.budgetWeight +
      0.20 * weights.fitWeight +
      0.15 * weights.engagementWeight
    const compositeScore = Math.round(rawComposite / weightSum)
    const finalScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, compositeScore))

    const leadPayload: Prisma.LeadUncheckedCreateInput = {
      organizationId: options.organizationId,
      queryId: options.queryId,
      runId: options.runId,
      source: result.provider === 'apify' ? 'APIFY_GOOGLE' : 'SERPAPI_GOOGLE',
      sourceUrl: canonicalUrl,
      canonicalUrl,
      canonicalHash,
      title: result.title?.trim() || null,
      snippet: result.snippet?.trim() || null,
      publishedAt: result.date ? new Date() : null,
      score: finalScore,
      intentDepth: intentDepthScore,
      urgencyVelocity: urgencyScore,
      budgetSignals: budgetScore,
      fitPrecision: fitScore,
      buyerType: intentClassification.buyerType,
      intentClass: intentClassification.intentClass,
      intentConfidence: intentClassification.confidence,
      rush12HourEligible: intentClassification.urgencySignals.immediate,
      painTags: intentClassification.painPoints,
      serviceTags: intentClassification.urgencySignals.budgetIndicators,
      // UTM Attribution (Prisma camelCase field names map to snake_case columns)
      utmSource: options.utmData?.utm_source,
      utmMedium: options.utmData?.utm_medium,
      utmCampaign: options.utmData?.utm_campaign,
      utmTerm: options.utmData?.utm_term,
      utmContent: options.utmData?.utm_content,
      meta: {
        serpPosition: result.position ?? idx + 1,
        serpSource: result.source ?? (result.provider === 'apify' ? 'apify_google' : 'google'),
        gl,
        provider: result.provider,
        aiClassification: intentClassification,
        urgencyTimeline: intentClassification.urgencySignals.timeline,
        serviceFit: intentClassification.serviceFit,
        utmCapturedAt: options.utmData?.captured_at,
      } as Prisma.JsonObject,
    }

    try {
      // Domain-level duplicate detection: check if another lead from the same
      // domain already exists for this org (cross-run dedup)
      let isDuplicate = false
      let duplicateOfLeadId: string | undefined
      try {
        const domain = new URL(canonicalUrl).hostname.replace(/^www\./, '')
        const existingDomainLead = await prisma.lead.findFirst({
          where: {
            organizationId: options.organizationId,
            canonicalUrl: { contains: domain },
            canonicalHash: { not: leadPayload.canonicalHash },
          },
          select: { id: true },
          orderBy: { score: 'desc' },
        })
        if (existingDomainLead) {
          isDuplicate = true
          duplicateOfLeadId = existingDomainLead.id
        }
      } catch {
        // URL parse failed — not a duplicate detection error, continue
      }

      await prisma.lead.upsert({
        where: {
          organizationId_canonicalHash: {
            organizationId: leadPayload.organizationId,
            canonicalHash: leadPayload.canonicalHash,
          },
        },
        update: {
          score: leadPayload.score,
          intentDepth: leadPayload.intentDepth,
          urgencyVelocity: leadPayload.urgencyVelocity,
          budgetSignals: leadPayload.budgetSignals,
          fitPrecision: leadPayload.fitPrecision,
          snippet: leadPayload.snippet,
          title: leadPayload.title,
          runId: leadPayload.runId,
          queryId: leadPayload.queryId,
          meta: leadPayload.meta,
          buyerType: leadPayload.buyerType,
          intentClass: leadPayload.intentClass,
          intentConfidence: leadPayload.intentConfidence,
          rush12HourEligible: leadPayload.rush12HourEligible,
          painTags: leadPayload.painTags,
          serviceTags: leadPayload.serviceTags,
          isDuplicate,
          duplicateOfLeadId: duplicateOfLeadId ?? null,
        },
        create: {
          ...leadPayload,
          isDuplicate,
          duplicateOfLeadId: duplicateOfLeadId ?? null,
        },
      })
      created.push(leadPayload)
    } catch (error) {
      console.error('Lead upsert failed', error)
    }
  }

  return {
    requested: searchResults.length,
    attempted: searchResults.length,
    inserted: created.length,
    leads: created,
  }
}
