const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  appName: process.env.APP_NAME ?? 'DEKES',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? '',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  searchProvider: process.env.SEARCH_PROVIDER ?? 'serper',
  serperApiKey: process.env.SERPER_API_KEY ?? '',
  braveSearchApiKey: process.env.BRAVE_SEARCH_API_KEY ?? '',
  serpApiKey: process.env.SERPAPI_API_KEY ?? '',
  enrichmentUserAgent:
    process.env.ENRICHMENT_USER_AGENT ?? 'DEKES Runtime/1.0 (+https://dekes.app)',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePublishableKey:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  stripeStarterPriceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
  stripeGrowthPriceId: process.env.STRIPE_GROWTH_PRICE_ID ?? '',
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
  ecobeBaseUrl: process.env.ECOBE_BASE_URL ?? '',
  ecobeApiKey: process.env.ECOBE_API_KEY ?? '',
  controlPlaneBaseUrl: process.env.CONTROL_PLANE_BASE_URL ?? '',
  controlPlaneApiKey: process.env.CONTROL_PLANE_API_KEY ?? '',
  executionTimeoutMs: toNumber(process.env.EXECUTION_API_TIMEOUT_MS, 12000),
}

export const isBillingEnabled = Boolean(
  env.stripeSecretKey &&
    env.stripeWebhookSecret &&
    (env.stripeStarterPriceId || env.stripeGrowthPriceId || env.stripeProPriceId),
)

export const isSearchConfigured =
  (env.searchProvider === 'serper' && Boolean(env.serperApiKey)) ||
  (env.searchProvider === 'brave' && Boolean(env.braveSearchApiKey)) ||
  (env.searchProvider === 'serpapi' && Boolean(env.serpApiKey))
