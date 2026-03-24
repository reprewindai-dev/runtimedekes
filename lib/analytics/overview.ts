import { db } from '@/lib/db'
import { getEntitlements } from '@/lib/billing/entitlements'

export async function getDashboardOverview(organizationId: string) {
  const [queryCount, runCount, leadsByStatus, convertedCount, recentRuns, entitlements] =
    await Promise.all([
      db.query.count({ where: { organizationId } }),
      db.run.count({ where: { organizationId } }),
      db.lead.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { status: true },
      }),
      db.outreachAction.count({ where: { organizationId, status: 'WON' } }),
      db.run.findMany({
        where: { organizationId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: {
          query: true,
        },
      }),
      getEntitlements(organizationId),
    ])

  const statusMap = Object.fromEntries(
    leadsByStatus.map((entry) => [entry.status, entry._count.status ?? 0]),
  ) as Record<string, number>

  return {
    metrics: {
      runsCreated: runCount,
      leadsFound: Object.values(statusMap).reduce((sum, value) => sum + value, 0),
      qualifiedLeads: (statusMap.SEND_NOW ?? 0) + (statusMap.QUEUE ?? 0) + (statusMap.HOLD ?? 0),
      outreachReady: statusMap.SEND_NOW ?? 0,
      conversions: convertedCount,
      activeQueries: queryCount,
    },
    usage: entitlements,
    recentRuns,
  }
}
