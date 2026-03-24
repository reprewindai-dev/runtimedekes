'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function QueryCreator() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = Object.fromEntries(formData.entries())

    const response = await fetch('/api/queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json().catch(() => ({}))) as { error?: string }

    if (!response.ok) {
      setError(body.error ?? 'Could not create query')
      setPending(false)
      return
    }

    form.reset()
    router.refresh()
    setPending(false)
  }

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      <div>
        <div className="kicker">Create query</div>
        <h3>Define the buyer signal you want DEKES to hunt.</h3>
      </div>
      <label>
        Query name
        <input name="name" placeholder="Outbound agencies hiring content editors" required />
      </label>
      <label>
        Search expression
        <textarea
          name="input"
          placeholder='Example: "looking for video editor agency" OR "need content editing team"'
          required
        />
      </label>
      <label>
        Market
        <select name="market" defaultValue="en-US">
          <option value="en-US">English / United States</option>
          <option value="en-CA">English / Canada</option>
          <option value="en-GB">English / United Kingdom</option>
        </select>
      </label>
      <label>
        Notes
        <input name="description" placeholder="Optional ICP notes or exclusion rules" />
      </label>
      {error ? <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create query'}
      </button>
    </form>
  )
}
