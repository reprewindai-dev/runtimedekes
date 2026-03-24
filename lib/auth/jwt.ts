import { jwtVerify, SignJWT } from 'jose'

import { env } from '@/lib/env'

const encoder = new TextEncoder()

function getJwtSecret() {
  if (!env.sessionSecret) {
    throw new Error('SESSION_SECRET is not configured')
  }

  return encoder.encode(env.sessionSecret)
}

export async function signSessionJwt(input: {
  userId: string
  sessionId: string
  sessionKey: string
  expiresAt: Date
}) {
  return new SignJWT({
    sid: input.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.userId)
    .setJti(input.sessionKey)
    .setIssuedAt()
    .setExpirationTime(Math.floor(input.expiresAt.getTime() / 1000))
    .sign(getJwtSecret())
}

export async function verifySessionJwt(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ['HS256'],
  })

  if (!payload.sub || !payload.jti || typeof payload.sid !== 'string') {
    throw new Error('Invalid session token')
  }

  return {
    userId: payload.sub,
    sessionKey: payload.jti,
    sessionId: payload.sid,
  }
}
