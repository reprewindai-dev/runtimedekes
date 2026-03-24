import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/jwt'
import { jobScheduler } from '@/lib/jobs/scheduler'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize scheduled jobs
    await jobScheduler.initializeScheduledJobs()

    return NextResponse.json({
      success: true,
      message: 'Scheduled jobs initialized successfully',
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Job scheduling error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const health = await jobScheduler.getJobHealth()
    const recentFailures = await jobScheduler.getRecentFailures()

    return NextResponse.json({
      health,
      recentFailures,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Job status error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
