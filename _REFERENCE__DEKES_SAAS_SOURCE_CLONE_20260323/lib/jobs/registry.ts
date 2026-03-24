import { getQstashClient } from '@/lib/upstash/qstash'
import { ScheduledJob } from '@/lib/jobs/types'

const jobs = new Map<string, ScheduledJob>()

export function registerJob(job: ScheduledJob) {
  if (jobs.has(job.id)) {
    throw new Error(`Job ${job.id} already registered`)
  }
  jobs.set(job.id, job)
}

export function getJob(jobId: string) {
  return jobs.get(jobId)
}

export function getScheduledJobs() {
  return Array.from(jobs.values())
}

export async function runJob(jobId: string) {
  const job = getJob(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }
  return job.handler()
}

export async function scheduleJobs() {
  if (!process.env.QSTASH_TOKEN || !process.env.JOBS_ENDPOINT_URL) {
    console.warn('Skipping job scheduling: missing QStash config')
    return
  }

  const authHeader = process.env.JOBS_SECRET ? { 'x-jobs-token': process.env.JOBS_SECRET } : undefined

  const client = getQstashClient()
  await Promise.all(
    getScheduledJobs().map((job) =>
      client.publish({
        url: `${process.env.JOBS_ENDPOINT_URL}?job=${job.id}`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({ description: job.description }),
        cron: job.cron,
        retries: 3,
      })
    )
  )
}
