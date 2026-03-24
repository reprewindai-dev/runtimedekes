import { AppShell } from '@/components/app-shell'
import { BillingButton } from '@/components/billing-button'
import { getCurrentSession } from '@/lib/auth/server'
import { planCatalog } from '@/lib/plans'
import { formatCurrency } from '@/lib/utils'

export default async function PricingPage() {
  const session = await getCurrentSession()

  return (
    <AppShell
      nav={{
        signedIn: Boolean(session?.organization),
        organizationName: session?.organization?.name,
        userName: session?.user.name,
      }}
    >
      <div className="page-grid">
        <section className="card">
          <div className="eyebrow">Pricing</div>
          <h1 className="display" style={{ fontSize: '3.4rem' }}>
            Plans that push directly into revenue.
          </h1>
          <p className="lede">
            Every tier maps to query volume, qualified lead reveal limits, and customer control.
            Free is a trial loop. Paid plans are operational leverage.
          </p>
        </section>
        <section className="plans-grid">
          {planCatalog.map((plan) => (
            <div className="card compact" key={plan.code}>
              <div className="kicker">{plan.name}</div>
              <h3>{plan.monthlyPriceCents === 0 ? 'Free' : `${formatCurrency(plan.monthlyPriceCents)}/mo`}</h3>
              <p className="muted">{plan.description}</p>
              <div className="stack muted">
                <span>{plan.monthlyQueryLimit} query runs per month</span>
                <span>{plan.monthlyLeadLimit} qualified leads per month</span>
                <span>{plan.monthlyUserLimit} seats</span>
              </div>
              {session?.organization && plan.code !== 'FREE' ? (
                <BillingButton mode="checkout" planCode={plan.code} label={`Upgrade to ${plan.name}`} />
              ) : null}
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  )
}
