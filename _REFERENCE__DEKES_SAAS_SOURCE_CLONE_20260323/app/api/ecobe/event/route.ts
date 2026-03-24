export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { classifyEcobeEvent } from '@/lib/ecobe/classify'
import { EcobeEventType, EcobeEventSeverity } from '@prisma/client'

const FIRST_RELEASE_EVENT_TYPES = new Set<string>([
  'BUDGET_WARNING',
  'BUDGET_EXCEEDED',
  'POLICY_DELAY',
])

type InboundEventBody = {
  handoffId: string
  organizationId: string
  eventType: string
  severity: string
  routing?: {
    decisionId?: string
    action?: string
    selectedRegion?: string
  }
  budget?: {
    used?: number
    limit?: number
    currency?: string
  }
  policy?: {
    id?: string
    action?: string
    delayMinutes?: number
  }
  predictedCleanWindow?: {
    region?: string
    expectedMinutes?: number
  }
  signalProvenance?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.ECOBE_WEBHOOK_SECRET}`
  if (!process.env.ECOBE_WEBHOOK_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: InboundEventBody
  try {
    body = (await request.json()) as InboundEventBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { handoffId, organizationId, eventType, severity, routing, budget, policy, predictedCleanWindow } = body

  if (!handoffId || !organizationId || !eventType || !severity) {
    return NextResponse.json(
      { error: 'Missing required fields: handoffId, organizationId, eventType, severity' },
      { status: 400 }
    )
  }

  // First-release scope: only accept supported event types
  if (!FIRST_RELEASE_EVENT_TYPES.has(eventType)) {
    return NextResponse.json(
      { error: `Unsupported eventType: ${eventType}. Accepted: ${[...FIRST_RELEASE_EVENT_TYPES].join(', ')}` },
      { status: 422 }
    )
  }

  // Validate enum values
  const validEventTypes: string[] = Object.values(EcobeEventType)
  const validSeverities: string[] = Object.values(EcobeEventSeverity)
  if (!validEventTypes.includes(eventType)) {
    return NextResponse.json({ error: `Invalid eventType: ${eventType}` }, { status: 422 })
  }
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: `Invalid severity: ${severity}` }, { status: 422 })
  }

  // Idempotency: if already processed, return early
  const existing = await prisma.ecobeInboundEvent.findUnique({ where: { handoffId } })
  if (existing) {
    return NextResponse.json({ status: 'already_processed', id: existing.id }, { status: 200 })
  }

  // Classify the event
  const delayMinutes = policy?.delayMinutes
  const classification = classifyEcobeEvent(
    eventType as EcobeEventType,
    severity as EcobeEventSeverity,
    delayMinutes
  )

  // Build replay URL from ECOBE dashboard base + decision ID
  let replayUrl: string | undefined
  if (routing?.decisionId) {
    const base = (process.env.NEXT_PUBLIC_ECOBE_DASHBOARD_URL ?? 'https://app.ecobe.dev').replace(/\/+$/, '')
    replayUrl = `${base}/decisions/${routing.decisionId}`
  }

  const event = await prisma.ecobeInboundEvent.create({
    data: {
      organizationId,
      handoffId,
      eventType: eventType as EcobeEventType,
      severity: severity as EcobeEventSeverity,
      classification,
      rawPayload: body as object,
      budgetUsed: budget?.used ?? null,
      budgetLimit: budget?.limit ?? null,
      budgetCurrency: budget?.currency ?? null,
      policyId: policy?.id ?? null,
      policyAction: policy?.action ?? null,
      delayMinutes: delayMinutes ?? null,
      cleanWindowRegion: predictedCleanWindow?.region ?? null,
      replayUrl: replayUrl ?? null,
    },
  })

  return NextResponse.json({ received: true, classification, id: event.id }, { status: 201 })
}
