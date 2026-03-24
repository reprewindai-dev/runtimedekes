'use client'

import { useEffect } from 'react'
import { getUTMWithFallback, hasUTMData } from '@/lib/utm'

// No props needed — component writes to window.dekesUTMData directly,
// which avoids passing function props from a Server Component layout.
export function UTMCapture() {
  useEffect(() => {
    const utmData = getUTMWithFallback()
    if (hasUTMData(utmData)) {
      window.dekesUTMData = utmData
    }
  }, [])

  return null
}

export default UTMCapture
