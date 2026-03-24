import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentSession } from '@/lib/auth/server'
import { getCurrentSubscription } from '@/lib/billing/entitlements'
import { getStripeClient, getStripePriceId } from '@/lib/billing/stripe'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

const schema = z.object({
  planCode: z.enum(['STARTER', 'GROWTH', 'PRO']),
})

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session?.organization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid billing payload' }, { status: 400 })
  }

  const priceId = getStripePriceId(parsed.data.planCode)
  if (!priceId) {
    return NextResponse.json({ error: 'Stripe price is not configured for this plan' }, { status: 503 })
  }

  try {
    const stripe = getStripeClient()
    const subscription = await getCurrentSubscription(session.organization.id)

    let customerId = subscription.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.organization.name,
        metadata: {
          organizationId: session.organization.id,
          organizationSlug: session.organization.slug,
        },
      })

      customerId = customer.id

      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          stripeCustomerId: customerId,
        },
      })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: session.organization.id,
      metadata: {
        organizationId: session.organization.id,
        planCode: parsed.data.planCode,
      },
      success_url: `${env.appUrl}/billing?checkout=success`,
      cancel_url: `${env.appUrl}/billing?checkout=cancel`,
    })

    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        stripeCustomerId: customerId,
        stripePriceId: priceId,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Checkout session failed',
      },
      { status: 500 },
    )
  }
}
