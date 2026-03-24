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

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: session.user.organizationId!,
      },
      include: {
        query: true,
        run: true,
        organization: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead })

  } catch (error) {
    console.error('Lead detail error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
