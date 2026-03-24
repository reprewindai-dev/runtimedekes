export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { applyFreshnessDecay } from '@/lib/leads/feedback-loop'

/**
 * Freshness decay job — designed to be called by QStash cron or manually.
 * Decays scores of stale leads across all organizations.
 * POST /api/jobs/freshness-decay
 */
export async function POST(request: Request) {
  try {
    // Verify internal job auth (QStash signature or bearer token)
    const authHeader = headers().get('authorization')
    const upstashSignature = headers().get('upstash-signature')
    const jobSecret = process.env.JOB_SECRET

    if (!upstashSignature && authHeader !== `Bearer ${jobSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active orgs
    const orgs = await prisma.organization.findMany({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      select: { id: true, plan: true },
    })

    const results: Array<{ orgId: string; decayed: number }> = []

    for (const org of orgs) {
      // Free/Starter: 7 days fresh, Pro: 14 days, Enterprise: 30 days
      const freshDays = org.plan === 'ENTERPRISE' ? 30
        : org.plan === 'PROFESSIONAL' ? 14
        : 7

      const result = await applyFreshnessDecay(org.id, freshDays)
      if (result.decayed > 0) {
        results.push({ orgId: org.id, decayed: result.decayed })
      }
    }

    const totalDecayed = results.reduce((s, r) => s + r.decayed, 0)

    return NextResponse.json({
      success: true,
      orgsProcessed: orgs.length,
      totalDecayed,
      details: results,
    })
  } catch (error) {
    console.error('[jobs/freshness-decay] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Decay job failed' }, { status: 500 })
  }
}
