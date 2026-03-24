import { prisma } from '@/lib/db'

/**
 * Closed-loop feedback system for lead scoring calibration.
 *
 * When a lead is marked WON or LOST, this module:
 * 1. Updates ConversionPattern for the lead's attribute combination
 * 2. Recalibrates ScoringWeights based on win/loss ratio trends
 * 3. Updates Query-level win/loss counters + IPS reward
 * 4. Applies lead freshness decay to stale leads
 */

// ── ConversionPattern Keys ─────────────────────────────────────────────────

function buildPatternKeys(lead: {
  intentClass?: string | null
  buyerType?: string | null
  painTags?: string[]
  serviceTags?: string[]
  source?: string
}): string[] {
  const keys: string[] = []

  // Global key
  keys.push('global')

  // Intent class key
  if (lead.intentClass) {
    keys.push(`intent:${lead.intentClass}`)
  }

  // Buyer type key
  if (lead.buyerType) {
    keys.push(`buyer:${lead.buyerType}`)
  }

  // Source key
  if (lead.source) {
    keys.push(`source:${lead.source}`)
  }

  // Intent + buyer combo
  if (lead.intentClass && lead.buyerType) {
    keys.push(`intent:${lead.intentClass}::buyer:${lead.buyerType}`)
  }

  // Pain tag keys (top 3)
  const painTags = lead.painTags ?? []
  for (const tag of painTags.slice(0, 3)) {
    keys.push(`pain:${tag}`)
  }

  // Service tag keys (top 3)
  const serviceTags = lead.serviceTags ?? []
  for (const tag of serviceTags.slice(0, 3)) {
    keys.push(`service:${tag}`)
  }

  return keys
}

// ── Record Outcome ─────────────────────────────────────────────────────────

export async function recordOutcome(
  leadId: string,
  outcome: 'WON' | 'LOST',
  meta?: Record<string, unknown>
): Promise<{ patternsUpdated: number; weightsRecalibrated: boolean }> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      intentClass: true,
      buyerType: true,
      painTags: true,
      serviceTags: true,
      source: true,
      queryId: true,
      score: true,
      intentDepth: true,
      urgencyVelocity: true,
      budgetSignals: true,
      fitPrecision: true,
    },
  })

  if (!lead) return { patternsUpdated: 0, weightsRecalibrated: false }

  const isWin = outcome === 'WON'
  const keys = buildPatternKeys(lead)

  // 1. Update conversion patterns
  const patternOps = keys.map((key) =>
    prisma.conversionPattern.upsert({
      where: { key },
      create: {
        key,
        wins: isWin ? 1 : 0,
        losses: isWin ? 0 : 1,
        lastWinAt: isWin ? new Date() : null,
      },
      update: {
        wins: isWin ? { increment: 1 } : undefined,
        losses: !isWin ? { increment: 1 } : undefined,
        lastWinAt: isWin ? new Date() : undefined,
      },
    })
  )

  await Promise.all(patternOps)

  // 2. Update query-level counters
  if (lead.queryId) {
    const reward = isWin ? 1.0 : -0.3
    await prisma.query.update({
      where: { id: lead.queryId },
      data: {
        wonCount: isWin ? { increment: 1 } : undefined,
        lostCount: !isWin ? { increment: 1 } : undefined,
        lastWinAt: isWin ? new Date() : undefined,
        ipsRewardSum: { increment: reward },
        ipsWeightSum: { increment: 1.0 },
      },
    })
  }

  // 3. Recalibrate scoring weights (only after enough data)
  const weightsRecalibrated = await recalibrateScoringWeights()

  return { patternsUpdated: keys.length, weightsRecalibrated }
}

// ── Scoring Weight Recalibration ───────────────────────────────────────────

