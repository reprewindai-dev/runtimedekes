import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { requirePageSession } from '@/lib/auth/server'
import { db } from '@/lib/db'

export default async function AdminPage() {
  const session = await requirePageSession()

  if (!['SUPER_ADMIN', 'OPERATOR'].includes(session.user.platformRole) && session.membership?.role !== 'OWNER') {
    redirect('/dashboard')
  }

  const [organizations, recentAuditEvents] = await Promise.all([
    db.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        _count: {
          select: {
            leads: true,
            queries: true,
            runs: true,
          },
        },
      },
    }),
    db.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        organization: true,
      },
    }),
  ])

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
          <div className="eyebrow">Admin</div>
          <h1 style={{ margin: '10px 0' }}>Operator view</h1>
        </section>
        <section className="grid-2">
          <div className="card">
            <div className="kicker">Organizations</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Queries</th>
                    <th>Runs</th>
                    <th>Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((organization) => (
                    <tr key={organization.id}>
                      <td>{organization.name}</td>
                      <td>{organization._count.queries}</td>
                      <td>{organization._count.runs}</td>
                      <td>{organization._count.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="kicker">Recent audit events</div>
            <div className="stack">
              {recentAuditEvents.map((event) => (
                <div key={event.id}>
                  <strong>{event.eventType}</strong>
                  <div className="muted">
                    {event.organization.name} · {event.createdAt.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
