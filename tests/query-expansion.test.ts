import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSearchQueryVariants } from '@/lib/adapters/execution-client/query-expansion'

test('query expansion adds hiring and evaluation variants', () => {
  const variants = buildSearchQueryVariants(
    'site:*.com (careers OR hiring) ("demand generation" OR "growth marketing") (compare OR alternatives OR pricing) software',
  )

  assert.ok(variants.length >= 3)
  assert.ok(variants.some((entry) => entry.includes('("careers" OR "hiring")')))
  assert.ok(variants.some((entry) => entry.includes('("pricing" OR "compare" OR "alternatives")')))
})

test('query expansion adds funding variant for funding-led searches', () => {
  const variants = buildSearchQueryVariants(
    'site:*.com ("series a" OR funding OR raised) (careers OR hiring) (marketing OR sales OR growth) software',
  )

  assert.ok(variants.some((entry) => entry.includes('("series a" OR funding OR raised OR expansion)')))
})