async function recalibrateScoringWeights(): Promise<boolean> {
  // Need minimum 20 outcomes before recalibrating
  const global = await prisma.conversionPattern.findUnique({
    where: { key: 'global' },
  })

  if (!global) return false
  const totalOutcomes = global.wins + global.losses
  if (totalOutcomes < 20) return false

  // Get conversion rates for each scoring dimension's pattern keys
  const intentPatterns = await prisma.conversionPattern.findMany({
    where: { key: { startsWith: 'intent:' } },
  })

  const buyerPatterns = await prisma.conversionPattern.findMany({
    where: { key: { startsWith: 'buyer:' } },
  })

  const painPatterns = await prisma.conversionPattern.findMany({
    where: { key: { startsWith: 'pain:' } },
  })

  const servicePatterns = await prisma.conversionPattern.findMany({
    where: { key: { startsWith: 'service:' } },
  })

  // Calculate dimension-level win rates
  const globalWinRate = global.wins / totalOutcomes

  function dimensionWinRate(
    patterns: Array<{ wins: number; losses: number }>
  ): number {
    const totalW = patterns.reduce((s, p) => s + p.wins, 0)
    const totalL = patterns.reduce((s, p) => s + p.losses, 0)
    const total = totalW + totalL
    return total > 0 ? totalW / total : globalWinRate
  }

  const intentRate = dimensionWinRate(intentPatterns)
  const budgetRate = dimensionWinRate(servicePatterns) // service tags correlate with budget
  const fitRate = dimensionWinRate(buyerPatterns) // buyer type correlates with fit
  const urgencyRate = dimensionWinRate(painPatterns) // pain points correlate with urgency

  // Normalize weights relative to global win rate (avoid division by zero)
  const safeGlobal = Math.max(globalWinRate, 0.01)
  const rawWeights = {
    intent: intentRate / safeGlobal,
    urgency: urgencyRate / safeGlobal,
    budget: budgetRate / safeGlobal,
    fit: fitRate / safeGlobal,
  }

  // Clamp weights between 0.5 and 2.0
  function clamp(v: number): number {
    return Math.max(0.5, Math.min(2.0, v))
  }

  // Upsert the single scoring weights row
  const existing = await prisma.scoringWeights.findFirst()
  if (existing) {
    await prisma.scoringWeights.update({
      where: { id: existing.id },
      data: {
        intentWeight: clamp(rawWeights.intent),
        urgencyWeight: clamp(rawWeights.urgency),
        budgetWeight: clamp(rawWeights.budget),
        fitWeight: clamp(rawWeights.fit),
      },
    })
  } else {
    await prisma.scoringWeights.create({
      data: {
        intentWeight: clamp(rawWeights.intent),
        urgencyWeight: clamp(rawWeights.urgency),
        budgetWeight: clamp(rawWeights.budget),
        fitWeight: clamp(rawWeights.fit),
      },
    })
  }

  return true
}

// ── Get Calibrated Weights ─────────────────────────────────────────────────

export async function getCalibratedWeights(): Promise<{
  intentWeight: number
  urgencyWeight: number
  budgetWeight: number
  fitWeight: number
  engagementWeight: number
}> {
  const weights = await prisma.scoringWeights.findFirst()

  // Defaults match the 5-layer engine in generator.ts
  // (0.30, 0.20, 0.15, 0.20, 0.15) normalized to multipliers
  return {
    intentWeight: weights?.intentWeight ?? 1.0,
    urgencyWeight: weights?.urgencyWeight ?? 1.0,
    budgetWeight: weights?.budgetWeight ?? 1.0,
    fitWeight: weights?.fitWeight ?? 1.0,
    engagementWeight: 1.0, // engagement weight stays fixed (position + pain points)
  }
}

// ── Lead Freshness Decay ───────────────────────────────────────────────────

/**
 * Applies a time-based decay to lead scores.
 * Leads older than `freshDays` start losing score points.
 * This prevents stale leads from clogging the pipeline.
 */
export async function applyFreshnessDecay(
  organizationId: string,
  freshDays: number = 14,
  decayPerDay: number = 2,
  minScore: number = 30
): Promise<{ decayed: number }> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - freshDays)

  // Find leads older than cutoff that haven't been actioned
  const staleLeads = await prisma.lead.findMany({
    where: {
      organizationId,
      status: { in: ['OUTREACH_READY', 'REVIEW'] },
      createdAt: { lt: cutoff },
      score: { gt: minScore },
    },
    select: { id: true, score: true, createdAt: true },
  })

  if (staleLeads.length === 0) return { decayed: 0 }

  const now = Date.now()
  let decayed = 0

  for (const lead of staleLeads) {
    const ageDays = Math.floor((now - lead.createdAt.getTime()) / 86_400_000)
    const daysOverFresh = ageDays - freshDays
    const penalty = daysOverFresh * decayPerDay
    const newScore = Math.max(minScore, lead.score - penalty)

    if (newScore < lead.score) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { score: newScore },
      })
      decayed++
    }
  }

  return { decayed }
}

// ── Conversion Analytics ───────────────────────────────────────────────────

export async function getConversionAnalytics(organizationId?: string) {
  const global = await prisma.conversionPattern.findUnique({
    where: { key: 'global' },
  })

  const patterns = await prisma.conversionPattern.findMany({
    orderBy: { wins: 'desc' },
    take: 20,
  })

  const weights = await getCalibratedWeights()

  const totalOutcomes = global ? global.wins + global.losses : 0
  const winRate = totalOutcomes > 0 ? global!.wins / totalOutcomes : 0

  return {
    totalOutcomes,
    wins: global?.wins ?? 0,
    losses: global?.losses ?? 0,
    winRate: Math.round(winRate * 1000) / 10, // percentage with 1 decimal
    topPatterns: patterns.map((p) => ({
      key: p.key,
      wins: p.wins,
      losses: p.losses,
      winRate:
        p.wins + p.losses > 0
          ? Math.round((p.wins / (p.wins + p.losses)) * 1000) / 10
          : 0,
    })),
    calibratedWeights: weights,
    lastCalibration: global?.updatedAt ?? null,
  }
}
