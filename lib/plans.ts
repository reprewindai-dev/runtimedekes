export type PlanCode = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO'

export type PlanDefinition = {
  code: PlanCode
  name: string
  description: string
  monthlyPriceCents: number
  monthlyQueryLimit: number
  monthlyLeadLimit: number
  monthlyUserLimit: number
  featureFlags: Record<string, unknown>
}

export const planCatalog: PlanDefinition[] = [
  {
    code: 'FREE',
    name: 'Trial',
    description: 'Get into the product fast, see buyer intelligence, and hit the upgrade wall quickly.',
    monthlyPriceCents: 0,
    monthlyQueryLimit: 2,
    monthlyLeadLimit: 15,
    monthlyUserLimit: 1,
    featureFlags: {
      ecobeRouting: false,
      controlPlaneValidation: false,
      apiAccess: false,
    },
  },
  {
    code: 'STARTER',
    name: 'Starter',
    description: 'For operators who need a focused stream of buying signals.',
    monthlyPriceCents: 14900,
    monthlyQueryLimit: 20,
    monthlyLeadLimit: 100,
    monthlyUserLimit: 3,
    featureFlags: {
      ecobeRouting: true,
      controlPlaneValidation: false,
      apiAccess: true,
    },
  },
  {
    code: 'GROWTH',
    name: 'Growth',
    description: 'For teams scaling a repeatable buyer-intelligence workflow.',
    monthlyPriceCents: 39900,
    monthlyQueryLimit: 100,
    monthlyLeadLimit: 500,
    monthlyUserLimit: 8,
    featureFlags: {
      ecobeRouting: true,
      controlPlaneValidation: true,
      apiAccess: true,
    },
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'For teams that want high-volume buyer discovery with governed execution.',
    monthlyPriceCents: 99900,
    monthlyQueryLimit: 400,
    monthlyLeadLimit: 2000,
    monthlyUserLimit: 20,
    featureFlags: {
      ecobeRouting: true,
      controlPlaneValidation: true,
      apiAccess: true,
      priorityRouting: true,
    },
  },
]

export function getPlanDefinition(code: string) {
  return planCatalog.find((plan) => plan.code === code) ?? planCatalog[0]
}
