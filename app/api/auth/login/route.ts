import { z } from 'zod'
import { NextResponse } from 'next/server'

import { verifyPassword } from '@/lib/auth/password'
import { createSession, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { db } from '@/lib/db'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid login payload' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase(),
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await createSession(user.id, {
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, session.token, getSessionCookieOptions(session.expiresAt))
  return response
}
