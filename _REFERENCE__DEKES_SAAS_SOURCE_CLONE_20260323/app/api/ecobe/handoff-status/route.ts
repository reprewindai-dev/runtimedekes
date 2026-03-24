export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getEcobeHandoffStatus } from '@/lib/ecobe/client'
import { publishEvent } from '@/lib/events/publisher'
import { recordMetric } from '@/lib/metrics/recorder'
import { classifyEcobeEvent } from '@/lib/ecobe/classify'
import { EcobeEventType, EcobeEventSeverity } from '@prisma/client'

const statusUpdateSchema = z.object({
  externalId: z.string(),
  status: z.enum(['ACCEPTED', 'CONVERTED', 'FAILED']),
  convertedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  secret: z.string(),
  eventSnapshot: z
    .object({
      eventType: z.string().optional(),
      severity: z.string().optional(),
      replayUrl: z.string().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { externalId, status, convertedAt, notes, secret, eventSnapshot } = statusUpdateSchema.parse(body)

    if (secret !== process.env.ECOBE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const handoff = await prisma.ecobeHandoff.findFirst({
      where: {
        externalLeadId: externalId,
      },
      include: {
        lead: true,
        organization: true,
      },
    })

    if (!handoff) {
      return NextResponse.json({ error: 'Handoff not found' }, { status: 404 })
    }

    const updateData: any = {
      status,
    }

    if (convertedAt) {
      updateData.convertedAt = new Date(convertedAt)
    }

    if (notes) {
      updateData.notes = notes
    }

    const updatedHandoff = await prisma.ecobeHandoff.update({
      where: { id: handoff.id },
      data: updateData,
    })

    await publishEvent({
      type: `ECOBE_HANDOFF_${status}`,
      payload: {
        handoffId: handoff.id,
        leadId: handoff.leadId,
        externalId,
        status,
        convertedAt,
        notes,
      } as any,
    })

    await recordMetric(`ECOBE_HANDOFF_${status}`, {
      handoffId: handoff.id,
      leadId: handoff.leadId,
      externalId,
      status,
      convertedAt,
    } as any, handoff.organizationId)

    if (status === 'CONVERTED' && handoff.lead) {
      await prisma.lead.update({
        where: { id: handoff.leadId! },
        data: {
          status: 'WON',
        },
      })

      await publishEvent({
        type: 'LEAD_CONVERTED',
        payload: {
          leadId: handoff.leadId!,
          handoffId: handoff.id,
          externalId,
          convertedAt,
        } as any,
      })
    }

    // Log supplementary inbound event snapshot if provided
    if (eventSnapshot?.eventType && eventSnapshot?.severity) {
      const validEventTypes: string[] = Object.values(EcobeEventType)
      const validSeverities: string[] = Object.values(EcobeEventSeverity)
      const snapshotEventType = eventSnapshot.eventType
      const snapshotSeverity = eventSnapshot.severity
      const snapshotHandoffId = `status:${handoff.id}`

      if (validEventTypes.includes(snapshotEventType) && validSeverities.includes(snapshotSeverity)) {
        const exists = await prisma.ecobeInboundEvent.findUnique({ where: { handoffId: snapshotHandoffId } })
        if (!exists) {
          await prisma.ecobeInboundEvent.create({
            data: {
              organizationId: handoff.organizationId,
              handoffId: snapshotHandoffId,
              eventType: snapshotEventType as EcobeEventType,
              severity: snapshotSeverity as EcobeEventSeverity,
              classification: classifyEcobeEvent(snapshotEventType as EcobeEventType, snapshotSeverity as EcobeEventSeverity),
              rawPayload: { eventSnapshot, handoffId: handoff.id, status } as object,
              replayUrl: eventSnapshot.replayUrl ?? null,
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      handoffId: handoff.id,
      status: updatedHandoff.status,
    })

  } catch (error) {
    console.error('ECOBE handoff status update error:', error)
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
}
