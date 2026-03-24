import Stripe from 'stripe'

import { env } from '@/lib/env'
import type { PlanCode } from '@/lib/plans'

let stripe: Stripe | null = null

export function getStripeClient() {
  if (!env.stripeSecretKey) {
    throw new Error('Stripe is not configured')
  }

  if (!stripe) {
    stripe = new Stripe(env.stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    })
  }

  return stripe
}

export function getStripePriceId(planCode: PlanCode) {
  switch (planCode) {
    case 'STARTER':
      return env.stripeStarterPriceId
    case 'GROWTH':
      return env.stripeGrowthPriceId
    case 'PRO':
      return env.stripeProPriceId
    default:
      return ''
  }
}
