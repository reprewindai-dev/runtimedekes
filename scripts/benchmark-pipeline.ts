import 'dotenv/config'

const benchmarkQueries = [
  {
    name: 'GTM hiring plus pricing',
    input:
      'site:*.com (careers OR hiring) ("demand generation" OR "growth marketing" OR "sales development") (compare OR alternatives OR pricing) software',
  },
  {
    name: 'Funding plus GTM hiring',
    input: 'site:*.com ("series a" OR funding OR raised) (careers OR hiring) (marketing OR sales OR growth) software',
  },
  {
    name: 'Content engine without distribution',
    input:
      'site:*.com (webinar OR newsletter OR podcast OR blog) (careers OR hiring) ("content marketing" OR "demand generation") software',
  },
  {
    name: 'Evaluation behavior in B2B SaaS',
    input: 'site:*.com (compare OR alternatives OR pricing) ("revenue operations" OR "demand generation" OR "sales") saas',
  },
]

async function main() {
  const searchModule = (await import('../lib/adapters/execution-client/index')) as {
    searchWeb?: (typeof import('../lib/adapters/execution-client/index'))['searchWeb']
    default?: { searchWeb?: (typeof import('../lib/adapters/execution-client/index'))['searchWeb'] }
  }
  const pipelineModule = (await import('../lib/leads/signal-pipeline')) as {
    packageBuyerIntelligence?: (typeof import('../lib/leads/signal-pipeline'))['packageBuyerIntelligence']
    default?: { packageBuyerIntelligence?: (typeof import('../lib/leads/signal-pipeline'))['packageBuyerIntelligence'] }
  }

  const searchWeb = searchModule.searchWeb ?? searchModule.default?.searchWeb
  const packageBuyerIntelligence =
    pipelineModule.packageBuyerIntelligence ?? pipelineModule.default?.packageBuyerIntelligence

  if (!searchWeb || !packageBuyerIntelligence) {
    throw new Error('Benchmark imports could not be resolved')
  }

  const summaries = []

  for (const query of benchmarkQueries) {
    const rawResults = await searchWeb({ query: query.input, market: 'en-US' })
    const packaged = await packageBuyerIntelligence(query.input, rawResults, { market: 'en-US' })

    summaries.push({
      queryName: query.name,
      rawResultCount: packaged.rawCount,
      keptResultCount: packaged.keptCount,
      qualifiedLeadCount: packaged.leads.length,
      rejectedLeadCount: packaged.rejectedCount,
      leads: packaged.leads.slice(0, 3).map((lead) => ({
        companyName: lead.companyName,
        domain: lead.domain,
        status: lead.status,
        score: lead.score,
        whyNow: lead.whyNow,
        evidenceSummary: lead.evidenceSummary,
      })),
    })
  }

  console.log(JSON.stringify(summaries, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
