import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/jwt'
import { getSessionToken } from '@/lib/auth/get-session-token'
import { leadDeduplication } from '@/lib/leads/deduplication'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const token = getSessionToken(req)
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const company = searchParams.get('company')
    const minScore = searchParams.get('minScore')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const results = await leadDeduplication.semanticSearch(
      query,
      session.user.organizationId!,
      {
        company: company || undefined,
        minScore: minScore ? parseInt(minScore) : undefined,
        status: status || undefined,
        limit,
      }
    )

    return NextResponse.json({
      query,
      results,
      count: results.length,
    })

  } catch (error) {
    console.error('Lead search error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
