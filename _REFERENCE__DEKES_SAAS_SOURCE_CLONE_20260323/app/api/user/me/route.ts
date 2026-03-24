export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth/jwt'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      cookies().get('DEKES_SESSION')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = session.user.organizationId

    // Real stats from DB — defaults to 0 if org has no leads yet
    let leads = 0
    let qualified = 0
    let won = 0
    let conversion = 0

    if (orgId) {
      const [totalLeads, qualifiedLeads, wonLeads] = await Promise.all([
        prisma.lead.count({ where: { organizationId: orgId } }),
        prisma.lead.count({
          where: {
            organizationId: orgId,
            status: { in: ['OUTREACH_READY', 'CONTACTED', 'WON'] },
          },
        }),
        prisma.lead.count({
          where: { organizationId: orgId, status: 'WON' },
        }),
      ])

      leads = totalLeads
      qualified = qualifiedLeads
      won = wonLeads
      conversion = leads > 0 ? Math.round((won / leads) * 100) : 0
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        organizationId: session.user.organizationId,
        role: session.user.role,
      },
      stats: { leads, qualified, won, conversion },
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 })
  }
}
