export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    if (!webhookSecret) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const body = await request.text()
    const sig = request.headers.get('stripe-signature')
    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const baseSession = event.data.object as Stripe.Checkout.Session
        const organizationId = baseSession.metadata?.organizationId
        const plan = baseSession.metadata?.plan

        if (organizationId && plan) {
          const session = await stripe.checkout.sessions.retrieve(baseSession.id, {
            expand: ['line_items.data.price'],
          })

          const stripePriceId = session.line_items?.data?.[0]?.price?.id ?? null

          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              stripeSubscriptionId: (session.subscription as string) || null,
              stripePriceId,
              plan: plan as any,
              status: 'ACTIVE',
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const organization = await prisma.organization.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        })

        if (organization) {
          await prisma.organization.update({
            where: { id: organization.id },
            data: {
              status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const organization = await prisma.organization.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        })

        if (organization) {
          await prisma.organization.update({
            where: { id: organization.id },
            data: {
              plan: 'FREE',
              status: 'CANCELED',
              stripeSubscriptionId: null,
              stripePriceId: null,
            },
          })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
