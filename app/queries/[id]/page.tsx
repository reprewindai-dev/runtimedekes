import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { LeadTable } from '@/components/lead-table'
import { RunQueryButton } from '@/components/run-query-button'
import { requirePageSession } from '@/lib/auth/server'
import { db } from '@/lib/db'

export default async function QueryDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePageSession()
  const query = await db.query.findFirst({
    where: {
      id: params.id,
      organizationId: session.organization.id,
    },
    include: {
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
      leads: {
        orderBy: [{ isLocked: 'asc' }, { score: 'desc' }],
        take: 20,
        include: {
          query: true,
        },
      },
    },
  })

  if (!query) {
    notFound()
  }

  return (
    <AppShell
      nav={{
        signedIn: true,
        organizationName: session.organization.name,
        userName: session.user.name,
      }}
    >
      <div className="page-grid">
        <section className="card">
          <div className="toolbar">
            <div>
              <div className="eyebrow">Query detail</div>
              <h1 style={{ margin: '6px 0 8px' }}>{query.name}</h1>
              <p className="muted">{query.input}</p>
            </div>
            <RunQueryButton queryId={query.id} />
          </div>
        </section>

        <section className="grid-2">
          <div className="card">
            <div className="kicker">Recent runs</div>
            {query.runs.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Raw</th>
                      <th>Qualified</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.runs.map((run) => (
                      <tr key={run.id}>
                        <td>{run.status}</td>
                        <td>{run.rawResultCount}</td>
                        <td>{run.qualifiedLeadCount}</td>
                        <td>{run.startedAt.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">This query has not been executed yet.</div>
            )}
          </div>
          <div className="card">
            <div className="kicker">Lead output</div>
            <p className="muted">Only domains with at least two strong signals survive this board.</p>
            <LeadTable leads={query.leads} />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
