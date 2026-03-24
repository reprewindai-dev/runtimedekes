'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ApiKeyManager() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)

  async function handleCreate() {
    setPending(true)
    setError(null)
    setSecret(null)

    const response = await fetch('/api/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Runtime Key ${new Date().toISOString().slice(0, 10)}`,
      }),
    })

    const body = (await response.json().catch(() => ({}))) as { error?: string; secret?: string }

    if (!response.ok || !body.secret) {
      setError(body.error ?? 'Could not create API key')
      setPending(false)
      return
    }

    setSecret(body.secret)
    setPending(false)
    router.refresh()
  }

  return (
    <div className="stack">
      <button className="button-secondary" onClick={handleCreate} disabled={pending}>
        {pending ? 'Creating...' : 'Generate API key'}
      </button>
      {secret ? (
        <div className="empty-state">
          <strong>Copy now:</strong>
          <div style={{ marginTop: 8, wordBreak: 'break-all' }}>{secret}</div>
        </div>
      ) : null}
      {error ? <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div> : null}
    </div>
  )
}
