import { NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { env, isControlPlaneConfigured, isEcobeConfigured } from '@/lib/env'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`

    return NextResponse.json({
      ok: true,
      app: env.appName,
      database: 'reachable',
      controlPlane: {
        configured: isControlPlaneConfigured,
        governedPlans: ['GROWTH', 'PRO'],
        mode: isControlPlaneConfigured ? 'active_for_governed_plans' : 'disabled',
      },
      ecobe: {
        configured: isEcobeConfigured,
        enabledPlans: ['STARTER', 'GROWTH', 'PRO'],
        mode: isEcobeConfigured ? 'active_for_paid_plans' : 'disabled',
      },
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
