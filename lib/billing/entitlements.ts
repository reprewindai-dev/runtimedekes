import type { Plan, Prisma, Subscription } from '@prisma/client'

import { db } from '@/lib/db'
import { getPlanDefinition, planCatalog } from '@/lib/plans'
import { endOfMonth, startOfMonth } from '@/lib/utils'

type SubscriptionWithPlan = Subscription & { plan: Plan }

export async function ensurePlansSeeded() {
  await Promise.all(
    planCatalog.map((plan) =>
      db.plan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          description: plan.description,
          monthlyPriceCents: plan.monthlyPriceCents,
          monthlyQueryLimit: plan.monthlyQueryLimit,
          monthlyLeadLimit: plan.monthlyLeadLimit,
          monthlyUserLimit: plan.monthlyUserLimit,
          featureFlags: plan.featureFlags as Prisma.InputJsonValue,
        },
        create: {
          code: plan.code,
          name: plan.name,
          description: plan.description,
          monthlyPriceCents: plan.monthlyPriceCents,
          monthlyQueryLimit: plan.monthlyQueryLimit,
          monthlyLeadLimit: plan.monthlyLeadLimit,
          monthlyUserLimit: plan.monthlyUserLimit,
          featureFlags: plan.featureFlags as Prisma.InputJsonValue,
        },
      }),
    ),
  )
}

export async function getCurrentSubscription(organizationId: string): Promise<SubscriptionWithPlan> {
  await ensurePlansSeeded()

  const existing = await db.subscription.findFirst({
    where: {
      organizationId,
      status: {
        in: ['TRIALING', 'ACTIVE', 'PAST_DUE'],
      },
    },
    include: {
      plan: true,
    },
    orderBy: [{ currentPeriodEnd: 'desc' }, { createdAt: 'desc' }],
  })

  if (existing) {
    return existing
  }

  const freePlan = await db.plan.findUnique({
    where: {
      code: 'FREE',
    },
  })

  if (!freePlan) {
    throw new Error('Free plan not found')
  }

  return db.subscription.create({
    data: {
      organizationId,
      planId: freePlan.id,
      status: 'TRIALING',
    },
    include: {
      plan: true,
    },
  })
}

export async function getUsageSummary(organizationId: string) {
  const periodStart = startOfMonth()
  const periodEnd = endOfMonth()

  const records = await db.usageRecord.groupBy({
    by: ['metric'],
    where: {
      organizationId,
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    _sum: {
      quantity: true,
    },
  })

  const metrics = {
    queryRuns: 0,
    rawResults: 0,
    qualifiedLeads: 0,
    sendNowLeads: 0,
  }

  for (const record of records) {
    const quantity = record._sum.quantity ?? 0
    if (record.metric === 'QUERY_RUN') metrics.queryRuns = quantity
    if (record.metric === 'RAW_RESULTS') metrics.rawResults = quantity
    if (record.metric === 'QUALIFIED_LEAD') metrics.qualifiedLeads = quantity
    if (record.metric === 'SEND_NOW_LEAD') metrics.sendNowLeads = quantity
  }

  return { metrics, periodStart, periodEnd }
}

export async function getEntitlements(organizationId: string) {
  const subscription = await getCurrentSubscription(organizationId)
  const { metrics, periodStart, periodEnd } = await getUsageSummary(organizationId)

  const remainingQueryRuns = Math.max(subscription.plan.monthlyQueryLimit - metrics.queryRuns, 0)
  const revealedLeads = metrics.qualifiedLeads + metrics.sendNowLeads
  const remainingLeadAllowance = Math.max(subscription.plan.monthlyLeadLimit - revealedLeads, 0)

  return {
    subscription,
    plan: subscription.plan,
    usage: metrics,
    periodStart,
    periodEnd,
    remainingQueryRuns,
    remainingLeadAllowance,
    hasQueryCapacity: remainingQueryRuns > 0,
    isLeadQuotaExceeded: remainingLeadAllowance <= 0,
  }
}

export async function recordUsage(input: {
  organizationId: string
  metric: 'QUERY_RUN' | 'RAW_RESULTS' | 'QUALIFIED_LEAD' | 'SEND_NOW_LEAD'
  quantity: number
  queryId?: string
  runId?: string
}) {
  const periodStart = startOfMonth()
  const periodEnd = endOfMonth()

  return db.usageRecord.create({
    data: {
      organizationId: input.organizationId,
      metric: input.metric,
      quantity: input.quantity,
      queryId: input.queryId,
      runId: input.runId,
      periodStart,
      periodEnd,
    },
  })
}

export async function ensureOrganizationHasFreePlan(organizationId: string) {
  await ensurePlansSeeded()
  const plan = await db.plan.findUnique({ where: { code: getPlanDefinition('FREE').code } })
  if (!plan) {
    throw new Error('Default plan is unavailable')
  }

  return db.subscription.create({
    data: {
      organizationId,
      planId: plan.id,
      status: 'TRIALING',
    },
  })
}
