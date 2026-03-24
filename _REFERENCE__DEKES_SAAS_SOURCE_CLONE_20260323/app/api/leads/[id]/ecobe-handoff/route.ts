import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateSession } from '@/lib/auth/jwt'
import { getSessionToken } from '@/lib/auth/get-session-token'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getSessionToken(req)
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = params.id

    // Verify lead ownership
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: session.user.organizationId!,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Find existing handoff for this lead
    const handoff = await prisma.ecobeHandoff.findFirst({
      where: {
        leadId,
        organizationId: session.user.organizationId!,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ handoff })

  } catch (error) {
    console.error('ECOBE handoff lookup error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
