const required = [
  ['DATABASE_URL', 'the production Postgres connection string'],
  ['APP_URL', 'the public Render service URL'],
  ['SESSION_SECRET', 'the session signing secret'],
]

const placeholderPatterns = [
  /your-render-postgres-host/i,
  /replace-with/i,
  /localhost:5432\/dekes_signed_runtime/i,
]

const failures = []

for (const [key, description] of required) {
  const value = process.env[key]

  if (!value || !value.trim()) {
    failures.push(`${key} is missing (${description})`)
    continue
  }

  if (placeholderPatterns.some((pattern) => pattern.test(value))) {
    failures.push(`${key} still contains a placeholder value`)
  }
}

if (process.env.NODE_ENV === 'production') {
  const hasSearchProvider =
    Boolean(process.env.SERPER_API_KEY?.trim()) ||
    Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim()) ||
    Boolean(process.env.SERPAPI_API_KEY?.trim())

  if (!hasSearchProvider) {
    failures.push('no search provider key is configured (SERPER_API_KEY, BRAVE_SEARCH_API_KEY, or SERPAPI_API_KEY)')
  }
}

if (failures.length > 0) {
  console.error('DEKES runtime environment validation failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

