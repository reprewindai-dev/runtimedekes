import { spawn, spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'
const npxBin = isWindows ? 'npx.cmd' : 'npx'
const port = process.env.PORT || '3000'

function deriveMigrationDatabaseUrl() {
  if (process.env.DIRECT_URL?.trim()) {
    return process.env.DIRECT_URL
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl?.trim()) {
    return databaseUrl
  }

  try {
    const url = new URL(databaseUrl)
    if (url.hostname.includes('-pooler.')) {
      url.hostname = url.hostname.replace('-pooler.', '.')
      return url.toString()
    }
  } catch {
    return databaseUrl
  }

  return databaseUrl
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    shell: false,
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const migrationEnv = {
  ...process.env,
  DATABASE_URL: deriveMigrationDatabaseUrl(),
}

run(npxBin, ['prisma', 'migrate', 'deploy'], migrationEnv)

const next = spawn(npxBin, ['next', 'start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  env: process.env,
  shell: false,
})

next.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

next.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
