import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { SignOutButton } from '@/components/sign-out-button'

type NavContext = {
  signedIn?: boolean
  organizationName?: string
  userName?: string | null
}

export function AppShell({
  children,
  nav,
}: {
  children: ReactNode
  nav?: NavContext
}) {
  return (
    <div className="site-shell">
      <nav className="site-nav">
        <div className="nav-links">
          <Link href="/" className="brand-mark">
            <span className="brand-chip">
              <Image src="/dekes-mark.svg" alt="DEKES mark" width={28} height={28} />
            </span>
            <span className="brand-word">DEKES</span>
          </Link>
          {nav?.signedIn ? (
            <>
              <Link href="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <Link href="/queries" className="nav-link">
                Queries
              </Link>
              <Link href="/leads" className="nav-link">
                Leads
              </Link>
              <Link href="/billing" className="nav-link">
                Billing
              </Link>
              <Link href="/settings" className="nav-link">
                Settings
              </Link>
              <Link href="/admin" className="nav-link">
                Admin
              </Link>
            </>
          ) : (
            <>
              <Link href="/pricing" className="nav-link">
                Pricing
              </Link>
              <Link href="/login" className="nav-link">
                Login
              </Link>
            </>
          )}
        </div>
        <div className="nav-actions">
          {nav?.organizationName ? (
            <span className="muted">
              {nav.organizationName}
              {nav.userName ? ` · ${nav.userName}` : ''}
            </span>
          ) : null}
          {nav?.signedIn ? (
            <SignOutButton />
          ) : (
            <Link href="/signup" className="button">
              Start free
            </Link>
          )}
        </div>
      </nav>
      {children}
    </div>
  )
}
