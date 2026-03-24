import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createEcobeProspect } from '@/lib/ecobe/client'
import { publishEvent } from '@/lib/events/publisher'
import { recordMetric } from '@/lib/metrics/recorder'

const retrySchema = z.object({
  secret: z.string(),
})

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret } = retrySchema.parse(body)

    if (secret !== process.env.JOBS_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const failedHandoffs = await prisma.ecobeHandoff.findMany({
      where: {
        status: 'FAILED',
        attempts: { lt: MAX_RETRY_ATTEMPTS },
        OR: [
          { failedAt: null },
          { failedAt: { lt: new Date(Date.now() - RETRY_DELAY_MS) } },
        ],
      },
      include: {
        lead: {
          include: {
            organization: true,
            query: true,
            run: true,
          },
        },
      },
      orderBy: { failedAt: 'asc' },
      take: 10,
    })

    const results = []

    for (const handoff of failedHandoffs) {
      try {
        await prisma.ecobeHandoff.update({
          where: { id: handoff.id },
          data: {
            status: 'PENDING',
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        })

        const prospectResult = await createEcobeProspect(handoff.payloadJson as any)

        await prisma.ecobeHandoff.update({
          where: { id: handoff.id },
          data: {
            status: 'SENT',
            externalLeadId: prospectResult.id,
            responseJson: prospectResult,
            sentAt: new Date(),
          },
        })

        await publishEvent({
          type: 'ECOBE_HANDOFF_RETRIED',
          payload: {
            handoffId: handoff.id,
            leadId: handoff.leadId,
            externalId: prospectResult.id,
            attempt: handoff.attempts + 1,
          },
        })

        await recordMetric('ECOBE_HANDOFF_RETRIED', {
          handoffId: handoff.id,
          leadId: handoff.leadId,
          attempt: handoff.attempts + 1,
        }, handoff.organizationId)

        results.push({
          handoffId: handoff.id,
          status: 'SUCCESS',
          externalId: prospectResult.id,
        })

      } catch (retryError) {
        await prisma.ecobeHandoff.update({
          where: { id: handoff.id },
          data: {
            status: 'FAILED',
            errorMessage: retryError instanceof Error ? retryError.message : 'Unknown error',
            failedAt: new Date(),
          },
        })

        await publishEvent({
          type: 'ECOBE_HANDOFF_RETRY_FAILED',
          payload: {
            handoffId: handoff.id,
            leadId: handoff.leadId,
            error: retryError instanceof Error ? retryError.message : 'Unknown error',
            attempt: handoff.attempts + 1,
          },
        })

        results.push({
          handoffId: handoff.id,
          status: 'FAILED',
          error: retryError instanceof Error ? retryError.message : 'Unknown error',
        })
      }
    }

    const permanentlyFailed = await prisma.ecobeHandoff.findMany({
      where: {
        status: 'FAILED',
        attempts: { gte: MAX_RETRY_ATTEMPTS },
      },
      take: 5,
    })

    if (permanentlyFailed.length > 0) {
      await recordMetric('ECOBE_HANDOFF_PERMANENTLY_FAILED', {
        handoffIds: permanentlyFailed.map((h: any) => h.id),
      }, permanentlyFailed[0]?.organizationId)
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      permanentlyFailed: permanentlyFailed.length,
      results,
    })

  } catch (error) {
    console.error('ECOBE handoff retry job error:', error)
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
}
