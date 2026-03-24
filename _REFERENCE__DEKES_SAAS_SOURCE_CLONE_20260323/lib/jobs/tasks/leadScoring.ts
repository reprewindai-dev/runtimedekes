import { LeadStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { recordMetric } from '@/lib/metrics/recorder'
import type { JobResult } from '@/lib/jobs/types'

const WEIGHTS_ID = 'default'
const LOOKBACK_DAYS = 30

function normalizeWeight(value: number) {
  return Math.max(0.4, Math.min(2.4, value))
}

export async function runLeadScoringJob(): Promise<JobResult> {
  const since = new Date()
  since.setDate(since.getDate() - LOOKBACK_DAYS)

  const leads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: since },
    },
    select: {
      status: true,
      intentDepth: true,
      urgencyVelocity: true,
      budgetSignals: true,
      fitPrecision: true,
    },
  })

  if (leads.length === 0) {
    return { success: true, processed: 0 }
  }

  const aggregate = leads.reduce(
    (acc, lead) => {
      acc.intentDepth += lead.intentDepth
      acc.urgencyVelocity += lead.urgencyVelocity
      acc.budgetSignals += lead.budgetSignals
      acc.fitPrecision += lead.fitPrecision
      if (lead.status === LeadStatus.WON) acc.wins += 1
      return acc
    },
    { intentDepth: 0, urgencyVelocity: 0, budgetSignals: 0, fitPrecision: 0, wins: 0 }
  )

  const count = leads.length
  const avgIntent = aggregate.intentDepth / count / 50
  const avgUrgency = aggregate.urgencyVelocity / count / 50
  const avgBudget = aggregate.budgetSignals / count / 50
  const avgFit = aggregate.fitPrecision / count / 50
  const winRate = aggregate.wins / count || 0.01

  const weights = {
    intentWeight: normalizeWeight(avgIntent * 2 + winRate),
    urgencyWeight: normalizeWeight(avgUrgency * 2 + winRate / 2),
    budgetWeight: normalizeWeight(avgBudget * 2 + winRate / 3),
    fitWeight: normalizeWeight(avgFit * 2 + winRate / 4),
  }

  await prisma.scoringWeights.upsert({
    where: { id: WEIGHTS_ID },
    update: weights,
    create: { id: WEIGHTS_ID, ...weights },
  })

  await recordMetric(
    'job.lead_scoring',
    {
      processed: count,
      winRate,
      weights,
    },
    'dekes'
  )

  return { success: true, processed: count, meta: { winRate, weights } }
}
