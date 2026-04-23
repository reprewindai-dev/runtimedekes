import { spawn } from 'node:child_process'

const steps = [
  {
    name: 'typecheck',
    command: 'npm',
    args: ['run', 'typecheck'],
  },
  {
    name: 'test',
    command: 'npm',
    args: ['run', 'test'],
  },
  {
    name: 'build',
    command: 'npm',
    args: ['run', 'build'],
  },
]

const hasSearchCredentials =
  Boolean(process.env.SERPER_API_KEY) || Boolean(process.env.BRAVE_SEARCH_API_KEY) || Boolean(process.env.SERPAPI_API_KEY)

if (hasSearchCredentials) {
  steps.push({
    name: 'benchmark',
    command: 'npm',
    args: ['run', 'benchmark:quality'],
  })
}

if (process.env.APP_URL) {
  steps.push({
    name: 'live-smoke',
    command: 'node',
    args: ['-e', `
      const baseUrl = process.env.APP_URL.replace(/\\/$/, '')
      const paths = ['/', '/api/health', '/dashboard', '/leads', '/queries']
      const fetchWithTimeout = async (url) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 15000)
        try {
          return await fetch(url, { signal: controller.signal, cache: 'no-store' })
        } finally {
          clearTimeout(timer)
        }
      }

      const main = async () => {
        for (const path of paths) {
          const response = await fetchWithTimeout(\`\${baseUrl}\${path}\`)
          if (!response.ok) {
            throw new Error(\`\${path} returned \${response.status}\`)
          }
        }
        console.log(JSON.stringify({ ok: true, baseUrl, checked: paths }, null, 2))
      }

      main().catch((error) => {
        console.error(error)
        process.exit(1)
      })
    `],
  })
}

async function main() {
  for (const step of steps) {
    console.log(`\n==> ${step.name}`)
    await run(step.command, step.args)
  }

  console.log('\nAll automation steps completed.')
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
