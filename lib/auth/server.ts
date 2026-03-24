import { MembershipRole } from '@prisma/client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { verifySessionJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { hashValue } from '@/lib/utils'

export async function getCurrentSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return null
  }

  const jwt = await verifySessionJwt(token).catch(() => null)
  if (!jwt) {
    return null
  }

  const session = await db.session.findFirst({
    where: {
      id: jwt.sessionId,
      tokenHash: hashValue(jwt.sessionKey),
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              organization: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  })

  if (!session) {
    return null
  }

  const membership = session.user.memberships[0] ?? null
  const organization = membership?.organization ?? null

  return {
    session,
    user: session.user,
    membership,
    organization,
  }
}

export async function requirePageSession() {
  const activeSession = await getCurrentSession()
  if (!activeSession?.organization) {
    redirect('/login')
  }
  return activeSession
}

export function hasWriteAccess(role: MembershipRole | undefined | null) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'ANALYST'
}

export function isAdminRole(role: MembershipRole | undefined | null) {
  return role === 'OWNER' || role === 'ADMIN'
}
