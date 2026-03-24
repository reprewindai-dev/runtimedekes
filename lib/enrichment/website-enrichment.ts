import { env } from '@/lib/env'

export type WebsiteEnrichment = {
  status: 'ENRICHED' | 'FAILED'
  provider: 'website_fetch'
  payload: {
    title?: string | null
    description?: string | null
    companyName?: string | null
    contactEmail?: string | null
  }
}

function extractTag(html: string, pattern: RegExp) {
  return pattern.exec(html)?.[1]?.trim() ?? null
}

function resolveCompanyName(title: string | null, siteName: string | null, hostname: string | null) {
  if (siteName) return siteName
  if (title) return title.split('|')[0]?.split('-')[0]?.trim() ?? null
  if (!hostname) return null
  return hostname.split('.')[0]?.replace(/[-_]/g, ' ') ?? null
}

export async function fetchWebsiteEnrichment(url: string): Promise<WebsiteEnrichment> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': env.enrichmentUserAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(env.executionTimeoutMs),
    })

    if (!response.ok) {
      return { status: 'FAILED', provider: 'website_fetch', payload: {} }
    }

    const html = await response.text()
    const title = extractTag(html, /<title>([^<]+)<\/title>/i)
    const description =
      extractTag(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ??
      extractTag(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
    const siteName = extractTag(html, /<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i)
    const contactEmail = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null
    const hostname = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return null
      }
    })()

    return {
      status: 'ENRICHED',
      provider: 'website_fetch',
      payload: {
        title,
        description,
        companyName: resolveCompanyName(title, siteName, hostname),
        contactEmail,
      },
    }
  } catch {
    return { status: 'FAILED', provider: 'website_fetch', payload: {} }
  }
}
