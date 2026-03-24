import Link from 'next/link'

import { StatusBadge } from '@/components/status-badge'

type LeadRow = {
  id: string
  companyName: string
  score: number
  status: string
  whyBuying: string
  whyNow: string
  outreachAngle: string
  recentActivity: string
  buyingStage: string
  timingWindowDays: number
  isLocked: boolean
  sourceTitle: string | null
  domain: string | null
  query?: { name: string } | null
}

export function LeadTable({ leads }: { leads: LeadRow[] }) {
  if (!leads.length) {
    return <div className="empty-state">No leads yet. Run a query to populate the board.</div>
  }

  return (
    <div className="lead-card-grid">
      {leads.map((lead) => (
        <div className="lead-card" key={lead.id}>
          <div className="lead-head">
            <div>
              <Link href={`/leads/${lead.id}`}>
                <strong>{lead.companyName}</strong>
              </Link>
              <div className="lead-meta">
                <span>{lead.domain ?? 'Unknown domain'}</span>
                <span>Confidence {lead.score}</span>
                <span>{lead.buyingStage}</span>
                <span>{lead.timingWindowDays}-day window</span>
              </div>
            </div>
            <StatusBadge status={lead.status} />
          </div>
          {lead.isLocked ? (
            <div className="empty-state">
              Qualified buyer found, but this lead is locked behind quota. Upgrade to reveal the
              why-buying context and outreach angle.
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
              <div className="lead-meta">
                <span>{lead.recentActivity}</span>
                <span>{lead.query?.name ?? 'Direct run'}</span>
                <span>{lead.sourceTitle ?? 'Live signal source'}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
