import type Stripe from 'stripe'
import { NextResponse } from 'next/server'

import { ensurePlansSeeded } from '@/lib/billing/entitlements'
import { getStripeClient, getStripePriceId } from '@/lib/billing/stripe'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

const planCodeFromPriceId = (priceId: string | null | undefined) => {
  if (!priceId) return 'FREE'
  if (priceId === env.stripeStarterPriceId) return 'STARTER'
  if (priceId === env.stripeGrowthPriceId) return 'GROWTH'
  if (priceId === env.stripeProPriceId) return 'PRO'
  return 'FREE'
}

const subscriptionStatusFromStripe = (status: Stripe.Subscription.Status) => {
  switch (status) {
    case 'trialing':
      return 'TRIALING'
    case 'active':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'unpaid':
      return 'UNPAID'
    case 'incomplete':
    case 'incomplete_expired':
      return 'INCOMPLETE'
    case 'canceled':
    case 'paused':
      return 'CANCELED'
    default:
      return 'TRIALING'
  }
}

async function syncSubscriptionRecord(subscription: Stripe.Subscription) {
  await ensurePlansSeeded()
  const stripeSubscription = subscription as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }

  const priceId = stripeSubscription.items.data[0]?.price.id ?? null
  const planCode = planCodeFromPriceId(priceId)
  const plan = await db.plan.findUnique({
    where: { code: planCode },
  })

  if (!plan) {
    return
  }

  const existing = await db.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        { stripeCustomerId: subscription.customer as string },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!existing) {
    return
  }

  await db.subscription.update({
    where: { id: existing.id },
    data: {
      planId: plan.id,
      status: subscriptionStatusFromStripe(stripeSubscription.status),
      stripeCustomerId: stripeSubscription.customer as string,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      currentPeriodStart: stripeSubscription.current_period_start
        ? new Date(stripeSubscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  })
}

export async function POST(request: Request) {
  if (!env.stripeWebhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripeClient()
    const payload = await request.text()
    event = stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Invalid webhook payload',
      },
      { status: 400 },
    )
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const organizationId = session.client_reference_id ?? session.metadata?.organizationId
      if (organizationId) {
        const subscription = await db.subscription.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
        })

        if (subscription) {
          await db.subscription.update({
            where: { id: subscription.id },
            data: {
              stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
              stripeSubscriptionId:
                typeof session.subscription === 'string' ? session.subscription : null,
              stripePriceId: session.metadata?.planCode
                ? getStripePriceId(session.metadata.planCode as 'STARTER' | 'GROWTH' | 'PRO')
                : subscription.stripePriceId,
              status: 'ACTIVE',
            },
          })
        }
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscriptionRecord(event.data.object as Stripe.Subscription)
      break
    default:
      break
  }

  return NextResponse.json({ received: true })
}
