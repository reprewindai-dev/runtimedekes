import { AppShell } from '@/components/app-shell'
import { LeadTable } from '@/components/lead-table'
import { requirePageSession } from '@/lib/auth/server'
import { getEntitlements } from '@/lib/billing/entitlements'
import { db } from '@/lib/db'

export default async function LeadsPage() {
  const session = await requirePageSession()
  const [leads, entitlements] = await Promise.all([
    db.lead.findMany({
      where: {
        organizationId: session.organization.id,
      },
      orderBy: [{ isLocked: 'asc' }, { score: 'desc' }, { createdAt: 'desc' }],
      include: {
        query: true,
      },
      take: 100,
    }),
    getEntitlements(session.organization.id),
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
          <div className="toolbar">
            <div>
              <div className="eyebrow">Lead board</div>
              <h1 style={{ margin: '6px 0 8px' }}>Qualified buyer inventory</h1>
            </div>
            <div className="inline-meta">
              <span>{entitlements.plan.name}</span>
              <span>{entitlements.remainingLeadAllowance} reveal slots left</span>
              <span>{leads.filter((lead) => lead.isLocked).length} locked</span>
            </div>
          </div>
          {entitlements.isLeadQuotaExceeded ? (
            <p className="muted" style={{ color: 'var(--brand-strong)' }}>
              Qualified lead quota is exhausted. Upgrade on the billing page to keep revealing
              outreach-ready buyers.
            </p>
          ) : null}
        </section>

        <section className="card">
          <LeadTable leads={leads} />
        </section>
      </div>
    </AppShell>
  )
}
