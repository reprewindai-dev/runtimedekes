import { NextResponse } from 'next/server'

import { getCurrentSession } from '@/lib/auth/server'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.organization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leads = await db.lead.findMany({
    where: {
      organizationId: session.organization.id,
    },
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    include: {
      query: true,
    },
    take: 100,
  })

  return NextResponse.json({ leads })
}
