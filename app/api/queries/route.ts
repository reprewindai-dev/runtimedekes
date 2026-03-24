import { NextResponse } from 'next/server'

import { getCurrentSession, hasWriteAccess } from '@/lib/auth/server'
import { createQuerySchema } from '@/lib/queries/schemas'
import { createQuery } from '@/lib/queries/service'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.organization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const queries = await db.query.findMany({
    where: {
      organizationId: session.organization.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({ queries })
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session?.organization || !hasWriteAccess(session.membership?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = createQuerySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query payload' }, { status: 400 })
  }

  const query = await createQuery({
    organizationId: session.organization.id,
    createdById: session.user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    input: parsed.data.input,
    market: parsed.data.market,
  })

  await db.auditEvent.create({
    data: {
      organizationId: session.organization.id,
      actorId: session.user.id,
      eventType: 'query.created',
      entityType: 'query',
      entityId: query.id,
      payload: parsed.data,
    },
  })

  return NextResponse.json({ query }, { status: 201 })
}
