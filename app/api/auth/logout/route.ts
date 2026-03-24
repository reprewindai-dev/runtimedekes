import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { revokeSession, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export async function POST() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value
  if (token) {
    await revokeSession(token)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
