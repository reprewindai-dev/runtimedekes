import type { LeadStatus, Prisma } from '@prisma/client'

import { db } from '@/lib/db'
import { searchWeb } from '@/lib/adapters/execution-client'
import { routeDekesExecution } from '@/lib/adapters/ecobe-client'
import { validateGovernedRun } from '@/lib/adapters/control-plane-client'
import { getEntitlements, recordUsage } from '@/lib/billing/entitlements'
import { isControlPlaneConfigured, isEcobeConfigured } from '@/lib/env'
import { packageBuyerIntelligence } from '@/lib/leads/signal-pipeline'
import { shouldUseControlPlane, shouldUseEcobe } from '@/lib/runtime-capabilities'

function isQualified(status: LeadStatus) {
  return status === 'SEND_NOW' || status === 'QUEUE' || status === 'HOLD'
}

function buildLeadMeta(input: {
  ecobeDecision?: unknown
  controlPlane?: unknown
  recommendedStatus: LeadStatus
  queryName: string
}): Prisma.InputJsonValue {
  return {
    recommendedStatus: input.recommendedStatus,
    queryName: input.queryName,
    ...(input.ecobeDecision ? { ecobeDecision: input.ecobeDecision } : {}),
    ...(input.controlPlane ? { controlPlane: input.controlPlane } : {}),
  }
}

export async function createQuery(input: {
  organizationId: string
  createdById: string
  name: string
  description?: string
  input: string
  market: string
}) {
  return db.query.create({
    data: {
      organizationId: input.organizationId,
      createdById: input.createdById,
      name: input.name,
      description: input.description || null,
      input: input.input,
      market: input.market,
    },
  })
}

