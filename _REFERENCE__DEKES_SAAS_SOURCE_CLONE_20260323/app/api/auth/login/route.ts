export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/jwt'
import { z } from 'zod'
import { authRateLimiter, getClientIdentifier } from '@/lib/rate-limiting'
import { authLogger, generateRequestId, logApiError } from '@/lib/logger'
import { withErrorHandling, validateRequest, createSuccessResponse, checkRateLimit } from '@/lib/api/middleware'
import { createValidationError, createApiError } from '@/lib/error/error-handler'
import type { LoginResponse, ErrorResponse } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const requestId = generateRequestId()
  const logger = authLogger.child('login')

  // Apply rate limiting
  const identifier = getClientIdentifier(request)
  const rateLimitResult = authRateLimiter.isAllowed(identifier)

  if (!rateLimitResult.allowed) {
    throw createApiError(429, 'Too many login attempts. Please try again later.', {
      identifier,
      resetTime: rateLimitResult.resetTime
    }, { requestId })
  }

  // Parse and validate request body
  const body = await request.json()
  const data = validateRequest(loginSchema, body, { requestId })

  logger.info('Login request validated', {
    requestId,
    email: data.email
  })

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { organization: true },
  })

  if (!user) {
    throw createApiError(401, 'Invalid credentials', undefined, { requestId })
  }

  // Check if user is active
  if (user.status !== 'ACTIVE') {
    throw createApiError(403, 'Account is suspended', { status: user.status }, { requestId })
  }

  // Verify password
  const valid = await verifyPassword(data.password, user.passwordHash)
  if (!valid) {
    throw createApiError(401, 'Invalid credentials', undefined, { requestId })
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  // Create session
  const token = await createSession(
    user.id,
    request.headers.get('x-forwarded-for') || undefined,
    request.headers.get('user-agent') || undefined
  )

  logger.info('Login successful', {
    requestId,
    userId: user.id,
    organizationId: user.organizationId
  })

  const response: LoginResponse = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role: user.role,
    },
    token,
  }

  // Create response with cookies
  const res = createSuccessResponse(response, { requestId })

  // Set session cookie
  res.cookies.set({
    name: 'DEKES_SESSION',
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  // Add rate limit headers
  res.headers.set('X-RateLimit-Limit', '5')
  res.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining || 0))
  res.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime || 0))

  return res
})
