import { cleanupExpiredSessions } from '@/lib/session-cleanup'

// Run session cleanup every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export default function sessionCleanupScheduler() {
  // Initial cleanup on startup
  setTimeout(async () => {
    try {
      await cleanupExpiredSessions()
      console.log('Initial session cleanup completed')
    } catch (error) {
      console.error('Initial session cleanup failed:', error)
    }
  }, 5000) // Wait 5 seconds after startup

  // Schedule regular cleanup
  setInterval(async () => {
    try {
      await cleanupExpiredSessions()
      console.log('Scheduled session cleanup completed')
    } catch (error) {
      console.error('Scheduled session cleanup failed:', error)
    }
  }, CLEANUP_INTERVAL_MS)

  console.log(`Session cleanup scheduler initialized (runs every ${CLEANUP_INTERVAL_MS / 1000 / 60} minutes)`)
}

// Export for manual triggering if needed
export { cleanupExpiredSessions }
