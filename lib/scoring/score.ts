type ScoreInput = {
  queryInput: string
  title: string
  snippet: string
  url: string
  domain: string | null
  enrichment: {
    title?: string | null
    description?: string | null
    companyName?: string | null
    contactEmail?: string | null
  }
}

const intentKeywords = [
  'looking for',
  'need',
  'seeking',
  'vendor',
  'agency',
  'consultant',
  'outsource',
  'rfp',
  'migration',
  'automation',
  'launch',
]

const urgencyKeywords = ['asap', 'urgent', 'immediately', 'this quarter', 'deadline', 'launching']
const fitKeywords = ['b2b', 'saas', 'startup', 'team', 'growth', 'revenue', 'pipeline']

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function scoreLead(input: ScoreInput) {
  const text = [
    input.queryInput,
    input.title,
    input.snippet,
    input.enrichment.title ?? '',
    input.enrichment.description ?? '',
    input.enrichment.companyName ?? '',
  ]
    .join(' ')
    .toLowerCase()

  let score = 12
  const reasons: string[] = []

  const intentHits = intentKeywords.filter((keyword) => text.includes(keyword))
  const urgencyHits = urgencyKeywords.filter((keyword) => text.includes(keyword))
  const fitHits = fitKeywords.filter((keyword) => text.includes(keyword))

  score += intentHits.length * 12
  score += urgencyHits.length * 10
  score += fitHits.length * 6

  if (input.domain && !input.domain.endsWith('.gov') && !input.domain.endsWith('.edu')) {
    score += 8
    reasons.push('Commercial domain detected')
  }

  if (input.enrichment.contactEmail) {
    score += 10
    reasons.push('Direct contact discovered')
  }

  if (input.snippet.length > 120) {
    score += 6
  }

  if (input.url.includes('/blog') || input.url.includes('/case-study')) {
    score += 4
    reasons.push('Publishing activity suggests active demand generation')
  }

  if (input.url.includes('/careers') || input.url.includes('/jobs')) {
    score -= 20
    reasons.push('Hiring page is weak buyer evidence')
  }

  for (const keyword of intentHits) {
    reasons.push(`Intent keyword: ${keyword}`)
  }

  for (const keyword of urgencyHits) {
    reasons.push(`Urgency signal: ${keyword}`)
  }

  for (const keyword of fitHits) {
    reasons.push(`Fit signal: ${keyword}`)
  }

  return {
    score: clamp(score, 0, 100),
    reasons,
  }
}
