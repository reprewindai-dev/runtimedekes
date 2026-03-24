export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { validateSession } from '@/lib/auth/jwt'
import type { EcobeStatsResponse, ErrorResponse } from '@/types'

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

    const [
      totalHandoffs,
      sentHandoffs,
      acceptedHandoffs,
      convertedHandoffs,
      recentHandoffs,
      monthlyStats
    ] = await Promise.all([
      // Total handoffs created
      prisma.ecobeHandoff.count({
        where: { organizationId }
      }),
      
      // Handoffs sent to ECOBE
      prisma.ecobeHandoff.count({
        where: { 
          organizationId,
          status: 'SENT'
        }
      }),
      
      // Handoffs accepted by ECOBE
      prisma.ecobeHandoff.count({
        where: { 
          organizationId,
          status: 'ACCEPTED'
        }
      }),
      
      // Handoffs converted to deals
      prisma.ecobeHandoff.count({
        where: { 
          organizationId,
          status: 'CONVERTED'
        }
      }),
      
      // Recent handoffs with details
      prisma.ecobeHandoff.findMany({
        where: { organizationId },
        include: {
          lead: {
            select: {
              id: true,
              title: true,
              score: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Monthly stats for the last 6 months using Prisma query builder
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::integer as handoffs,
          COUNT(CASE WHEN status = 'CONVERTED' THEN 1 END)::integer as conversions
        FROM "EcobeHandoff"
        WHERE "organizationId" = ${organizationId}
          AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `
    ]) as [
      number,
      number,
      number,
      number,
      Array<{
        id: string
        status: string
        qualificationScore: number | null
        createdAt: Date
        lead: {
          id: string
          title: string | null
          score: number
          status: string
        }
      }>,
      Array<{ month: Date; handoffs: number; conversions: number }>
    ]

    const conversionRate = sentHandoffs > 0 
      ? Math.round((convertedHandoffs / sentHandoffs) * 100) 
      : 0

    const acceptanceRate = sentHandoffs > 0
      ? Math.round(((acceptedHandoffs + convertedHandoffs) / sentHandoffs) * 100)
      : 0

    const response: EcobeStatsResponse = {
      stats: {
        totalHandoffs,
        sentHandoffs,
        acceptedHandoffs,
        convertedHandoffs,
        conversionRate,
        acceptanceRate
      },
      recentHandoffs: recentHandoffs.map((handoff) => ({
        id: handoff.id,
        status: handoff.status,
        qualificationScore: handoff.qualificationScore,
        createdAt: handoff.createdAt,
        lead: handoff.lead
      })),
      monthlyStats: monthlyStats.map((stat) => ({
        month: stat.month,
        handoffs: stat.handoffs,
        conversions: stat.conversions
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('ECOBE dashboard stats error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
