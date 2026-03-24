import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    monthlyLeadQuota: 100,
    features: ['100 leads/month', 'Basic scoring', 'Email support'],
  },
  STARTER: {
    name: 'Starter',
    price: 129,
    monthlyLeadQuota: 100,
    maxActiveScans: 5,
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    features: ['100 qualified leads/month', '5 active scans', 'Intent classification', 'Basic scoring', 'Email support'],
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 349,
    monthlyLeadQuota: 500,
    maxActiveScans: 20,
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL,
    features: ['500 qualified leads/month', '20 active scans', 'Advanced intent detection', 'Multi-signal scoring', 'Contact enrichment', 'Priority support'],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 0,
    monthlyLeadQuota: -1,
    maxActiveScans: -1,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features: ['Unlimited qualified leads', 'Unlimited scans', 'Custom scoring weights', 'API access', 'Dedicated success manager', 'SLA guarantee'],
  },
} as const
