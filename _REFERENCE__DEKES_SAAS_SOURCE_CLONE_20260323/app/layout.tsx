import type { Metadata } from 'next'
import './globals.css'
import { UTMCapture } from '@/components/utm/UTMCapture'
import type { UTMData } from '@/lib/utm'

export const metadata: Metadata = {
  title: 'DEKES - AI Lead Generation',
  description: 'AI-powered lead generation with buyer intent detection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* UTMCapture writes window.dekesUTMData directly — no callback needed */}
        <UTMCapture />
        {children}
      </body>
    </html>
  )
}

// Extend window type to include UTM data
declare global {
  interface Window {
    dekesUTMData?: UTMData
  }
}
