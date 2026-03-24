const evaluationTerms = ['compare', 'comparison', 'alternatives', 'pricing', 'vendor', 'evaluation', 'vs']
const hiringTerms = ['careers', 'hiring', 'job', 'open role']
const fundingTerms = ['series a', 'series b', 'series c', 'funding', 'raised', 'seed']
const contentTerms = ['webinar', 'newsletter', 'podcast', 'blog', 'content marketing', 'case study']
const gtmTerms = ['demand generation', 'growth marketing', 'sales development', 'revenue operations', 'marketing', 'sales']
const categoryTerms = ['software', 'saas', 'b2b', 'ai']

function hasAnyTerm(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function buildClause(terms: string[]) {
  return `(${terms.map((term) => `"${term}"`).join(' OR ')})`
}

function extractSiteScope(query: string) {
  return query.match(/site:[^\s)]+/i)?.[0] ?? 'site:*.com'
}

function extractCategoryClause(query: string) {
  const lower = query.toLowerCase()
  const matched = categoryTerms.filter((term) => lower.includes(term))
  return matched.length ? buildClause(matched) : '"software"'
}

export function buildSearchQueryVariants(query: string) {
  const normalized = query.trim().replace(/\s+/g, ' ')
  const lower = normalized.toLowerCase()
  const siteScope = extractSiteScope(normalized)
  const categoryClause = extractCategoryClause(normalized)
  const gtmClause = buildClause(gtmTerms)
  const contentClause = buildClause(contentTerms)

  const variants = [normalized]

  if (hasAnyTerm(lower, hiringTerms)) {
    variants.push(`${siteScope} ${gtmClause} ("careers" OR "hiring") ${categoryClause}`)
  }

  if (hasAnyTerm(lower, evaluationTerms)) {
    variants.push(`${siteScope} ${gtmClause} ("pricing" OR "compare" OR "alternatives") ${categoryClause}`)
  }

  if (hasAnyTerm(lower, fundingTerms)) {
    variants.push(`${siteScope} ("series a" OR funding OR raised OR expansion) ${gtmClause} ("careers" OR "hiring") ${categoryClause}`)
  }

  if (hasAnyTerm(lower, contentTerms)) {
    variants.push(`${siteScope} ${contentClause} ${gtmClause} ("careers" OR "hiring") ${categoryClause}`)
  }

  return [...new Set(variants.map((entry) => entry.trim()))].slice(0, 4)
}
