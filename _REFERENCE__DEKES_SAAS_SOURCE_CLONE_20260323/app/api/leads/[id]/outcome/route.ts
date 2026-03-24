export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth/jwt'
import { prisma } from '@/lib/db'
import { recordOutcome } from '@/lib/leads/feedback-loop'

const outcomeSchema = z.object({
  status: z.enum(['WON', 'LOST', 'CONTACTED', 'REJECTED', 'REVIEW', 'OUTREACH_READY']),
  rejectedReason: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
})

function statusToEventType(status: string) {
  switch (status) {
    case 'WON':
      return 'WON'
    case 'LOST':
      return 'LOST'
    case 'CONTACTED':
      return 'CONTACTED'
    case 'REJECTED':
      return 'REJECTED'
    default:
      return 'UPDATED'
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      cookies().get('DEKES_SESSION')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(token)
    const organizationId = session?.user.organizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = params.id
    const body = await request.json()
    const data = outcomeSchema.parse(body)

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // ── 1. Update lead status ──────────────────────────────────────────────
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: data.status as any,
        rejectedReason: data.rejectedReason ?? lead.rejectedReason,
      },
    })

    // ── 2. Create event log ────────────────────────────────────────────────
    await prisma.leadEvent.create({
      data: {
        leadId,
        type: statusToEventType(data.status) as any,
        meta: {
          ...(data.meta ?? {}),
          previousStatus: lead.status,
          timestamp: new Date().toISOString(),
        } as any,
      },
    })

    // ── 3. Closed-loop feedback (WON/LOST only) ───────────────────────────
    let feedbackResult = null
    if (data.status === 'WON' || data.status === 'LOST') {
      try {
        feedbackResult = await recordOutcome(leadId, data.status, data.meta)
      } catch (err) {
        console.error('[outcome] Feedback loop error (non-fatal):', err instanceof Error ? err.message : String(err))
        feedbackResult = { patternsUpdated: 0, weightsRecalibrated: false, error: true }
      }
    }

    return NextResponse.json({
      lead: updated,
      feedback: feedbackResult,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Lead outcome error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
