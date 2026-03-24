import jwt from 'jsonwebtoken'
import { prisma } from '../db'

const isProd = process.env.NODE_ENV === 'production'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || (isProd ? '' : 'dev-secret-change-in-production')
  if (isProd && !secret) {
    throw new Error('Missing JWT_SECRET in production')
  }
  return secret
}

export interface JWTPayload {
  userId: string
  email: string
  organizationId?: string
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload
  } catch {
    return null
  }
}

export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    const token = generateToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId ?? undefined,
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    })

    return token
  } catch (error) {
    // Handle database connection errors gracefully
    if (error instanceof Error) {
      if (error.message.includes('User not found')) {
        throw error // Re-throw user not found errors
      }
      // Log database errors but don't expose details
      console.error('Database error in createSession:', error.message)
      throw new Error('Failed to create session')
    }
    throw new Error('Failed to create session')
  }
}

export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { organization: true } } },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }

  return session
}

export async function deleteSession(token: string) {
  await prisma.session.delete({ where: { token } }).catch(() => {})
}
