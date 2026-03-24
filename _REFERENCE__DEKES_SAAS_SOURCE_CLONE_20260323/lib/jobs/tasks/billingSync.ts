import { prisma } from '@/lib/db'
import { stripe, PLANS } from '@/lib/stripe/client'
import { recordMetric } from '@/lib/metrics/recorder'
import type { JobResult } from '@/lib/jobs/types'

const BATCH_SIZE = 25

export async function runBillingSyncJob(): Promise<JobResult> {
  if (!stripe) {
    console.warn('Billing sync skipped: Stripe not configured')
    return { success: false, processed: 0, meta: { reason: 'stripe_not_configured' } }
  }

  const organizations = await prisma.organization.findMany({
    where: {
      stripeSubscriptionId: { not: null },
    },
    take: BATCH_SIZE,
    orderBy: { updatedAt: 'asc' },
  })

  let processed = 0
  let downgraded = 0

  for (const org of organizations) {
    if (!org.stripeSubscriptionId) continue
    try {
      const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)
      const status = subscription.status
      const newStatus = status === 'active' ? 'ACTIVE' : status === 'past_due' ? 'PAST_DUE' : 'SUSPENDED'
      const priceId = subscription.items.data[0]?.price?.id

      const targetPlan = Object.entries(PLANS).find(([, plan]) => 'stripePriceId' in plan && plan.stripePriceId === priceId)
      const planKey = (targetPlan?.[0] as keyof typeof PLANS) || 'STARTER'
      const planConfig = PLANS[planKey]

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          status: newStatus,
          plan: planKey,
          stripePriceId: priceId,
          stripeCurrentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
          monthlyLeadQuota: planConfig.monthlyLeadQuota,
        },
      })

      if (newStatus !== 'ACTIVE') {
        downgraded += 1
      }

      processed += 1
    } catch (error) {
      console.error('Billing sync failed for org', org.id, error)
    }
  }

  await recordMetric('job.billing_sync', { processed, downgraded }, 'dekes')

  return { success: true, processed, meta: { downgraded } }
}
