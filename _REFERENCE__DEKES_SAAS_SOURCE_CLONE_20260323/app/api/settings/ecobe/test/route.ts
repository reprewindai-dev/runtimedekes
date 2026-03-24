import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/jwt'
import { getSessionToken } from '@/lib/auth/get-session-token'

export async function POST(req: NextRequest) {
  try {
    const token = getSessionToken(req)
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { apiKey, baseUrl } = await req.json()

    if (!apiKey || !baseUrl) {
      return NextResponse.json({ 
        error: 'API key and base URL are required' 
      }, { status: 400 })
    }

    // Test connection by calling a simple health check
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error')
      throw new Error(`ECOBE connection test failed (${res.status}): ${text}`)
    }

    const result = await res.json()

    return NextResponse.json({ 
      success: true,
      message: 'Connection successful',
      data: result
    })

  } catch (error) {
    console.error('ECOBE connection test error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Connection test failed'
    }, { status: 500 })
  }
}
