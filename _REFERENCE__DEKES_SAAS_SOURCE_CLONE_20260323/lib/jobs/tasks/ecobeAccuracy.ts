import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ecobeFetchAnalytics } from '@/lib/ecobe/client'
import { recordMetric } from '@/lib/metrics/recorder'
import { publishEvent } from '@/lib/events/publisher'
import type { JobResult } from '@/lib/jobs/types'

export async function runEcobeAccuracyJob(): Promise<JobResult> {
  const analytics = await ecobeFetchAnalytics()

  const metricPayload = {
    totalWorkloads: analytics.totalWorkloads,
    totalCO2Saved: analytics.totalCO2Saved,
    averageCarbonIntensity: analytics.averageCarbonIntensity,
  }

  await recordMetric('job.ecobe_accuracy', metricPayload, 'ecobe')

  await prisma.carbonReport.create({
    data: {
      queryId: analytics.workloads[0]?.id ?? `aggregate-${Date.now()}`,
      actualCO2: analytics.totalCO2Saved,
      raw: analytics as Prisma.JsonObject,
    },
  })

  await publishEvent({
    type: 'EcobeAccuracyUpdated',
    source: 'jobs.ecobe-accuracy',
    payload: metricPayload,
  })

  return {
    success: true,
    processed: analytics.workloads.length,
    meta: metricPayload,
  }
}
