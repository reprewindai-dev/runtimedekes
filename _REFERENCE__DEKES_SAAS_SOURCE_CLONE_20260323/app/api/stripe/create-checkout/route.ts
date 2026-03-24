export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { stripe, PLANS } from '@/lib/stripe/client'
import { prisma } from '@/lib/db'
import { validateSession } from '@/lib/auth/jwt'

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      cookies().get('DEKES_SESSION')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(token)
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const plan = body?.plan as unknown
    if (typeof plan !== 'string' || !['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const planConfig = PLANS[plan as keyof typeof PLANS]
    if (!('stripePriceId' in planConfig) || !planConfig.stripePriceId) {
      return NextResponse.json({ error: 'Plan not configured' }, { status: 400 })
    }

    // Create or retrieve Stripe customer
    let customerId = organization.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          organizationId: organization.id,
          userId: session.user.id,
        },
      })
      customerId = customer.id
      await prisma.organization.update({
        where: { id: organization.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      metadata: {
        organizationId: organization.id,
        plan,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
