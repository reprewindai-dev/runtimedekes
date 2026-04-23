import assert from 'node:assert/strict'
import test from 'node:test'

import { getPlanDefinition } from '@/lib/plans'
import { shouldUseControlPlane, shouldUseEcobe } from '@/lib/runtime-capabilities'

test('starter plan uses ecobe when configured but not the control plane', () => {
  const plan = getPlanDefinition('STARTER')

  assert.equal(shouldUseEcobe(plan.featureFlags, true), true)
  assert.equal(shouldUseControlPlane(plan.featureFlags, true), false)
})

test('growth and pro plans only use the control plane when it is configured', () => {
  for (const code of ['GROWTH', 'PRO'] as const) {
    const plan = getPlanDefinition(code)

    assert.equal(shouldUseControlPlane(plan.featureFlags, false), false)
    assert.equal(shouldUseControlPlane(plan.featureFlags, true), true)
  }
})

test('free plan never routes through paid infrastructure', () => {
  const plan = getPlanDefinition('FREE')

  assert.equal(shouldUseEcobe(plan.featureFlags, true), false)
  assert.equal(shouldUseControlPlane(plan.featureFlags, true), false)
})
