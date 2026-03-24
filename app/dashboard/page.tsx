import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { QueryCreator } from '@/components/query-creator'
import { requirePageSession } from '@/lib/auth/server'
import { getDashboardOverview } from '@/lib/analytics/overview'
import { formatNumber } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await requirePageSession()
  const overview = await getDashboardOverview(session.organization.id)

  return (
    <AppShell
      nav={{
        signedIn: true,
        organizationName: session.organization.name,
        userName: session.user.name,
      }}
    >
      <div className="page-grid">
        <section className="toolbar">
          <div>
            <div className="eyebrow">Dashboard</div>
            <h1 style={{ margin: '6px 0 0' }}>Revenue control center</h1>
          </div>
          <div className="inline-meta">
            <span>{overview.usage.plan.name}</span>
            <span>{overview.usage.remainingQueryRuns} query runs left</span>
            <span>{overview.usage.remainingLeadAllowance} qualified leads left</span>
          </div>
        </section>

        <section className="metrics-grid">
          <MetricCard
            label="Runs created"
            value={formatNumber(overview.metrics.runsCreated)}
            detail="Live search executions started."
          />
          <MetricCard
            label="Leads found"
            value={formatNumber(overview.metrics.leadsFound)}
            detail="Stored leads across all query runs."
          />
          <MetricCard
            label="Actionable"
            value={formatNumber(overview.metrics.qualifiedLeads)}
            detail="Unlocked buyer-intelligence leads ready for outreach."
          />
        </section>

        <section className="grid-2">
          <QueryCreator />
          <div className="card">
            <div className="kicker">Usage pressure</div>
            <h3>Quota and upgrade posture</h3>
            <div className="stack muted">
              <span>{overview.usage.usage.queryRuns} runs used this month</span>
              <span>
                {overview.usage.usage.qualifiedLeads + overview.usage.usage.sendNowLeads} revealed
                buyer leads this month
              </span>
              <span>
                {overview.usage.isLeadQuotaExceeded
                  ? 'Lead reveal quota exhausted. Upgrade to unlock more.'
                  : 'Lead reveal quota still available.'}
              </span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="kicker">Recent runs</div>
          {overview.recentRuns.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Status</th>
                    <th>Raw results</th>
                    <th>Qualified leads</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentRuns.map((run) => (
                    <tr key={run.id}>
                      <td>{run.query.name}</td>
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
            <div className="empty-state">No runs yet. Create a query and execute it.</div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
