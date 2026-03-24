import { AppShell } from '@/components/app-shell'
import { BillingButton } from '@/components/billing-button'
import { MetricCard } from '@/components/metric-card'
import { requirePageSession } from '@/lib/auth/server'
import { getEntitlements } from '@/lib/billing/entitlements'
import { planCatalog } from '@/lib/plans'
import { formatCurrency } from '@/lib/utils'

export default async function BillingPage() {
  const session = await requirePageSession()
  const entitlements = await getEntitlements(session.organization.id)

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
          <div className="eyebrow">Billing</div>
          <h1 style={{ margin: '10px 0' }}>Current plan: {entitlements.plan.name}</h1>
          <p className="lede">
            Usage, quota exposure, and upgrade actions all live here. Billing gates revenue access.
          </p>
        </section>

        <section className="metrics-grid">
          <MetricCard
            label="Runs used"
            value={entitlements.usage.queryRuns}
            detail={`${entitlements.remainingQueryRuns} remaining this month`}
          />
          <MetricCard
            label="Qualified leads"
            value={entitlements.usage.qualifiedLeads + entitlements.usage.sendNowLeads}
            detail={`${entitlements.remainingLeadAllowance} reveal slots left`}
          />
          <MetricCard
            label="Status"
            value={entitlements.subscription.status}
            detail="Subscription state from the canonical billing record."
          />
        </section>

        <section className="plans-grid">
          {planCatalog.map((plan) => (
            <div className="card compact" key={plan.code}>
              <div className="kicker">{plan.name}</div>
              <h3>{plan.monthlyPriceCents ? `${formatCurrency(plan.monthlyPriceCents)}/mo` : 'Free'}</h3>
              <p className="muted">{plan.description}</p>
              <div className="stack muted">
                <span>{plan.monthlyQueryLimit} query runs</span>
                <span>{plan.monthlyLeadLimit} qualified lead reveals</span>
                <span>{plan.monthlyUserLimit} seats</span>
              </div>
              {plan.code !== 'FREE' ? (
                <BillingButton mode="checkout" planCode={plan.code} label={`Choose ${plan.name}`} />
              ) : null}
            </div>
          ))}
        </section>

        <section className="card">
          <BillingButton mode="portal" label="Open billing portal" />
        </section>
      </div>
    </AppShell>
  )
}
