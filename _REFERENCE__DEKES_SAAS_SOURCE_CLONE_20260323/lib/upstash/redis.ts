import { Redis } from '@upstash/redis'

let redisInstance: Redis | null = null

export function getRedis() {
  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('Missing Upstash Redis configuration: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required')
    }

    redisInstance = new Redis({
      url,
      token,
    })
  }

  return redisInstance
}

// Redis utilities for common patterns
export class RedisCache {
  private _redis: Redis | null = null

  private get redis(): Redis {
    if (!this._redis) {
      this._redis = getRedis()
    }
    return this._redis
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get<string>(key)
    return value ? (JSON.parse(value) as T) : null
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    if (ttl) {
      await this.redis.setex(key, ttl, serialized)
    } else {
      await this.redis.set(key, serialized)
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key)
    return result === 1
  }

  async increment(key: string, amount = 1): Promise<number> {
    return await this.redis.incrby(key, amount)
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl)
  }

  // Rate limiting
  async checkRateLimit(identifier: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const windowStart = now - window * 1000

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart)

    // Count current requests
    const current = await this.redis.zcard(key)

    if (current >= limit) {
      const oldestRequest = await this.redis.zrange(key, 0, 0)
      const resetTime = oldestRequest.length > 0 ? parseInt(oldestRequest[0] as string) + window * 1000 : now + window * 1000
      
      return {
        allowed: false,
        remaining: 0,
        resetTime
      }
    }

    // Add current request
    await this.redis.zadd(key, { score: now, member: now.toString() })
    await this.redis.expire(key, window)

    return {
      allowed: true,
      remaining: limit - current - 1,
      resetTime: now + window * 1000
    }
  }

  // Job state management
  async getJobState(jobId: string): Promise<any | null> {
    return this.get(`job:${jobId}:state`)
  }

  async setJobState(jobId: string, state: any, ttl = 3600): Promise<void> {
    await this.set(`job:${jobId}:state`, state, ttl)
  }

  async clearJobState(jobId: string): Promise<void> {
    await this.del(`job:${jobId}:state`)
  }
}

export const redisCache = new RedisCache()
