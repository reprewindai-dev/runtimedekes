import { prisma } from './db'

export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    console.log(`Cleaned up ${result.count} expired sessions`)
    return result.count
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error)
    throw error
  }
}

// For use in API routes or scheduled jobs
export async function handleSessionCleanup(): Promise<{ success: boolean; cleanedCount?: number; error?: string }> {
  try {
    const cleanedCount = await cleanupExpiredSessions()
    return { success: true, cleanedCount }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Session cleanup failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

// Create a session cleanup API endpoint
export async function runSessionCleanup() {
  const result = await handleSessionCleanup()
  
  if (result.success) {
    return {
      success: true,
      message: `Successfully cleaned up ${result.cleanedCount} expired sessions`,
      cleanedCount: result.cleanedCount
    }
  } else {
    return {
      success: false,
      message: 'Session cleanup failed',
      error: result.error
    }
  }
}
