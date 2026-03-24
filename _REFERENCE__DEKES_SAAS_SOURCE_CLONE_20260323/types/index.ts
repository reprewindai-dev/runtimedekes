// Common type definitions for the DEKES SaaS application

export interface LeadMeta {
  domain?: string
  sizeLabel?: string
  region?: string
  contactName?: string
  contactEmail?: string
  linkedin?: string
  [key: string]: unknown
}

export interface HandoffPayload {
  organization: {
    name: string
    domain: string | null
    sizeLabel: string | null
    region: string | null
  }
  intent: {
    score: number
    reason: string
    keywords: string[]
  }
  contact: {
    name: string | null
    email: string | null
    linkedin: string | null
  }
  source: {
    leadId: string
    queryId: string | null
    runId: string | null
  }
}

export interface EcobeStatsResponse {
  stats: {
    totalHandoffs: number
    sentHandoffs: number
    acceptedHandoffs: number
    convertedHandoffs: number
    conversionRate: number
    acceptanceRate: number
  }
  recentHandoffs: Array<{
    id: string
    status: string
    qualificationScore: number | null
    createdAt: Date
    lead: {
      id: string
      title: string | null
      score: number
      status: string
    }
  }>
  monthlyStats: Array<{
    month: Date
    handoffs: number
    conversions: number
  }>
}

export interface RateLimitResponse {
  allowed: boolean
  resetTime?: number
  remaining?: number
}

export interface SessionCleanupResponse {
  success: boolean
  message: string
  cleanedCount?: number
  error?: string
  timestamp: string
}

export interface AuthUser {
  id: string
  email: string
  name: string | null
  organizationId: string | null
  role: string
}

export interface LoginResponse {
  user: AuthUser
  token: string
}

export interface LeadListItem {
  id: string
  title: string | null
  snippet: string | null
  score: number
  intentClass: string | null
  status: string
  createdAt: Date
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
}

export interface ErrorResponse {
  error: string
  details?: unknown
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp?: string
}
