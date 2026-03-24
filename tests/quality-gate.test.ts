import assert from 'node:assert/strict'
import test from 'node:test'

import { filterSearchResults } from '@/lib/leads/junk-filter'
import { matchesSoftwareCategory, passesLeadQualityGate } from '@/lib/leads/signal-pipeline'

test('junk filter rejects job-board style root domains', () => {
  const filtered = filterSearchResults([
    {
      title: 'Demand generation roles',
      url: 'https://workingnomads.com/jobs/demand-generation-manager',
      snippet: 'Remote jobs for growth marketers.',
    },
  ])

  assert.equal(filtered.kept.length, 0)
  assert.equal(filtered.rejected.length, 1)
})

test('quality gate rejects directory-like business contexts', () => {
  const accepted = passesLeadQualityGate({
    domain: 'betalist.com',
    companyName: 'BetaList',
    businessContext: 'Startup directory for discovering newly launched startups and startup launches.',
    homepagePageType: 'directory',
    signals: [
      {
        key: 'PRODUCT_COMPARISON',
        label: 'Product evaluation behavior',
        explanation: 'Comparison behavior detected.',
        excerpt: 'Compare startup tools',
        sourceUrl: 'https://betalist.com/pricing',
        source: 'evaluation_page',
        strength: 5,
        observedAt: '2026-03-23T00:00:00.000Z',
        timingWindowDays: 7,
        buyingStage: 'Active evaluation',
        outreachAngle: 'Lead with a point of difference.',
      },
      {
        key: 'CONTENT_WITHOUT_DISTRIBUTION',
        label: 'Content production without distribution',
        explanation: 'Content signal detected.',
        excerpt: 'Startup launches this week',
        sourceUrl: 'https://betalist.com',
        source: 'content_surface',
        strength: 4,
        observedAt: '2026-03-23T00:00:00.000Z',
        timingWindowDays: 21,
        buyingStage: 'Execution gap',
        outreachAngle: 'Lead with distribution support.',
      },
    ],
  })

  assert.equal(accepted, false)
})

test('quality gate rejects hiring plus research spike without an anchor signal', () => {
  const accepted = passesLeadQualityGate({
    domain: 'mckinsey.com',
    companyName: 'McKinsey',
    businessContext: 'Global consulting firm advising enterprise clients.',
    homepagePageType: 'company',
    signals: [
      {
        key: 'HIRING_GROWTH',
        label: 'Hiring tied to growth',
        explanation: 'Hiring signal detected.',
        excerpt: 'Growth role open now',
        sourceUrl: 'https://mckinsey.com/careers/role',
        source: 'careers_page',
        strength: 4,
        observedAt: '2026-03-23T00:00:00.000Z',
        timingWindowDays: 14,
        buyingStage: 'Solution evaluation',
        outreachAngle: 'Lead with faster pipeline execution.',
      },
      {
        key: 'RESEARCH_SPIKE',
        label: 'Research spike',
        explanation: 'Multiple pages surfaced.',
        excerpt: 'Two pages detected',
        sourceUrl: 'https://mckinsey.com',
        source: 'search_result_cluster',
        strength: 3,
        observedAt: '2026-03-23T00:00:00.000Z',
        timingWindowDays: 7,
        buyingStage: 'Problem framing',
        outreachAngle: 'Lead with faster clarity.',
      },
    ],
  })

  assert.equal(accepted, false)
})

test('software context matcher rejects non-software services for software searches', () => {
  assert.equal(matchesSoftwareCategory('Executive search firm placing GTM leaders globally.'), false)
  assert.equal(matchesSoftwareCategory('Revenue intelligence software platform for enterprise sales teams.'), true)
})
