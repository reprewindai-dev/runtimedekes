import Link from 'next/link'

import { AppShell } from '@/components/app-shell'
import { AuthForm } from '@/components/auth-form'

export default function SignupPage() {
  return (
    <AppShell>
      <div className="page-grid">
        <section className="grid-2">
          <div className="card">
            <div className="eyebrow">Start the loop</div>
            <h1 className="display" style={{ fontSize: '3rem' }}>
              Create your DEKES workspace.
            </h1>
            <p className="lede">
              Your free plan includes a real organization, secure auth, live search execution, and
              quota-based upgrade pressure from day one.
            </p>
          </div>
          <div className="card">
            <AuthForm mode="signup" />
            <p className="muted">
              Already have an account? <Link href="/login">Log in here.</Link>
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
