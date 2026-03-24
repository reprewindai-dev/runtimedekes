'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function RunQueryButton({ queryId }: { queryId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRun() {
    setPending(true)
    setError(null)
    const response = await fetch(`/api/queries/${queryId}/run`, {
      method: 'POST',
    })
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setError(body.error ?? 'Query run failed')
      setPending(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="stack">
      <button className="button-secondary" onClick={handleRun} disabled={pending}>
        {pending ? 'Running...' : 'Run query'}
      </button>
      {error ? <span className="muted" style={{ color: 'var(--danger)' }}>{error}</span> : null}
    </div>
  )
}
