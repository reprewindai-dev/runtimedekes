'use client'

import { useState } from 'react'

export function BillingButton({
  mode,
  planCode,
  label,
}: {
  mode: 'checkout' | 'portal'
  planCode?: string
  label: string
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setPending(true)
    setError(null)

    const response = await fetch(`/api/billing/${mode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planCode ? { planCode } : {}),
    })

    const body = (await response.json().catch(() => ({}))) as { error?: string; url?: string }

    if (!response.ok || !body.url) {
      setError(body.error ?? 'Billing action failed')
      setPending(false)
      return
    }

    window.location.href = body.url
  }

  return (
    <div className="stack">
      <button className={mode === 'checkout' ? 'button' : 'button-secondary'} onClick={handleClick} disabled={pending}>
        {pending ? 'Working...' : label}
      </button>
      {error ? <span className="muted" style={{ color: 'var(--danger)' }}>{error}</span> : null}
    </div>
  )
}
