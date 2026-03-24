export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth/jwt'
import { getConversionAnalytics, getCalibratedWeights } from '@/lib/leads/feedback-loop'

export async function GET(request: Request) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      cookies().get('DEKES_SESSION')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(token)
    if (!session?.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const analytics = await getConversionAnalytics(session.user.organizationId)
    return NextResponse.json(analytics)
  } catch (error) {
    console.error('[leads/analytics] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
