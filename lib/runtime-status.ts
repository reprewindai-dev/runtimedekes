import { env, isBillingEnabled, isControlPlaneConfigured, isEcobeConfigured, isSearchConfigured } from '@/lib/env'

export type RuntimeIntegrationStatus = {
  name: string
  configured: boolean
  mode: 'active' | 'disabled'
  detail: string
}

export function getRuntimeIntegrationStatus(): RuntimeIntegrationStatus[] {
  return [
    {
      name: 'Search provider',
      configured: isSearchConfigured,
      mode: isSearchConfigured ? 'active' : 'disabled',
      detail: isSearchConfigured
        ? `${env.searchProvider.toUpperCase()} is live and feeding query runs.`
        : 'No search key is configured, so query execution fails closed.',
    },
    {
      name: 'ECOBE routing',
      configured: isEcobeConfigured,
      mode: isEcobeConfigured ? 'active' : 'disabled',
      detail: isEcobeConfigured
        ? 'Paid-plan executions can route through ECOBE when the plan allows it.'
        : 'Execution stays local because the ECOBE adapter is not configured.',
    },
    {
      name: 'Control plane',
      configured: isControlPlaneConfigured,
      mode: isControlPlaneConfigured ? 'active' : 'disabled',
      detail: isControlPlaneConfigured
        ? 'Governed runs are available for Growth and Pro plans.'
        : 'Governed runs stay off until the control-plane adapter is configured.',
    },
    {
      name: 'Billing',
      configured: isBillingEnabled,
      mode: isBillingEnabled ? 'active' : 'disabled',
      detail: isBillingEnabled
        ? 'Checkout, portal, and entitlement gates are live.'
        : 'Billing is disabled until Stripe secrets and price IDs are present.',
    },
  ]
}
