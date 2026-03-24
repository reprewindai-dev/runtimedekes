import crypto from 'node:crypto'

import { db } from '@/lib/db'
import { signSessionJwt, verifySessionJwt } from '@/lib/auth/jwt'
import { hashValue } from '@/lib/utils'

export const SESSION_COOKIE_NAME = 'dekes_session'
const SESSION_TTL_DAYS = 30

export function getSessionExpiry() {
  const expiresAt = new Date()
  expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_TTL_DAYS)
  return expiresAt
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  }
}

export async function createSession(
  userId: string,
  metadata?: { ipAddress?: string | null; userAgent?: string | null },
) {
  const sessionKey = crypto.randomBytes(32).toString('hex')
  const expiresAt = getSessionExpiry()

  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hashValue(sessionKey),
      expiresAt,
      ipAddress: metadata?.ipAddress ?? undefined,
      userAgent: metadata?.userAgent ?? undefined,
    },
  })

  const token = await signSessionJwt({
    userId,
    sessionId: session.id,
    sessionKey,
    expiresAt,
  })

  return { token, expiresAt }
}

export async function revokeSession(token: string) {
  const payload = await verifySessionJwt(token).catch(() => null)
  if (!payload) {
    return
  }

  await db.session
    .delete({
      where: {
        id: payload.sessionId,
      },
    })
    .catch(() => null)
}
