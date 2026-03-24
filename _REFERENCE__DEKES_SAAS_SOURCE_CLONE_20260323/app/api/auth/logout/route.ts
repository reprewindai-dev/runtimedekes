export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession } from '@/lib/auth/jwt'

export async function POST(request: Request) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      cookies().get('DEKES_SESSION')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteSession(token)
    const res = NextResponse.json({ success: true })
    res.cookies.set({
      name: 'DEKES_SESSION',
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })
    return res
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 })
  }
}
