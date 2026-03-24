import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateSession } from '@/lib/auth/jwt'
import { getSessionToken } from '@/lib/auth/get-session-token'
import { z } from 'zod'

const settingsSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string(),
  baseUrl: z.string().url(),
  webhookSecret: z.string(),
  autoHandoff: z.boolean(),
  minQualificationScore: z.number().min(0).max(100),
})

// GET current settings
export async function GET(req: NextRequest) {
  try {
    const token = getSessionToken(req)
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: {
        id: true,
        settings: true,
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const settings = (organization.settings as any)?.ecobe || {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://ecobe-engineclaude-production.up.railway.app',
      webhookSecret: '',
      autoHandoff: true,
      minQualificationScore: 70,
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('ECOBE settings GET error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST update settings
export async function POST(req: NextRequest) {
  try {
    const token = getSessionToken(req)
    const session = await validateSession(token || '')
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedSettings = settingsSchema.parse(body)

    const organization = await prisma.organization.update({
      where: { id: session.user.organizationId! },
      data: {
        settings: {
          ecobe: validatedSettings,
          ...((await prisma.organization.findUnique({
            where: { id: session.user.organizationId! },
            select: { settings: true }
          }))?.settings as Record<string, any> || {}),
        },
      },
    })

    return NextResponse.json({ 
      success: true,
      settings: (organization.settings as any)?.ecobe
    })

  } catch (error) {
    console.error('ECOBE settings POST error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid settings',
        details: error.errors
      }, { status: 400 })
    }
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
