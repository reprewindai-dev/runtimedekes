import { NextResponse } from 'next/server'

import { getCurrentSession } from '@/lib/auth/server'
import { db } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session?.organization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lead = await db.lead.findFirst({
    where: {
      id: params.id,
      organizationId: session.organization.id,
    },
    include: {
      leadEvidence: true,
      enrichmentRecords: true,
      query: true,
    },
  })

  if (!lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ lead })
}
