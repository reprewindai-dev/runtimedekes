import type { LeadStatus } from '@prisma/client'

export function resolveLeadStatus(score: number): LeadStatus {
  if (score >= 85) return 'SEND_NOW'
  if (score >= 70) return 'QUEUE'
  if (score >= 58) return 'HOLD'
  return 'REJECTED'
}
