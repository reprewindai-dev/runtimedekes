import Image from 'next/image'
import Link from 'next/link'

import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { getCurrentSession } from '@/lib/auth/server'
import { formatCurrency } from '@/lib/utils'
import { planCatalog } from '@/lib/plans'

export default async function HomePage() {
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
        <section className="hero">
          <div className="card hero-panel">
            <div className="hero-mark">
              <div className="hero-logo">
                <Image src="/dekes-mark.svg" alt="DEKES constellation mark" width={82} height={82} />
              </div>
              <div>
                <div className="eyebrow">Buyer-intent intelligence</div>
                <div className="hero-strap">
                  Signal mapping for teams that need timing, context, and a reason to reach out now.
                </div>
              </div>
            </div>
            <h1 className="display">Find buyers that are already moving.</h1>
            <p className="lede">
              DEKES shows who is buying, why they are buying, why now, and what to say before your
              competitors get there. The product is built to turn live signal detection into
              immediate outbound action and paid retention.
            </p>
            <div className="button-row">
              <Link className="button" href={session?.organization ? '/dashboard' : '/signup'}>
                {session?.organization ? 'Open dashboard' : 'Start free'}
              </Link>
              <Link className="button-secondary" href="/pricing">
                View pricing
              </Link>
            </div>
          </div>
          <div className="card hero-orbit">
            <div className="brand-grid">
              <div>
                <div className="kicker">Brand system</div>
                <h3>Deep intelligence blue, signal blue, accent teal.</h3>
              </div>
              <div className="brand-swatches">
                <div className="swatch deep">
                  <strong>Deep Intelligence</strong>
                  <span>#081220</span>
                </div>
                <div className="swatch panel">
                  <strong>Midnight Panel</strong>
                  <span>#111B38</span>
                </div>
                <div className="swatch signal">
                  <strong>Signal Blue</strong>
                  <span>#1766EF</span>
                </div>
                <div className="swatch accent">
                  <strong>Accent Teal</strong>
                  <span>#00D1C7</span>
                </div>
              </div>
            </div>
            <div className="hero-note">
              <div className="kicker">Core promise</div>
              <p className="muted" style={{ marginBottom: 0 }}>
                “DEKES shows you who is buying, why they’re buying, and what to say before your
                competitors reach them.”
              </p>
            </div>
            <div className="signal-list">
              <div className="signal-item">
                <strong>Why they are buying</strong>
                <span className="muted">
                  Hiring, comparisons, research spikes, funding, or execution gaps.
                </span>
              </div>
              <div className="signal-item">
                <strong>Why now</strong>
                <span className="muted">
                  A timing window and buying stage for the current signal cluster.
                </span>
              </div>
              <div className="signal-item">
                <strong>What to say</strong>
                <span className="muted">
                  An outreach angle built from the signal pattern, not generic copy.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          <MetricCard label="Signal speed" value="10" detail="Live search results processed per run." />
          <MetricCard label="Lead model" value="4" detail="SEND_NOW, QUEUE, HOLD, REJECTED." />
          <MetricCard label="Upgrade path" value="3" detail="Starter, Growth, and Pro force clear revenue ladders." />
        </section>

        <section className="plans-grid">
          {planCatalog
            .filter((plan) => plan.code !== 'FREE')
            .map((plan) => (
              <div className="card compact" key={plan.code}>
                <div className="kicker">{plan.name}</div>
                <h3>{formatCurrency(plan.monthlyPriceCents)}/mo</h3>
                <p className="muted">{plan.description}</p>
                <div className="stack muted">
                  <span>{plan.monthlyQueryLimit} query runs / month</span>
                  <span>{plan.monthlyLeadLimit} buyer leads / month</span>
                  <span>{plan.monthlyUserLimit} seats</span>
                </div>
              </div>
            ))}
        </section>
      </div>
    </AppShell>
  )
}
