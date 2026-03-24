import { NextResponse } from 'next/server'

import { getCurrentSession, hasWriteAccess } from '@/lib/auth/server'
import { executeQueryRun } from '@/lib/queries/service'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session?.organization || !hasWriteAccess(session.membership?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await executeQueryRun({
      organizationId: session.organization.id,
      organizationSlug: session.organization.slug,
      queryId: params.id,
      initiatedById: session.user.id,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Query execution failed',
      },
      { status: 400 },
    )
  }
}
