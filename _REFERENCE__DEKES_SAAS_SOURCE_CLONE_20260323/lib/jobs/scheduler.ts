import { publishScheduledJob, publishEventJob } from '@/lib/upstash/qstash'
import { redisCache } from '@/lib/upstash/redis'

export class JobScheduler {
  private static instance: JobScheduler
  private initialized = false

  static getInstance(): JobScheduler {
    if (!JobScheduler.instance) {
      JobScheduler.instance = new JobScheduler()
    }
    return JobScheduler.instance
  }

  async initializeScheduledJobs() {
    if (this.initialized) {
      return
    }

    if (!process.env.QSTASH_TOKEN || !process.env.NEXT_PUBLIC_APP_URL) {
      console.warn('Skipping job scheduler initialization: missing QSTASH_TOKEN or NEXT_PUBLIC_APP_URL')
      return
    }

    try {
      // ECOBE handoff retry job - every 5 minutes
      await publishScheduledJob({
        jobId: 'ecobe-handoff-retry-scheduled',
        jobType: 'ecobe-handoff-retry',
        cron: '*/5 * * * *', // Every 5 minutes
        payload: { maxRetries: 3 },
      })

      // Lead enrichment batch job - every hour
      await publishScheduledJob({
        jobId: 'lead-enrichment-batch-scheduled',
        jobType: 'lead-enrichment-batch',
        cron: '0 * * * *', // Every hour at minute 0
        payload: { batchSize: 25 },
      })

      // Analytics aggregation job - every hour
      await publishScheduledJob({
        jobId: 'analytics-aggregation-scheduled',
        jobType: 'analytics-aggregation',
        cron: '0 * * * *', // Every hour at minute 0
        payload: {},
      })

      // Quota reset job - daily at midnight
      await publishScheduledJob({
        jobId: 'quota-reset-scheduled',
        jobType: 'quota-reset',
        cron: '0 0 * * *', // Daily at midnight
        payload: {},
      })

      // Lead cleanup job - daily at 2 AM
      await publishScheduledJob({
        jobId: 'lead-cleanup-scheduled',
        jobType: 'lead-cleanup',
        cron: '0 2 * * *', // Daily at 2 AM
        payload: { daysOld: 90 },
      })

      this.initialized = true
      console.log('Scheduled jobs initialized successfully')

    } catch (error) {
      console.error('Failed to initialize scheduled jobs:', error)
      throw error
    }
  }

  // Event-driven job triggers

  async triggerEcobeHandoff(handoffId: string, leadId: string) {
    const jobId = `ecobe-handoff-${handoffId}-${Date.now()}`
    
    await publishEventJob({
      jobId,
      jobType: 'ecobe-handoff-immediate',
      payload: { handoffId, leadId },
    })

    console.log(`Triggered ECOBE handoff job: ${jobId}`)
    return jobId
  }

  async triggerLeadEnrichment(leadId: string, priority = 'normal') {
    const jobId = `lead-enrichment-${leadId}-${Date.now()}`
    const delay = priority === 'high' ? 0 : 30 // 30 seconds delay for normal priority
    
    await publishEventJob({
      jobId,
      jobType: 'lead-enrichment-immediate',
      payload: { leadId },
      delay,
    })

    console.log(`Triggered lead enrichment job: ${jobId} (priority: ${priority})`)
    return jobId
  }

  async triggerAnalyticsUpdate(eventType: string, data: any) {
    const jobId = `analytics-${eventType}-${Date.now()}`
    
    await publishEventJob({
      jobId,
      jobType: 'analytics-aggregation',
      payload: { eventType, data },
    })

    console.log(`Triggered analytics update job: ${jobId}`)
    return jobId
  }

  async triggerStripeEvent(eventType: string, stripeData: any) {
    const jobId = `stripe-${eventType}-${Date.now()}`
    
    await publishEventJob({
      jobId,
      jobType: 'stripe-webhook-process',
      payload: { eventType, stripeData },
    })

    console.log(`Triggered Stripe event job: ${jobId}`)
    return jobId
  }

  // Job status monitoring

  async getJobStatus(jobId: string): Promise<any> {
    return await redisCache.getJobState(jobId)
  }

  async getRunningJobs(): Promise<any[]> {
    // This would require maintaining a list of running jobs in Redis
    // For now, return empty array
    return []
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const jobState = await redisCache.getJobState(jobId)
      if (jobState && jobState.status === 'running') {
        await redisCache.setJobState(jobId, {
          ...jobState,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        })
        return true
      }
      return false
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error)
      return false
    }
  }

  // Rate limiting for job triggers

  async canTriggerJob(jobType: string, identifier: string, limit = 10, window = 300): Promise<boolean> {
    const rateLimitKey = `job_rate_limit:${jobType}:${identifier}`
    const result = await redisCache.checkRateLimit(rateLimitKey, limit, window)
    return result.allowed
  }

  // Job health monitoring

  async getJobHealth(): Promise<{
    scheduledJobs: number
    runningJobs: number
    recentFailures: number
    lastHealthCheck: string
  }> {
    const healthKey = 'job_health:status'
    const health = await redisCache.get<{
      scheduledJobs: number
      runningJobs: number
      recentFailures: number
      lastHealthCheck: string
    }>(healthKey) || {
      scheduledJobs: 0,
      runningJobs: 0,
      recentFailures: 0,
      lastHealthCheck: new Date().toISOString(),
    }

    // Update health check timestamp
    await redisCache.set(healthKey, {
      ...health,
      lastHealthCheck: new Date().toISOString(),
    }, 3600)

    return health
  }

  async recordJobFailure(jobType: string, error: string) {
    const failureKey = `job_failures:${jobType}`
    const existing = await redisCache.get<Array<{ timestamp: string; error: string }>>(failureKey) || []
    const failures = [...existing, { timestamp: new Date().toISOString(), error }]

    // Keep only last 10 failures
    const recentFailures = failures.slice(-10)
    await redisCache.set(failureKey, recentFailures, 86400) // 24 hours

    console.error(`Job failure recorded for ${jobType}:`, error)
  }

  async getRecentFailures(jobType?: string): Promise<any[]> {
    if (jobType) {
      return await redisCache.get(`job_failures:${jobType}`) || []
    }

    // Get all recent failures across all job types
    const allFailures = []
    const jobTypes = ['ecobe-handoff-retry', 'lead-enrichment-batch', 'analytics-aggregation', 'quota-reset', 'lead-cleanup']
    
    for (const type of jobTypes) {
      const failures = await redisCache.get<Array<{ timestamp: string; error: string }>>(`job_failures:${type}`) || []
      allFailures.push(...failures.map(f => ({ ...f, jobType: type })))
    }

    // Sort by timestamp descending and return last 20
    return allFailures
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
  }
}

export const jobScheduler = JobScheduler.getInstance()
