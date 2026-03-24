import { EcobeEventType, EcobeEventSeverity, EcobeEventClassification } from '@prisma/client'

export function classifyEcobeEvent(
  eventType: EcobeEventType,
  severity: EcobeEventSeverity,
  delayMinutes?: number
): EcobeEventClassification {
  if (eventType === 'BUDGET_EXCEEDED') return 'RISK'
  if (eventType === 'BUDGET_WARNING') return 'RISK'
  if (eventType === 'POLICY_DELAY') {
    return (delayMinutes ?? 0) > 60 ? 'RISK' : 'INFORMATIONAL'
  }
  if (severity === 'CRITICAL') return 'RISK'
  if (severity === 'WARNING') return 'RISK'
  return 'INFORMATIONAL'
}
