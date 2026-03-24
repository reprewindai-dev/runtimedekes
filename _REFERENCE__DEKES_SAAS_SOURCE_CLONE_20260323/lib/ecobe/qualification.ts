import type { Lead, Query, Run, Organization } from '@prisma/client'

export interface QualificationContext {
  lead: Lead
  query: Query
  run: Run
  organization: Organization
}

export interface QualificationResult {
  isQualified: boolean
  reason: string
  score: number
  signals: string[]
}

const HIGH_INTENT_KEYWORDS = [
  'demo', 'trial', 'pricing', 'cost', 'quote', 'proposal', 'implementation',
  'integration', 'migration', 'deployment', 'enterprise', 'professional',
  'solution', 'platform', 'software', 'service', 'vendor', 'provider',
  'alternative', 'replacement', 'upgrade', 'buy', 'purchase', 'license'
]

const HIGH_VALUE_SIZE_LABELS = ['Enterprise', 'Large', 'Medium', 'Mid-Market']
const MIN_LEAD_SCORE = 70
const MIN_EMPLOYEE_COUNT = 10

export function qualifyLeadForEcobe(context: QualificationContext): QualificationResult {
  const { lead, query, run, organization } = context

  const signals: string[] = []
  let score = 0

  const titleLower = lead.title?.toLowerCase() || ''
  const snippetLower = lead.snippet?.toLowerCase() || ''
  const queryLower = query.query.toLowerCase()
  const combinedText = `${titleLower} ${snippetLower} ${queryLower}`

  const hasHighIntentKeywords = HIGH_INTENT_KEYWORDS.some(kw => combinedText.includes(kw))
  if (hasHighIntentKeywords) {
    signals.push('high-intent-keywords')
    score += 30
  }

  if (lead.score && lead.score >= MIN_LEAD_SCORE) {
    signals.push('high-lead-score')
    score += 25
  }

  const enrichment = lead.meta as any
  if (enrichment) {
    if (enrichment.sizeLabel && HIGH_VALUE_SIZE_LABELS.includes(enrichment.sizeLabel)) {
      signals.push('company-size')
      score += 20
    }

    if (enrichment.employeeCount && enrichment.employeeCount >= MIN_EMPLOYEE_COUNT) {
      signals.push('employee-count')
      score += 15
    }

    if (enrichment.funding && enrichment.funding.length > 0) {
      signals.push('funded')
      score += 10
    }

    if (enrichment.techStack && enrichment.techStack.length > 3) {
      signals.push('tech-maturity')
      score += 5
    }
  }

  if (organization.plan !== 'FREE') {
    signals.push('paid-plan')
    score += 10
  }

  const isQualified = score >= 50

  let reason = ''
  if (isQualified) {
    const topSignals = signals.slice(0, 3).join(', ')
    reason = `Qualified based on: ${topSignals}`
  } else {
    reason = 'Insufficient qualification signals'
  }

  return {
    isQualified,
    reason,
    score,
    signals
  }
}
