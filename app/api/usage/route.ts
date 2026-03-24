import { NextResponse } from 'next/server'

import { getCurrentSession } from '@/lib/auth/server'
import { getEntitlements } from '@/lib/billing/entitlements'

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.organization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const entitlements = await getEntitlements(session.organization.id)
  return NextResponse.json(entitlements)
}
