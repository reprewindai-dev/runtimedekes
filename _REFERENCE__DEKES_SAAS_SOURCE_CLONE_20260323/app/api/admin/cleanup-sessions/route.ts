import { NextRequest, NextResponse } from 'next/server'
import { runSessionCleanup } from '@/lib/session-cleanup'

export const dynamic = 'force-dynamic'

// This endpoint should be protected by admin authentication in production
export async function POST(request: NextRequest) {
  try {
    // Simple API key check for basic protection
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.SESSION_CLEANUP_API_KEY
    
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await runSessionCleanup()
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      cleanedCount: result.cleanedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Session cleanup API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}
