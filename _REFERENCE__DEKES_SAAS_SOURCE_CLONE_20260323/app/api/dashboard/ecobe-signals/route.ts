export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { validateSession } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      cookies().get('DEKES_SESSION')?.value
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = session.user.organizationId!

    const [events, classificationCounts] = await Promise.all([
      prisma.ecobeInboundEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          handoffId: true,
          eventType: true,
          severity: true,
          classification: true,
          budgetUsed: true,
          budgetLimit: true,
          budgetCurrency: true,
          policyAction: true,
          delayMinutes: true,
          cleanWindowRegion: true,
          replayUrl: true,
          createdAt: true,
        },
      }),
      prisma.ecobeInboundEvent.groupBy({
        by: ['classification'],
        where: { organizationId },
        _count: { classification: true },
      }),
    ])

    const counts: Record<string, number> = {
      RISK: 0,
      INFORMATIONAL: 0,
      OPPORTUNITY: 0,
      NO_ACTION: 0,
    }
    for (const row of classificationCounts) {
      counts[row.classification] = row._count.classification
    }

    return NextResponse.json({ events, counts })
  } catch (error) {
    console.error('ECOBE signals dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
