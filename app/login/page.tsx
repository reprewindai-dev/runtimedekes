import Link from 'next/link'

import { AppShell } from '@/components/app-shell'
import { AuthForm } from '@/components/auth-form'

export default function LoginPage() {
  return (
    <AppShell>
      <div className="page-grid">
        <section className="grid-2">
          <div className="card">
            <div className="eyebrow">Welcome back</div>
            <h1 className="display" style={{ fontSize: '3rem' }}>
              Log in and ship more pipeline.
            </h1>
            <p className="lede">
              Resume your live search workflow, inspect qualified buyers, and manage plan usage.
            </p>
          </div>
          <div className="card">
            <AuthForm mode="login" />
            <p className="muted">
              Need an account? <Link href="/signup">Create one here.</Link>
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
