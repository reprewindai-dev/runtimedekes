export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logEnvStatus } = await import('./lib/env')
    logEnvStatus()
  }
}
