// Cache configuration and utilities
const CACHE_CONFIG = {
  // Static data - cache for longer periods
  STATIC_DATA_TTL: 5 * 60 * 1000, // 5 minutes
  // User-specific data - cache for shorter periods  
  USER_DATA_TTL: 2 * 60 * 1000, // 2 minutes
  // Real-time data - minimal caching
  REALTIME_TTL: 30 * 1000, // 30 seconds
  // Analytics data - cache for moderate periods
  ANALYTICS_TTL: 3 * 60 * 1000, // 3 minutes
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
const globalCache = new SimpleCache()

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => globalCache.cleanup(), 5 * 60 * 1000)
}

// Cache wrapper for fetch requests
export async function cachedFetch<T>(
  url: string,
  options: RequestInit & { ttl?: number } = {}
): Promise<T> {
  const { ttl = CACHE_CONFIG.STATIC_DATA_TTL, ...fetchOptions } = options
  const cacheKey = `${url}:${JSON.stringify(fetchOptions)}`

  // Try to get from cache first
  const cached = globalCache.get<T>(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch from network
  const response = await fetch(url, {
    ...fetchOptions,
    cache: 'no-store' // We handle caching ourselves
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  const data = await response.json()

  // Cache the response
  globalCache.set(cacheKey, data, ttl)

  return data
}

// Cache wrapper for API calls with different TTL strategies
export const cacheStrategies = {
  static: (url: string, options?: RequestInit) => 
    cachedFetch(url, { ...options, ttl: CACHE_CONFIG.STATIC_DATA_TTL }),
    
  user: (url: string, options?: RequestInit) => 
    cachedFetch(url, { ...options, ttl: CACHE_CONFIG.USER_DATA_TTL }),
    
  realtime: (url: string, options?: RequestInit) => 
    cachedFetch(url, { ...options, ttl: CACHE_CONFIG.REALTIME_TTL }),
    
  analytics: (url: string, options?: RequestInit) => 
    cachedFetch(url, { ...options, ttl: CACHE_CONFIG.ANALYTICS_TTL })
}

// Export cache utilities for manual cache management
export { globalCache, CACHE_CONFIG }
