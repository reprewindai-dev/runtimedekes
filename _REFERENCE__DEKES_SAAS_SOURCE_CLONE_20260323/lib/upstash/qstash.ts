import { Receiver } from '@upstash/qstash'
import { serve } from '@upstash/qstash/cloudflare'

// QStash configuration
export function getQstashReceiver() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY

  if (!currentSigningKey) {
    throw new Error('Missing QSTASH_CURRENT_SIGNING_KEY')
  }

  return new Receiver({
    currentSigningKey,
    nextSigningKey,
  })
}

// QStash client for publishing
export function getQstashClient() {
  const token = process.env.QSTASH_TOKEN
  if (!token) {
    throw new Error('Missing QSTASH_TOKEN')
  }

  return {
    publish: async (options: {
      url: string
      method?: string
      headers?: Record<string, string>
      body?: string
      delay?: number
      retries?: number
      cron?: string
    }) => {
      // QStash V2 API: URL goes in the path
      const publishUrl = `https://qstash.upstash.io/v2/publish/${options.url}`
      
      // Build headers for V2 API
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
      
      // V2 uses Upstash-* headers for options
      if (options.method) {
        headers['Upstash-Method'] = options.method
      }
      if (options.delay) {
        headers['Upstash-Delay'] = `${options.delay}s`
      }
      if (options.retries) {
        headers['Upstash-Retries'] = String(options.retries)
      }
      if (options.cron) {
        headers['Upstash-Cron'] = options.cron
      }
      
      // Add custom headers
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          headers[`Upstash-Forward-${key}`] = value
        }
      }

      const response = await fetch(publishUrl, {
        method: 'POST',
        headers,
        body: options.body,
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`QStash publish failed: ${error}`)
      }

      return response.json()
    }
  }
}

// Job types for type safety
export interface QstashJob {
  id: string
  type: 'event-driven' | 'scheduled'
  payload: any
  scheduledFor?: Date
  retryCount?: number
  maxRetries?: number
}

// Event-driven job publishing
export async function publishEventJob(options: {
  jobId: string
  jobType: string
  payload: any
  delay?: number
  retries?: number
}) {
  const client = getQstashClient()
  
  return await client.publish({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/runner`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Job-Type': options.jobType,
      'X-Job-ID': options.jobId,
    },
    body: JSON.stringify(options.payload),
    delay: options.delay,
    retries: options.retries || 3,
  })
}

// Scheduled job publishing
export async function publishScheduledJob(options: {
  jobId: string
  jobType: string
  cron: string
  payload: any
}) {
  const client = getQstashClient()
  
  return await client.publish({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/runner`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Job-Type': options.jobType,
      'X-Job-ID': options.jobId,
    },
    body: JSON.stringify(options.payload),
    cron: options.cron,
  })
}

// Retry policy implementation
export class RetryPolicy {
  static getRetryDelay(attempt: number): number {
    const delays = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000] // 5m, 15m, 60m
    return delays[attempt] || delays[delays.length - 1]
  }

  static shouldRetry(attempt: number, maxRetries: number = 3): boolean {
    return attempt < maxRetries
  }

  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    jobId: string,
    maxRetries: number = 3
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    let lastError: string = ''

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation()
        return { success: true, result }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        
        if (!this.shouldRetry(attempt, maxRetries)) {
          break
        }

        const delay = this.getRetryDelay(attempt)
        console.log(`Job ${jobId} attempt ${attempt + 1} failed, retrying in ${delay / 1000}s: ${lastError}`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return { success: false, error: lastError }
  }
}

// Webhook verification middleware
export async function verifyQstashWebhook(req: Request) {
  const receiver = getQstashReceiver()
  const body = await req.text()
  return receiver.verify({
    signature: req.headers.get('Upstash-Signature') || '',
    body,
  })
}
