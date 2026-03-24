import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Fraunces, Manrope } from 'next/font/google'

import '@/app/globals.css'

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
})

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'DEKES',
  description: 'Buyer qualification and live lead intelligence for teams that need revenue now.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
