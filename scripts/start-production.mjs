import { spawn, spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'
const npxBin = isWindows ? 'npx.cmd' : 'npx'
const port = process.env.PORT || '3000'

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
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

run(npxBin, ['prisma', 'migrate', 'deploy'])

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
