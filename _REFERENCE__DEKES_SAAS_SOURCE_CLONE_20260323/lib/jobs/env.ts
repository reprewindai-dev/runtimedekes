const REQUIRED_JOB_ENV_VARS = [
  'DATABASE_URL',
  'QSTASH_TOKEN',
  'QSTASH_CURRENT_SIGNING_KEY',
  'NEXT_PUBLIC_APP_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'JOBS_ENDPOINT_URL',
  'JOBS_SECRET',
] as const

export type JobEnvVar = (typeof REQUIRED_JOB_ENV_VARS)[number]

export function getMissingJobEnvVars(env: Record<string, string | undefined> = process.env) {
  return REQUIRED_JOB_ENV_VARS.filter((key) => !env[key])
}

export function assertJobEnv(env: Record<string, string | undefined> = process.env) {
  const missing = getMissingJobEnvVars(env)
  if (missing.length > 0) {
    const message = `Missing required job environment variables: ${missing.join(', ')}`
    console.error(message)
    throw new Error(message)
  }
}

export function describeJobEnvStatus(env: Record<string, string | undefined> = process.env) {
  const missing = getMissingJobEnvVars(env)
  return {
    ok: missing.length === 0,
    missing,
  }
}
