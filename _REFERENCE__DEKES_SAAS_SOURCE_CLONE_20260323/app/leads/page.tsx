'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Lead = {
  id: string
  status: string
  entityType: string
  name: string | null
  title: string | null
  company: string | null
  website: string | null
  sourceUrl: string | null
  score: number | null
  createdAt: string
}

export default function LeadsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])

  const grouped = useMemo(() => {
    const buckets: Record<string, Lead[]> = {}
    for (const lead of leads) {
      const key = lead.status || 'UNKNOWN'
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(lead)
    }
    return buckets
  }, [leads])

  useEffect(() => {
    setLoading(true)
    setError('')

    fetch('/api/leads', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load leads')
        }
        return data
      })
      .then((data) => {
        setLeads((data?.leads || []) as Lead[])
      })
      .catch((e: any) => setError(e.message || 'Failed to load leads'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-white font-bold">
                DEKES
              </Link>
              <span className="text-sm text-slate-400">Leads</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/runs/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Run New Search
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="text-slate-200">Loading leads…</div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
            <h1 className="text-2xl font-bold text-white mb-2">No leads yet</h1>
            <p className="text-slate-400 mb-6">Run a search to generate your first batch of leads.</p>
            <Link
              href="/runs/new"
              className="inline-flex px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
            >
              Run New Search
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Leads</h1>
              <p className="text-slate-400">Showing up to 100 most recent leads for your org.</p>
            </div>

            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([status, items]) => (
                <section key={status} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="text-white font-semibold">{status}</div>
                    <div className="text-slate-400 text-sm">{items.length} leads</div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-950/40">
                        <tr className="text-slate-300">
                          <th className="text-left px-6 py-3">Lead</th>
                          <th className="text-left px-6 py-3">Company</th>
                          <th className="text-left px-6 py-3">Score</th>
                          <th className="text-left px-6 py-3">Source</th>
                          <th className="text-left px-6 py-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {items.map((lead) => (
                          <tr key={lead.id} className="text-slate-200">
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">
                                {lead.name || lead.title || 'Untitled'}
                              </div>
                              <div className="text-slate-400">{lead.entityType}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-white">{lead.company || '—'}</div>
                              {lead.website ? (
                                <a
                                  className="text-blue-400 hover:text-blue-300"
                                  href={lead.website}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {lead.website}
                                </a>
                              ) : (
                                <div className="text-slate-400">—</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-white">{lead.score ?? '—'}</div>
                            </td>
                            <td className="px-6 py-4">
                              {lead.sourceUrl ? (
                                <a
                                  className="text-blue-400 hover:text-blue-300"
                                  href={lead.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
                                </a>
                              ) : (
                                <div className="text-slate-400">—</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-300">
                              {new Date(lead.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
          </div>
        )}
      </main>
    </div>
  )
}
