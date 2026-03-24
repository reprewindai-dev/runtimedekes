import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { StatusBadge } from '@/components/status-badge'
import { requirePageSession } from '@/lib/auth/server'
import { db } from '@/lib/db'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePageSession()
  const lead = await db.lead.findFirst({
    where: {
      id: params.id,
      organizationId: session.organization.id,
    },
    include: {
      query: true,
      leadEvidence: {
        orderBy: { createdAt: 'desc' },
      },
      enrichmentRecords: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!lead) {
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
              <div className="eyebrow">Lead detail</div>
              <h1 style={{ margin: '6px 0 8px' }}>{lead.companyName}</h1>
              <div className="inline-meta">
                <span>{lead.domain ?? 'Unknown domain'}</span>
                <span>Confidence {lead.score}</span>
                <span>{lead.query?.name ?? 'Direct run'}</span>
                <span>{lead.buyingStage}</span>
                <span>{lead.timingWindowDays}-day window</span>
              </div>
            </div>
            <StatusBadge status={lead.status} />
          </div>
          {lead.isLocked ? (
            <div className="empty-state">
              This lead is locked behind your monthly quota. Upgrade on the billing page to reveal
              the full buyer-intelligence brief and outreach angle.
            </div>
          ) : (
            <div className="lead-sections">
              <div>
                <strong>Why they are buying</strong>
                <div className="muted">{lead.whyBuying}</div>
              </div>
              <div>
                <strong>Why now</strong>
                <div className="muted">{lead.whyNow}</div>
              </div>
              <div>
                <strong>What to say</strong>
                <div className="muted">{lead.outreachAngle}</div>
              </div>
              <div>
                <strong>Business context</strong>
                <div className="muted">{lead.businessContext}</div>
              </div>
              <div>
                <strong>Recent activity</strong>
                <div className="muted">{lead.recentActivity}</div>
              </div>
              <div>
                <strong>Intent summary</strong>
                <div className="muted">{lead.intentSummary}</div>
              </div>
              <div className="stack">
                <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="button-secondary">
                  Open source
                </a>
              </div>
            </div>
          )}
        </section>

        <section className="grid-2">
          <div className="card">
            <div className="kicker">Evidence</div>
            {lead.leadEvidence.length ? (
              <div className="stack">
                {lead.leadEvidence.map((evidence) => (
                  <div key={evidence.id}>
                    <strong>{evidence.label}</strong>
                    <p className="muted">{evidence.excerpt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No evidence rows stored yet.</div>
            )}
          </div>
          <div className="card">
            <div className="kicker">Enrichment</div>
            {lead.enrichmentRecords.length ? (
              <div className="stack">
                {lead.enrichmentRecords.map((record) => (
                  <div key={record.id}>
                    <strong>{record.provider}</strong>
                    <p className="muted">{record.status}</p>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(record.payload, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No enrichment records yet.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
