import crypto from 'node:crypto'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentSession, hasWriteAccess } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { hashValue } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2).max(80),
})

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.organization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const keys = await db.apiKey.findMany({
    where: {
      organizationId: session.organization.id,
      revokedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({ keys })
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session?.organization || !hasWriteAccess(session.membership?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid API key payload' }, { status: 400 })
  }

  const secret = `dekes_${crypto.randomBytes(24).toString('hex')}`
  const prefix = secret.slice(0, 12)
  const apiKey = await db.apiKey.create({
    data: {
      organizationId: session.organization.id,
      createdById: session.user.id,
      name: parsed.data.name,
      prefix,
      secretHash: hashValue(secret),
    },
  })

  await db.auditEvent.create({
    data: {
      organizationId: session.organization.id,
      actorId: session.user.id,
      eventType: 'api_key.created',
      entityType: 'api_key',
      entityId: apiKey.id,
      payload: {
        prefix,
        name: parsed.data.name,
      },
    },
  })

  return NextResponse.json({ secret, apiKey }, { status: 201 })
}
