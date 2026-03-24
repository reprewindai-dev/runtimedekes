export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/jwt'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { authRateLimiter, getClientIdentifier } from '@/lib/rate-limiting'

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  organizationName: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
})

export async function POST(request: Request) {
  // Apply rate limiting
  const identifier = getClientIdentifier(request)
  const rateLimitResult = authRateLimiter.isAllowed(identifier)
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many signup attempts. Please try again later.',
        resetTime: rateLimitResult.resetTime
      }, 
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetTime || 0),
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000))
        }
      }
    )
  }

  try {
    const body = await request.json()
    const data = signupSchema.parse(body)

    // Validate password strength
    const passwordCheck = validatePassword(data.password)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    // Hash password
    const passwordHash = await hashPassword(data.password)

    // Create organization and user atomically
    const organization = await prisma.organization.create({
      data: {
        name: data.organizationName || `${data.email}'s Organization`,
        slug: `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        owner: {
          create: {
            email: data.email,
            passwordHash,
            name: data.name,
            role: 'ADMIN',
            emailVerified: false,
          },
        },
        plan: 'FREE',
        status: 'TRIAL',
        monthlyLeadQuota: 100,
      },
      include: { owner: true },
    })

    // Update user with organization ID
    await prisma.user.update({
      where: { id: organization.owner.id },
      data: { organizationId: organization.id },
    })

    // Create session
    const token = await createSession(
      organization.owner.id,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )

    const res = NextResponse.json({
      user: {
        id: organization.owner.id,
        email: organization.owner.email,
        name: organization.owner.name,
        organizationId: organization.id,
      },
      token,
    })

    // Add rate limit headers
    res.headers.set('X-RateLimit-Limit', '5')
    res.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining || 0))
    res.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime || 0))

    res.cookies.set({
      name: 'DEKES_SESSION',
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return res
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation (e.g. email already exists)
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
      }

      // Include Prisma error code in all environments so production issues can be diagnosed quickly.
      return NextResponse.json({ error: `Database error (${error.code})` }, { status: 500 })
    }

    const message = error instanceof Error ? error.message : String(error)
    console.error('Signup error:', message)

    if (message.includes('Missing JWT_SECRET')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }

    // bcrypt/native module failures are common on some deploy environments
    if (message.toLowerCase().includes('bcrypt')) {
      const isProd = process.env.NODE_ENV === 'production'
      return NextResponse.json(
        { error: isProd ? 'Password hashing error' : `Password hashing error: ${message}` },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
