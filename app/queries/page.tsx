import Link from 'next/link'

import { AppShell } from '@/components/app-shell'
import { QueryCreator } from '@/components/query-creator'
import { RunQueryButton } from '@/components/run-query-button'
import { requirePageSession } from '@/lib/auth/server'
import { db } from '@/lib/db'

export default async function QueriesPage() {
  const session = await requirePageSession()
  const queries = await db.query.findMany({
    where: {
      organizationId: session.organization.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: {
          runs: true,
          leads: true,
        },
      },
    },
  })

  return (
    <AppShell
      nav={{
        signedIn: true,
        organizationName: session.organization.name,
        userName: session.user.name,
      }}
    >
      <div className="page-grid">
        <section className="grid-2">
          <QueryCreator />
          <div className="card">
            <div className="kicker">Query inventory</div>
            <h3>{queries.length} active searches</h3>
            <p className="muted">
              Each query turns into a controlled run, evidence-backed leads, and billable usage.
            </p>
          </div>
        </section>

        <section className="card">
          {queries.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Input</th>
                    <th>Runs</th>
                    <th>Leads</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map((query) => (
                    <tr key={query.id}>
                      <td>
                        <Link href={`/queries/${query.id}`}>
                          <strong>{query.name}</strong>
                        </Link>
                      </td>
                      <td className="muted">{query.input}</td>
                      <td>{query._count.runs}</td>
                      <td>{query._count.leads}</td>
                      <td>
                        <RunQueryButton queryId={query.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">No queries created yet.</div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
