'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json().catch(() => ({}))) as { error?: string }

    if (!response.ok) {
      setError(body.error ?? 'Authentication failed')
      setPending(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {mode === 'signup' ? (
        <>
          <label>
            Name
            <input name="name" placeholder="Anthony Millwater" required />
          </label>
          <label>
            Organization
            <input name="organizationName" placeholder="Dekes Labs" required />
          </label>
        </>
      ) : null}
      <label>
        Email
        <input name="email" type="email" placeholder="you@company.com" required />
      </label>
      <label>
        Password
        <input name="password" type="password" minLength={8} required />
      </label>
      {error ? <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Working...' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>
    </form>
  )
}
