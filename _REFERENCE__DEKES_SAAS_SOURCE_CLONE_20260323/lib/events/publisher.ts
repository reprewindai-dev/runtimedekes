import { prisma } from '@/lib/db'
import type { JsonValue } from '@/lib/jobs/types'

export type DomainEvent = {
  type: string
  payload?: JsonValue
  source?: string
  correlationId?: string
}

async function forwardToWebhook(event: DomainEvent) {
  const url = process.env.EVENT_WEBHOOK_URL
  if (!url) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-event-type': event.type,
      },
      body: JSON.stringify({ ...event, timestamp: new Date().toISOString() }),
    })
  } catch (error) {
    console.error('Event webhook dispatch failed', error)
  }
}

export async function publishEvent(event: DomainEvent) {
  const value: JsonValue = {
    payload: event.payload ?? null,
    correlationId: event.correlationId ?? null,
    emittedAt: new Date().toISOString(),
  }

  await prisma.operationalMetric.create({
    data: {
      name: `event:${event.type}`,
      scope: event.source,
      value,
    },
  })

  await forwardToWebhook(event)
}