export async function executeQueryRun(input: {
  organizationId: string
  organizationSlug: string
  queryId: string
  initiatedById: string
}) {
  const entitlements = await getEntitlements(input.organizationId)
  if (!entitlements.hasQueryCapacity) {
    throw new Error('Query run limit reached for the current billing period')
  }

  if (entitlements.remainingLeadAllowance <= 0) {
    throw new Error('Qualified lead quota reached. Upgrade to continue.')
  }

  const query = await db.query.findFirst({
    where: {
      id: input.queryId,
      organizationId: input.organizationId,
    },
  })

  if (!query) {
    throw new Error('Query not found')
  }

  const ecobeDecision = shouldUseEcobe(entitlements.plan.featureFlags, isEcobeConfigured)
    ? await routeDekesExecution({
        organizationId: input.organizationId,
        source: query.name,
        workloadType: 'buyer_intelligence',
      }).catch(() => null)
    : null

  const run = await db.run.create({
    data: {
      organizationId: input.organizationId,
      queryId: query.id,
      initiatedById: input.initiatedById,
      status: 'PROCESSING',
      ecobeDecisionId: ecobeDecision?.decisionId,
      ecobeRegion: ecobeDecision?.selectedRegion ?? undefined,
      ecobeAction: ecobeDecision?.action ?? undefined,
      ecobeCarbonDelta: ecobeDecision?.carbonDelta ?? undefined,
    },
  })

  try {
    const rawResults = await searchWeb({
      query: query.input,
      market: query.market,
    })

    await recordUsage({
      organizationId: input.organizationId,
      queryId: query.id,
      runId: run.id,
      metric: 'QUERY_RUN',
      quantity: 1,
    })

    await recordUsage({
      organizationId: input.organizationId,
      queryId: query.id,
      runId: run.id,
      metric: 'RAW_RESULTS',
      quantity: rawResults.length,
    })

    const controlPlane = shouldUseControlPlane(
      entitlements.plan.featureFlags,
      isControlPlaneConfigured,
    )
      ? await validateGovernedRun({
          organizationSlug: input.organizationSlug,
          queryText: query.input,
          resultCount: rawResults.length,
        })
      : null

    const pipeline = await packageBuyerIntelligence(query.input, rawResults, {
      market: query.market,
    })
    let remainingRevealSlots = entitlements.remainingLeadAllowance
    let qualifiedLeadCount = 0
    let rejectedLeadCount = pipeline.rejectedCount

    for (const packagedLead of pipeline.leads) {
      const locked = remainingRevealSlots <= 0
      const status = locked ? 'HOLD' : packagedLead.status

      const lead = await db.lead.upsert({
        where: {
          organizationId_canonicalUrl: {
            organizationId: input.organizationId,
            canonicalUrl: packagedLead.canonicalUrl,
          },
        },
        update: {
          queryId: query.id,
          runId: run.id,
          status,
          companyName: packagedLead.companyName,
          domain: packagedLead.domain,
          sourceTitle: packagedLead.sourceTitle,
          sourceUrl: packagedLead.sourceUrl,
          snippet: packagedLead.snippet,
          score: packagedLead.score,
          whyBuying: packagedLead.whyBuying,
          whyNow: packagedLead.whyNow,
          outreachAngle: packagedLead.outreachAngle,
          recentActivity: packagedLead.recentActivity,
          businessContext: packagedLead.businessContext,
          intentSummary: packagedLead.intentSummary,
          buyingStage: packagedLead.buyingStage,
          timingWindowDays: packagedLead.timingWindowDays,
          strongSignalCount: packagedLead.strongSignalCount,
          isLocked: locked,
          evidenceSummary: packagedLead.evidenceSummary,
          qualificationNotes: `DEKES validated ${packagedLead.strongSignalCount} strong signals for "${query.name}".`,
          contactEmail: packagedLead.contactEmail ?? undefined,
          meta: buildLeadMeta({
            ecobeDecision,
            controlPlane,
            recommendedStatus: packagedLead.status,
            queryName: query.name,
          }),
        },
        create: {
          organizationId: input.organizationId,
          queryId: query.id,
          runId: run.id,
          status,
          companyName: packagedLead.companyName,
          domain: packagedLead.domain,
          sourceTitle: packagedLead.sourceTitle,
          sourceUrl: packagedLead.sourceUrl,
          canonicalUrl: packagedLead.canonicalUrl,
          snippet: packagedLead.snippet,
          score: packagedLead.score,
          whyBuying: packagedLead.whyBuying,
          whyNow: packagedLead.whyNow,
          outreachAngle: packagedLead.outreachAngle,
          recentActivity: packagedLead.recentActivity,
          businessContext: packagedLead.businessContext,
          intentSummary: packagedLead.intentSummary,
          buyingStage: packagedLead.buyingStage,
          timingWindowDays: packagedLead.timingWindowDays,
          strongSignalCount: packagedLead.strongSignalCount,
          isLocked: locked,
          evidenceSummary: packagedLead.evidenceSummary,
          qualificationNotes: `DEKES validated ${packagedLead.strongSignalCount} strong signals for "${query.name}".`,
          contactEmail: packagedLead.contactEmail ?? undefined,
          meta: buildLeadMeta({
            ecobeDecision,
            controlPlane,
            recommendedStatus: packagedLead.status,
            queryName: query.name,
          }),
        },
      })

      await db.leadEvidence.deleteMany({
        where: {
          leadId: lead.id,
        },
      })

      if (packagedLead.evidence.length) {
        await db.leadEvidence.createMany({
          data: packagedLead.evidence.map((evidence) => ({
            leadId: lead.id,
            signalKey: evidence.signalKey,
            isStrong: evidence.isStrong,
            sourceType: 'signal_validation',
            label: evidence.label,
            excerpt: evidence.excerpt,
            sourceUrl: evidence.sourceUrl,
            confidence: evidence.confidence,
          })),
        })
      }

      await db.enrichmentRecord.create({
        data: {
          leadId: lead.id,
          provider: 'buyer_intelligence_pipeline',
          status: 'ENRICHED',
          payload: {
            whyBuying: packagedLead.whyBuying,
            whyNow: packagedLead.whyNow,
            outreachAngle: packagedLead.outreachAngle,
            buyingStage: packagedLead.buyingStage,
            timingWindowDays: packagedLead.timingWindowDays,
            locked,
          },
        },
      })

      if (isQualified(packagedLead.status) && !locked) {
        qualifiedLeadCount += 1
        remainingRevealSlots -= 1

        await recordUsage({
          organizationId: input.organizationId,
          queryId: query.id,
          runId: run.id,
          metric: 'QUALIFIED_LEAD',
          quantity: 1,
        })

        if (packagedLead.status === 'SEND_NOW') {
          await recordUsage({
            organizationId: input.organizationId,
            queryId: query.id,
            runId: run.id,
            metric: 'SEND_NOW_LEAD',
            quantity: 1,
          })
        }
      }
    }

    await db.query.update({
      where: { id: query.id },
      data: { lastRunAt: new Date() },
    })

    await db.run.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        rawResultCount: pipeline.rawCount,
        keptResultCount: pipeline.keptCount,
        qualifiedLeadCount,
        rejectedLeadCount,
        controlPlaneTraceId: controlPlane?.id ?? undefined,
      },
    })

    await db.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.initiatedById,
        eventType: 'query.run.completed',
        entityType: 'run',
        entityId: run.id,
        payload: {
          rawResultCount: pipeline.rawCount,
          keptResultCount: pipeline.keptCount,
          qualifiedLeadCount,
          rejectedLeadCount,
        },
      },
    })

    return {
      runId: run.id,
      rawResultCount: pipeline.rawCount,
      keptResultCount: pipeline.keptCount,
      qualifiedLeadCount,
      rejectedLeadCount,
      entitlements: await getEntitlements(input.organizationId),
    }
  } catch (error) {
    await db.run.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Query execution failed',
      },
    })

    await db.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.initiatedById,
        eventType: 'query.run.failed',
        entityType: 'run',
        entityId: run.id,
        payload: {
          message: error instanceof Error ? error.message : 'Unknown query execution error',
        },
      },
    })

    throw error
  }
}
