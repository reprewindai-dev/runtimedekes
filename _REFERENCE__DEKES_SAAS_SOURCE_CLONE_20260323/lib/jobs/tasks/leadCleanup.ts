import { prisma } from '@/lib/db'
import { recordMetric } from '@/lib/metrics/recorder'
import type { JobResult } from '@/lib/jobs/types'

const STALE_DAYS = 45

export async function runLeadCleanupJob(): Promise<JobResult> {
  // Find canonicalHashes that appear more than once per org.
  // Prisma groupBy requires orderBy when take is used.
  const duplicates = await prisma.lead.groupBy({
    by: ['organizationId', 'canonicalHash'],
    _count: { _all: true },
    having: {
      canonicalHash: { _count: { gt: 1 } },
    },
    orderBy: { canonicalHash: 'asc' },
    take: 25,
  })

  let duplicateUpdates = 0

  for (const dup of duplicates) {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: dup.organizationId,
        canonicalHash: dup.canonicalHash,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (leads.length <= 1) continue
    const primary = leads[0]
    const rest = leads.slice(1)

    await Promise.all(
      rest.map((lead) =>
        prisma.lead.update({
          where: { id: lead.id },
          data: {
            isDuplicate: true,
            duplicateOfLeadId: primary.id,
          },
        })
      )
    )
    duplicateUpdates += rest.length
  }

  const staleSince = new Date()
  staleSince.setDate(staleSince.getDate() - STALE_DAYS)

  const staleQueries = await prisma.query.updateMany({
    where: {
      enabled: true,
      updatedAt: { lt: staleSince },
      runsCount: 0,
    },
    data: { enabled: false },
  })

  await recordMetric(
    'job.lead_cleanup',
    {
      duplicatesFlagged: duplicateUpdates,
      staleQueriesDisabled: staleQueries.count,
    },
    'dekes'
  )

  return {
    success: true,
    processed: duplicateUpdates + staleQueries.count,
    meta: { duplicatesFlagged: duplicateUpdates, staleQueriesDisabled: staleQueries.count },
  }
}
