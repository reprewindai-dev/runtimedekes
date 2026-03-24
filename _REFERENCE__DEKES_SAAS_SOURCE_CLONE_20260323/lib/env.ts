/**
 * Runtime environment validation for DEKES SaaS.
 * Import this at the top of any server-side entry point to fail fast
 * if critical env vars are missing.
 */

interface EnvCheck {
  key: string
  required: boolean
  label: string
}

const checks: EnvCheck[] = [
  { key: 'DATABASE_URL', required: true, label: 'PostgreSQL connection string' },
  { key: 'JWT_SECRET', required: process.env.NODE_ENV === 'production', label: 'JWT signing secret' },
  { key: 'NEXT_PUBLIC_APP_URL', required: false, label: 'Public app URL (for QStash callbacks)' },
  { key: 'QSTASH_TOKEN', required: false, label: 'Upstash QStash token' },
  { key: 'UPSTASH_REDIS_REST_URL', required: false, label: 'Upstash Redis URL' },
  { key: 'STRIPE_SECRET_KEY', required: false, label: 'Stripe secret key' },
  { key: 'ECOBE_API_BASE_URL', required: false, label: 'ECOBE engine URL' },
  { key: 'DIRECT_DATABASE_URL', required: false, label: 'Direct DB URL for migrations' },
]

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = []
  const warnings: string[] = []

  for (const check of checks) {
    const value = process.env[check.key]
    if (!value || value.trim() === '') {
      if (check.required) {
        missing.push(`${check.key} (${check.label})`)
      } else {
        warnings.push(`${check.key} not set — ${check.label}`)
      }
    }
  }

  return { valid: missing.length === 0, missing, warnings }
}

/**
 * Call this from instrumentation.ts or a top-level server component
 * to log env status at boot.
 */
export function logEnvStatus() {
  const { valid, missing, warnings } = validateEnv()

  if (missing.length > 0) {
    console.error('=== DEKES FATAL: Missing required environment variables ===')
    for (const m of missing) {
      console.error(`  ✗ ${m}`)
    }
    console.error('=== The app will not function correctly without these. ===')
  }

  if (warnings.length > 0) {
    console.warn('=== DEKES ENV WARNINGS ===')
    for (const w of warnings) {
      console.warn(`  ⚠ ${w}`)
    }
  }

  if (valid && warnings.length === 0) {
    console.log('✅ DEKES env validation passed — all required variables set')
  }

  return valid
}
