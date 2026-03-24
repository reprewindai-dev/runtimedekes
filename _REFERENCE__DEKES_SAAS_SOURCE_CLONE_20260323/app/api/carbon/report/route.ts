export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const reportSchema = z.object({
  queryId: z.string().min(1),
  actualCO2: z.number(),
  timestamp: z.string().optional(),
})

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (!auth) return null
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m?.[1] ?? null
}

export async function POST(request: Request) {
  try {
    const expected = process.env.DEKES_API_KEY
    if (!expected) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const token = getBearerToken(request)
    if (!token || token !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = reportSchema.parse(body)

    const reportedAt = data.timestamp ? new Date(data.timestamp) : new Date()

    await prisma.carbonReport.create({
      data: {
        queryId: data.queryId,
        actualCO2: data.actualCO2,
        reportedAt: Number.isNaN(reportedAt.getTime()) ? new Date() : reportedAt,
        raw: body,
      },
    })

    return NextResponse.json({ received: true, queryId: data.queryId })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Carbon report error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 })
  }
}
