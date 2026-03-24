import { AppShell } from '@/components/app-shell'
import { ApiKeyManager } from '@/components/api-key-manager'
import { requirePageSession } from '@/lib/auth/server'
import { db } from '@/lib/db'

export default async function SettingsPage() {
  const session = await requirePageSession()
  const apiKeys = await db.apiKey.findMany({
    where: {
      organizationId: session.organization.id,
      revokedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
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
          <div className="card">
            <div className="kicker">Workspace</div>
            <h3>{session.organization.name}</h3>
            <div className="stack muted">
              <span>Slug: {session.organization.slug}</span>
              <span>Member role: {session.membership?.role}</span>
              <span>User email: {session.user.email}</span>
            </div>
          </div>
          <div className="card">
            <div className="kicker">Customer API keys</div>
            <ApiKeyManager />
            {apiKeys.length ? (
              <div className="stack">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="muted">
                    {apiKey.name} · {apiKey.prefix}...
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No API keys issued yet. Generate them from this workspace.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
