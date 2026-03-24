import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyResultPageType, filterSearchResults } from '@/lib/leads/junk-filter'
import { resolveLeadStatus } from '@/lib/leads/status'
import { scoreLead } from '@/lib/scoring/score'

test('scoreLead promotes strong commercial intent', () => {
  const result = scoreLead({
    queryInput: 'need video editing agency for SaaS launch',
    title: 'B2B SaaS team looking for a video editing agency',
    snippet: 'We need an agency ASAP for our launch pipeline and demand generation videos.',
    url: 'https://example.com/blog/b2b-saas-video-launch',
    domain: 'example.com',
    enrichment: {
      title: 'Example',
      description: 'B2B SaaS company shipping revenue software',
      companyName: 'Example',
      contactEmail: 'hello@example.com',
    },
  })

  assert.ok(result.score >= 80)
  assert.equal(resolveLeadStatus(result.score), 'SEND_NOW')
})

test('junk filter removes non-buyer noise', () => {
  const filtered = filterSearchResults([
    {
      title: 'Cookie policy',
      url: 'https://example.com/privacy',
      snippet: 'Cookie policy and legal notes',
    },
    {
      title: 'SaaS company looking for an agency',
      url: 'https://buyer.example.com/blog/saas-agency-search',
      snippet: 'We are looking for an agency partner this quarter.',
    },
  ])

  assert.equal(filtered.kept.length, 1)
  assert.equal(filtered.rejected.length, 1)
})

test('hard reject classification catches list pages and blocked domains', () => {
  assert.equal(
    classifyResultPageType({
      title: 'Top growth platforms for SaaS',
      url: 'https://example.com/blog/top-growth-platforms',
      snippet: 'A roundup of the best tools.',
    }),
    'list',
  )

  const filtered = filterSearchResults([
    {
      title: 'Top growth platforms for SaaS',
      url: 'https://www.linkedin.com/company/example',
      snippet: 'Blocked platform URL',
    },
  ])

  assert.equal(filtered.kept.length, 0)
  assert.equal(filtered.rejected.length, 1)
})
