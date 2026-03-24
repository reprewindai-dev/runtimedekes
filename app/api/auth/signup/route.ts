import { z } from 'zod'
import { NextResponse } from 'next/server'

import { hashPassword } from '@/lib/auth/password'
import { createSession, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { ensureOrganizationHasFreePlan, ensurePlansSeeded } from '@/lib/billing/entitlements'
import { db } from '@/lib/db'
import { slugify } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2).max(80),
  organizationName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

async function buildUniqueSlug(name: string) {
  const base = slugify(name) || 'dekes-org'
  let candidate = base
  let suffix = 1

  while (await db.organization.findUnique({ where: { slug: candidate } })) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }

  return candidate
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid signup payload' }, { status: 400 })
  }

  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  })

  if (existingUser) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  await ensurePlansSeeded()
  const passwordHash = await hashPassword(parsed.data.password)
  const organizationSlug = await buildUniqueSlug(parsed.data.organizationName)

  const { user, organization } = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        passwordHash,
      },
    })

    const organization = await tx.organization.create({
      data: {
        name: parsed.data.organizationName,
        slug: organizationSlug,
      },
    })

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'OWNER',
      },
    })

    await tx.auditEvent.create({
      data: {
        organizationId: organization.id,
        actorId: user.id,
        eventType: 'organization.created',
        entityType: 'organization',
        entityId: organization.id,
        payload: {
          source: 'signup',
        },
      },
    })

    return { user, organization }
  })

  await ensureOrganizationHasFreePlan(organization.id)

  const session = await createSession(user.id, {
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  })

  const response = NextResponse.json({
    ok: true,
    organizationId: organization.id,
  })

  response.cookies.set(SESSION_COOKIE_NAME, session.token, getSessionCookieOptions(session.expiresAt))
  return response
}
