import { NextResponse } from 'next/server'

import { getCurrentSession } from '@/lib/auth/server'
import { db } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session?.organization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const query = await db.query.findFirst({
    where: {
      id: params.id,
      organizationId: session.organization.id,
    },
    include: {
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 20,
      },
      leads: {
        orderBy: { score: 'desc' },
        take: 50,
      },
    },
  })

  if (!query) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ query })
}
