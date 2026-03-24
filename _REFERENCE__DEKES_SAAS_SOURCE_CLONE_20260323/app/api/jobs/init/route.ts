import { NextRequest, NextResponse } from 'next/server'
import { initializeJobs } from '@/lib/jobs/init'
import { describeJobEnvStatus } from '@/lib/jobs/env'

function assertSecret(req: NextRequest) {
  const provided = req.headers.get('x-jobs-token') || req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.JOBS_SECRET

  if (!expected) {
    throw new Error('JOBS_SECRET is not configured on the server')
  }

  if (!provided || provided !== expected) {
    return false
  }

  return true
}

export async function POST(req: NextRequest) {
  try {
    if (!assertSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const envStatus = describeJobEnvStatus()
    if (!envStatus.ok) {
      return NextResponse.json({
        error: 'Missing environment variables',
        missing: envStatus.missing,
      }, { status: 500 })
    }

    await initializeJobs()

    return NextResponse.json({
      success: true,
      initializedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Job init endpoint error:', error)
    return NextResponse.json({ error: 'Failed to initialize jobs' }, { status: 500 })
  }
}

export function GET(req: NextRequest) {
  if (!assertSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const envStatus = describeJobEnvStatus()
  return NextResponse.json({
    ok: envStatus.ok,
    missing: envStatus.missing,
    timestamp: new Date().toISOString(),
  })
}
