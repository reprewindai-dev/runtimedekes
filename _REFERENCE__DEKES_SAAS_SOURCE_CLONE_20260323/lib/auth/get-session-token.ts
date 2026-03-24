import { cookies } from 'next/headers'

/**
 * Extract session token from either Authorization header or DEKES_SESSION cookie.
 * Use this in all API routes that need authentication.
 */
export function getSessionToken(request: Request): string | undefined {
  return (
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    cookies().get('DEKES_SESSION')?.value ||
    undefined
  )
}
