import crypto from 'node:crypto'

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function hashValue(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function humanizeCompanyName(input: string) {
  return input
    .trim()
    .replace(/^www\./i, '')
    .replace(/\.[a-z]{2,}$/i, '')
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function canonicalizeUrl(input: string) {
  try {
    const url = new URL(input)
    url.hash = ''
    url.search = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return input.trim()
  }
}

export function extractDomain(input: string) {
  try {
    const url = new URL(input)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function extractRootDomain(input: string) {
  const host = extractDomain(input)
  if (!host) {
    return null
  }

  const parts = host.split('.')
  if (parts.length <= 2) {
    return host
  }

  return parts.slice(-2).join('.')
}

export function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

export function endOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0))
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}
