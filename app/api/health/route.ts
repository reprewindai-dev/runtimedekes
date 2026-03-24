import { NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { env } from '@/lib/env'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`

    return NextResponse.json({
      ok: true,
      app: env.appName,
      database: 'reachable',
      controlPlaneConfigured: Boolean(env.controlPlaneBaseUrl && env.controlPlaneApiKey),
      ecobeConfigured: Boolean(env.ecobeBaseUrl && env.ecobeApiKey),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        app: env.appName,
        database: 'unreachable',
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 },
    )
  }
}
