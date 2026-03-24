'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button className="button-secondary" onClick={handleClick} disabled={pending}>
      {pending ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
