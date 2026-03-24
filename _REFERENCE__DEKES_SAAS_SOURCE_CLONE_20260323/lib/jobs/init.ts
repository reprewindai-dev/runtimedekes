import { jobScheduler } from '@/lib/jobs/scheduler'

export async function initializeJobs() {
  try {
    console.log('Initializing DEKES job scheduler...')
    
    await jobScheduler.initializeScheduledJobs()
    
    console.log('✅ Job scheduler initialized successfully')
    console.log('📅 Scheduled jobs:')
    console.log('   - ECOBE handoff retries: every 5 minutes')
    console.log('   - Lead enrichment batches: every hour')
    console.log('   - Analytics aggregation: every hour')
    console.log('   - Quota resets: daily at midnight')
    console.log('   - Lead cleanup: daily at 2 AM')
    
  } catch (error) {
    console.error('❌ Failed to initialize job scheduler:', error)
    // Don't throw error - allow app to start even if jobs fail
  }
}

