import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateSession } from '@/lib/auth/jwt'
import { getSessionToken } from '@/lib/auth/get-session-token'

export const dynamic = 'force-dynamic'

const handoffsSchema = z.object({
  page: z.string().nullable().optional().transform(v => (v ? Number(v) : 1)).pipe(z.number().min(1).max(100)),
  status: z.enum(['PENDING', 'SENT', 'ACCEPTED', 'FAILED', 'CONVERTED']).nullable().optional().transform(v => v ?? undefined),
})

export async function GET(req: NextRequest) {
  try {
    const token = getSessionToken(req)
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const { page = 1, status } = handoffsSchema.parse({
      page: searchParams.get('page'),
      status: searchParams.get('status'),
    })

    const where = {
      organizationId: session.user.organizationId!,
      ...(status && { status }),
    }

    const [handoffs, total] = await Promise.all([
      prisma.ecobeHandoff.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              title: true,
              snippet: true,
              sourceUrl: true,
              score: true,
              status: true,
              createdAt: true,
            },
          },
          query: {
            select: {
              id: true,
              query: true,
              name: true,
            },
          },
          run: {
            select: {
              id: true,
              resultCount: true,
              leadCount: true,
              startedAt: true,
              finishedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      prisma.ecobeHandoff.count({ where }),
    ])

    return NextResponse.json({
      handoffs,
      pagination: {
        page,
        totalPages: Math.ceil(total / 20),
        total,
        hasMore: page * 20 < total,
      },
    })

  } catch (error) {
    console.error('ECOBE handoffs list error:', error)
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
}
