import { env } from '@/lib/env'
import { humanizeCompanyName } from '@/lib/utils'

export type PageType = 'company' | 'article' | 'list' | 'directory' | 'forum' | 'unknown'

export type PageIntelligence = {
  url: string
  title: string | null
  description: string | null
  siteName: string | null
  companyName: string | null
  contactEmail: string | null
  bodyText: string
  pageType: PageType
  surface: {
    hasPricing: boolean
    hasCompare: boolean
    hasBlog: boolean
    hasWebinar: boolean
    hasNewsletter: boolean
    hasPodcast: boolean
  }
}

function extractTag(html: string, pattern: RegExp) {
  return pattern.exec(html)?.[1]?.trim() ?? null
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveCompanyName(
  title: string | null,
  siteName: string | null,
  description: string | null,
  hostname: string | null,
) {
  if (siteName) return siteName.trim()
  if (description) {
    const descriptionMatch = description.match(
      /^([A-Z][A-Za-z0-9&.+-]*(?:\s+[A-Z][A-Za-z0-9&.+-]*){0,3})\s+(?:is|helps|provides|builds|offers)\b/,
    )
    if (descriptionMatch?.[1]) {
      return descriptionMatch[1].trim()
    }
  }
  if (title) {
    const titleCandidate = title
      .split('|')[0]
      ?.split('•')[0]
      ?.trim()
    if (titleCandidate) {
      return titleCandidate
    }
  }
  if (!hostname) return null
  return humanizeCompanyName(hostname.split('.')[0] ?? '')
}

function classifyPageType(url: string, title: string | null, bodyText: string): PageType {
  const value = `${url} ${title ?? ''} ${bodyText.slice(0, 800)}`.toLowerCase()
  if (['/forum', '/community', 'discussion', 'reply', 'comment'].some((term) => value.includes(term))) {
    return 'forum'
  }
  if (['top ', 'best ', 'roundup', 'directory', '/directory', '/vendors', '/agencies', '/companies'].some((term) => value.includes(term))) {
    return value.includes('directory') ? 'directory' : 'list'
  }
  if (['/blog', '/article', '/articles', '/news', '/resources', 'published', 'read more'].some((term) => value.includes(term))) {
    return 'article'
  }
  if (['/compare', '/alternatives', '/pricing', '/careers', '/about', '/solutions'].some((term) => value.includes(term))) {
    return 'company'
  }
  return 'unknown'
}

export async function fetchPageIntelligence(url: string): Promise<PageIntelligence | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': env.enrichmentUserAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(env.executionTimeoutMs),
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    const title = extractTag(html, /<title>([^<]+)<\/title>/i)
    const description =
      extractTag(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ??
      extractTag(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
    const siteName = extractTag(html, /<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i)
    const hostname = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return null
      }
    })()
    const bodyText = stripHtml(html).slice(0, 6000)
    const companyName = resolveCompanyName(title, siteName, description, hostname)
    const pageType = classifyPageType(url, title, bodyText)
    const contactEmail = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null
    const surface = {
      hasPricing: /pricing/i.test(html),
      hasCompare: /compare|alternatives/i.test(html),
      hasBlog: /blog/i.test(html),
      hasWebinar: /webinar/i.test(html),
      hasNewsletter: /newsletter/i.test(html),
      hasPodcast: /podcast/i.test(html),
    }

    return {
      url,
      title,
      description,
      siteName,
      companyName,
      contactEmail,
      bodyText,
      pageType,
      surface,
    }
  } catch {
    return null
  }
}
