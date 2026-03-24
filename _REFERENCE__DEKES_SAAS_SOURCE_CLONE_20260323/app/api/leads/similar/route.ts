import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/jwt'
import { getSessionToken } from '@/lib/auth/get-session-token'
import { leadDeduplication } from '@/lib/leads/deduplication'

export async function POST(req: NextRequest) {
  try {
    const token = getSessionToken(req)
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, company, meta, limit = 5 } = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const similarLeads = await leadDeduplication.findSimilarToWinners(
      {
        title,
        company,
        meta,
      },
      limit
    )

    return NextResponse.json({
      query: { title, company },
      results: similarLeads,
      count: similarLeads.length,
    })

  } catch (error) {
    console.error('Similar leads error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
