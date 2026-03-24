import { prisma } from '@/lib/db'
import { publishEvent } from '@/lib/events/publisher'
import { recordMetric } from '@/lib/metrics/recorder'
import type { JobResult } from '@/lib/jobs/types'

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export async function runQuotaResetJob(): Promise<JobResult> {
  const today = new Date()
  const organizations = await prisma.organization.findMany({
    where: {
      quotaResetDate: {
        lte: today,
      },
    },
    select: { id: true, monthlyLeadQuota: true },
  })

  if (organizations.length === 0) {
    return { success: true, processed: 0 }
  }

  await Promise.all(
    organizations.map((org) =>
      prisma.organization.update({
        where: { id: org.id },
        data: {
          monthlyLeadsUsed: 0,
          quotaResetDate: addDays(today, 30),
        },
      })
    )
  )

  await recordMetric('job.quota_reset', { count: organizations.length }, 'dekes')

  await publishEvent({
    type: 'QuotaReset',
    source: 'jobs.quota-reset',
    payload: {
      organizationIds: organizations.map((org) => org.id),
    },
  })

  return { success: true, processed: organizations.length }
}
