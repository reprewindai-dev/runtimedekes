interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private readonly maxRequests: number
  private readonly windowMs: number
  private readonly cleanupIntervalMs: number

  constructor(maxRequests: number = 5, windowMs: number = 60000, cleanupIntervalMs: number = 300000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.cleanupIntervalMs = cleanupIntervalMs
    
    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), cleanupIntervalMs)
  }

  private cleanup(): void {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key]
      }
    })
  }

  isAllowed(identifier: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now()
    const key = identifier
    
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs
      }
      return { allowed: true, resetTime: this.store[key].resetTime, remaining: this.maxRequests - 1 }
    }

    if (this.store[key].count >= this.maxRequests) {
      return { allowed: false, resetTime: this.store[key].resetTime, remaining: 0 }
    }

    this.store[key].count++
    return { 
      allowed: true, 
      resetTime: this.store[key].resetTime, 
      remaining: this.maxRequests - this.store[key].count 
    }
  }

  // For testing purposes
  reset(): void {
    this.store = {}
  }
}

// Create rate limiters for different use cases
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000) // 5 requests per 15 minutes
export const apiRateLimiter = new RateLimiter(100, 60 * 1000) // 100 requests per minute
export const heavyApiRateLimiter = new RateLimiter(10, 60 * 1000) // 10 requests per minute

export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const ip = forwardedFor?.split(',')[0]?.trim() || 
             realIp || 
             cfConnectingIp || 
             'unknown'
  
  // Add user agent for better uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 16)}`
}
