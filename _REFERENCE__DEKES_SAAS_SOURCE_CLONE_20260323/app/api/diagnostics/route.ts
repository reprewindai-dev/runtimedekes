export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 20) + '...)' : 'MISSING',
    direct_database_url: process.env.DIRECT_DATABASE_URL ? 'SET' : 'MISSING',
    jwt_secret: process.env.JWT_SECRET ? 'SET' : 'MISSING',
  }

  // Test Prisma connectivity
  try {
    const { prisma } = await import('@/lib/db')
    const count = await prisma.user.count()
    checks.prisma = { status: 'connected', userCount: count }

    // Check if ECOBE migration has been applied
    try {
      const handoffCount = await prisma.ecobeHandoff.count()
      const eventCount = await prisma.ecobeInboundEvent.count()
      checks.ecobe_tables = { status: 'ok', handoffCount, eventCount }
    } catch (tableErr: any) {
      checks.ecobe_tables = { status: 'missing', message: tableErr.message }
    }
  } catch (err: any) {
    checks.prisma = { status: 'error', message: err.message, name: err.name }
  }

  // Test JWT
  try {
    const { generateToken } = await import('@/lib/auth/jwt')
    const token = generateToken({ userId: 'test', email: 'test@test.com' })
    checks.jwt = { status: 'ok', tokenLength: token.length }
  } catch (err: any) {
    checks.jwt = { status: 'error', message: err.message }
  }

  // Check integration env vars
  checks.integrations = {
    serpapi_key: process.env.SERPAPI_API_KEY ? 'SET' : 'MISSING',
    ecobe_engine_url: process.env.ECOBE_ENGINE_URL || process.env.ECOBE_ENGINE_BASE_URL || 'MISSING',
    co2router_api_url: process.env.CO2ROUTER_API_URL || 'MISSING',
    co2router_api_key: process.env.CO2ROUTER_API_KEY ? 'SET' : 'MISSING',
    ecobe_api_key: (process.env.ECOBE_API_KEY || process.env.DEKES_API_KEY) ? 'SET' : 'MISSING',
    next_public_app_url: process.env.NEXT_PUBLIC_APP_URL || 'MISSING',
    qstash_token: process.env.QSTASH_TOKEN ? 'SET' : 'MISSING',
  }

  return NextResponse.json(checks)
}
