import { initializeJobs } from '@/lib/jobs/init'
import { describeJobEnvStatus } from '@/lib/jobs/env'
import { jobScheduler } from '@/lib/jobs/scheduler'

async function ensureEnv() {
  const status = describeJobEnvStatus()
  if (!status.ok) {
    const message = `Cannot start DEKES worker. Missing env vars: ${status.missing.join(', ')}`
    console.error(message)
    throw new Error(message)
  }
}

async function heartbeat() {
  try {
    const health = await jobScheduler.getJobHealth()
    console.log(
      `[JOB-HEALTH] scheduled=${health.scheduledJobs} running=${health.runningJobs} recentFailures=${health.recentFailures}`
    )
  } catch (error) {
    console.error('Job health heartbeat failed', error)
  }
}

async function main() {
  console.log('🚀 DEKES worker starting...')
  await ensureEnv()
  await initializeJobs()
  console.log('✅ Scheduled jobs registered. Monitoring...')

  await heartbeat()
  setInterval(heartbeat, 5 * 60 * 1000)

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down worker...')
    process.exit(0)
  })

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down worker...')
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('❌ DEKES worker failed to start', error)
  process.exit(1)
})
