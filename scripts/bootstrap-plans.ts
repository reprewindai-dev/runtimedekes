import 'dotenv/config'

import { ensurePlansSeeded } from '@/lib/billing/entitlements'

async function main() {
  await ensurePlansSeeded()
  console.log('Plan catalog bootstrapped.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
