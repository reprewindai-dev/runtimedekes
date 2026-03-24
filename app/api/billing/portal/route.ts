import { NextResponse } from 'next/server'

import { getCurrentSession } from '@/lib/auth/server'
import { getCurrentSubscription } from '@/lib/billing/entitlements'
import { getStripeClient } from '@/lib/billing/stripe'
import { env } from '@/lib/env'

export async function POST() {
  const session = await getCurrentSession()
  if (!session?.organization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stripe = getStripeClient()
    const subscription = await getCurrentSubscription(session.organization.id)

    if (!subscription.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer is attached yet' }, { status: 400 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${env.appUrl}/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Billing portal request failed',
      },
      { status: 500 },
    )
  }
}
