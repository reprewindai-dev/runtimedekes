export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth/jwt'
import { ecobeOptimizeQuery, ecobeReportCarbonUsage } from '@/lib/ecobe/client'
import {
  ecobeRouteWorkload,
  ecobeCompleteWorkload,
  type EcobeRouteResponse,
} from '@/lib/ecobe/router'
import { prisma } from '@/lib/db'
import { generateLeadsFromSearch } from '@/lib/leads/generator'
import { getQstashClient } from '@/lib/upstash/qstash'
import { emitDksWorkload, dksWorkloadEmitter } from '@/lib/integrations/dks-workload-emitter'

const runSchema = z.object({
  queryId: z.string().min(1).optional(),
  query: z.string().min(1),
  estimatedResults: z.number().int().positive().default(100),
  carbonBudget: z.number().positive().default(10000),
  regions: z.array(z.string()).min(1).default(['US-CAL-CISO', 'FR', 'DE']),
  /** Minutes the workload can be delayed before it must run. Defaults to 60. */
  delayToleranceMinutes: z.number().int().nonnegative().default(60),
})

export async function POST(request: Request) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      cookies().get('DEKES_SESSION')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(token)
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = runSchema.parse(body)

    const organizationId = session.user.organizationId

    // ── 0. Quota enforcement ─────────────────────────────────────────────────
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true, monthlyLeadQuota: true, monthlyLeadsUsed: true },
    })

    if (org && org.monthlyLeadQuota > 0) {
      const currentCount = org.monthlyLeadsUsed ?? 0
      if (currentCount >= org.monthlyLeadQuota) {
        return NextResponse.json(
          {
            error: 'Monthly lead quota exceeded',
            quota: org.monthlyLeadQuota,
            used: currentCount,
            plan: org.plan,
            upgradeUrl: '/settings/billing',
          },
          { status: 429 },
        )
      }
    }

    // ── 1. Upsert query ────────────────────────────────────────────────────────
    const query = data.queryId
      ? await prisma.query.findFirst({
          where: { id: data.queryId, organizationId },
        })
      : null

    const ensuredQuery = query
      ? await prisma.query.update({
          where: { id: query.id },
          data: { query: data.query, enabled: true },
        })
      : await prisma.query.create({
          data: {
            organizationId,
            name: data.query,
            query: data.query,
            enabled: true,
          },
        })

    // ── 2. Create run (STARTED) ────────────────────────────────────────────────
    const run = await prisma.run.create({
      data: {
        organizationId,
        queryId: ensuredQuery.id,
        status: 'STARTED',
      },
    })

    // ── 3. ECOBE carbon-aware routing ─────────────────────────────────────────
    let routing: EcobeRouteResponse | null = null
    try {
      routing = await ecobeRouteWorkload({
        organizationId,
        source: 'DEKES',
        workloadType: 'lead_generation_batch',
        candidateRegions: data.regions,
        durationMinutes: Math.ceil(data.estimatedResults / 100) * 2, // ~2 min per 100 results
        delayToleranceMinutes: data.delayToleranceMinutes,
      })
    } catch (err) {
      console.warn('[leads/run] ECOBE routing unavailable — proceeding without routing decision', {
        organizationId,
        runId: run.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // ── 3.5. CO₂Router workload emission for carbon command tracking ─────────────
    let co2routerCommandId: string | undefined
    try {
      const co2routerResponse = await emitDksWorkload(
        'lead_generation_batch',
        organizationId,
        {
          leadId: undefined, // Will be created after lead generation
          queryId: ensuredQuery.id,
          runId: run.id,
          userId: session.user.id,
          signalType: 'lead_generation',
          estimatedQueries: data.estimatedResults,
          durationMinutes: Math.ceil(data.estimatedResults / 100) * 2,
        },
        {
          priority: 'medium',
          carbonPriority: 'high', // DKS workloads prioritize carbon savings
          candidateRegions: data.regions,
          maxLatencyMs: data.delayToleranceMinutes * 60 * 1000,
        }
      )
      
      if (co2routerResponse.success && co2routerResponse.commandId) {
        co2routerCommandId = co2routerResponse.commandId
        console.log('[leads/run] CO₂Router workload emitted successfully', {
          runId: run.id,
          commandId: co2routerCommandId,
          selectedRegion: co2routerResponse.recommendation?.selectedRegion,
        })
      } else {
        console.warn('[leads/run] CO₂Router workload emission failed', {
          runId: run.id,
          error: co2routerResponse.error,
        })
      }
    } catch (err) {
      console.warn('[leads/run] CO₂Router integration error — proceeding without carbon command tracking', {
        runId: run.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // ── 4. Handle delay: persist state and schedule a retry job ───────────────
    if (routing?.action === 'delay') {
      const retryAfterMinutes = routing.predicted_clean_window?.expected_minutes ?? 60

      await prisma.run.update({
        where: { id: run.id },
        data: {
          status: 'DELAYED',
          ecobeDecisionId: routing.decisionId,
          ecobeRegion: routing.predicted_clean_window?.region ?? null,
          ecobeCarbonDelta: routing.carbonDelta ?? null,
          ecobeQualityTier: routing.qualityTier ?? null,
          ecobePolicyAction: routing.policyAction ?? null,
          ecobeDecisionTimestamp: new Date(routing.timestamp),
        },
      })

      // Schedule QStash retry after the clean window
      try {
        const client = getQstashClient()
        await client.publish({
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/run-delayed`,
          method: 'POST',
          body: JSON.stringify({
            runId: run.id,
            queryId: ensuredQuery.id,
            query: data.query,
            estimatedResults: data.estimatedResults,
            regions: data.regions,
            organizationId,
            decisionId: routing.decisionId,
            selectedRegion: routing.predicted_clean_window?.region ?? data.regions[0],
          }),
          delay: retryAfterMinutes * 60,
          retries: 2,
        })
      } catch (schedErr) {
        console.error('[leads/run] Failed to schedule delayed run via QStash', {
          runId: run.id,
          decisionId: routing.decisionId,
          error: schedErr instanceof Error ? schedErr.message : String(schedErr),
        })
      }

      return NextResponse.json(
        {
          organizationId,
          query: { id: ensuredQuery.id, query: ensuredQuery.query },
          run: { id: run.id, status: 'DELAYED' },
          routing: {
            action: 'delay',
            decisionId: routing.decisionId,
            retryAfterMinutes,
            cleanWindowRegion: routing.predicted_clean_window?.region,
          },
        },
        { status: 202 },
      )
    }

    // ── 5. Determine execution region (execute / reroute / fallback) ───────────
    const executionRegion =
      (routing?.action === 'reroute' ? routing.target : routing?.selectedRegion) ??
      data.regions[0]

    // Persist routing metadata before workload runs
    if (routing) {
      await prisma.run.update({
        where: { id: run.id },
        data: {
          ecobeDecisionId: routing.decisionId,
          ecobeRegion: executionRegion,
          ecobeCarbonDelta: routing.carbonDelta ?? null,
          ecobeQualityTier: routing.qualityTier ?? null,
          ecobePolicyAction: routing.policyAction ?? null,
          ecobeDecisionTimestamp: new Date(routing.timestamp),
        },
      })
    }

    // ── 6. Legacy ECOBE optimize (kept for CO₂ estimation) ───────────────────
    let optimization: Awaited<ReturnType<typeof ecobeOptimizeQuery>>
    try {
      optimization = await ecobeOptimizeQuery({
        query: {
          id: ensuredQuery.id,
          query: data.query,
          estimatedResults: data.estimatedResults,
        },
        carbonBudget: data.carbonBudget,
        regions: data.regions,
      })
    } catch (error) {
      console.warn('ECOBE optimize unavailable, falling back to default region', error)
      optimization = { selectedRegion: executionRegion, fallback: true }
    }

    // ── 7. Generate leads ─────────────────────────────────────────────────────
    const runStart = Date.now()
    const leadGeneration = await generateLeadsFromSearch({
      query: data.query,
      organizationId,
      queryId: ensuredQuery.id,
      runId: run.id,
      regions: data.regions,
      selectedRegion: executionRegion,
      estimatedResults: data.estimatedResults,
    })

    const durationMinutes = Math.ceil((Date.now() - runStart) / 60_000) || 1

    // ── 8. Finish run + increment quota counter ────────────────────────────
    const [finishedRun] = await Promise.all([
      prisma.run.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          status: 'FINISHED',
          resultCount: leadGeneration.requested,
          leadCount: leadGeneration.inserted,
        },
      }),
      prisma.organization.update({
        where: { id: organizationId },
        data: { monthlyLeadsUsed: { increment: leadGeneration.inserted } },
      }).catch(() => {}),
    ])

    // ── 9. Report CO₂ to ECOBE (best-effort) ─────────────────────────────────
    const estimatedEnergyKwh = (data.estimatedResults / 1000) * 0.05
    const estimatedCO2 =
      typeof optimization.estimatedCO2 === 'number' ? optimization.estimatedCO2 : null
    const carbonIntensity =
      estimatedEnergyKwh > 0 && estimatedCO2 !== null
        ? estimatedCO2 / estimatedEnergyKwh
        : null
    const actualEnergyKwh = (leadGeneration.requested / 1000) * 0.05
    const fallbackCarbonIntensity = 500
    const actualCO2 = actualEnergyKwh * (carbonIntensity ?? fallbackCarbonIntensity)

    ecobeReportCarbonUsage({ queryId: ensuredQuery.id, actualCO2 }).catch((err) =>
      console.error('[leads/run] Failed to report ECOBE carbon usage', {
        queryId: ensuredQuery.id,
        actualCO2,
        error: err instanceof Error ? err.message : String(err),
      }),
    )

    // ── 9.5. Report outcome to CO₂Router (best-effort) ─────────────────────────
    if (co2routerCommandId) {
      try {
        await dksWorkloadEmitter.reportOutcome({
          commandId: co2routerCommandId,
          sourceApp: 'dks',
          execution: {
            actualRegion: executionRegion,
            actualStartAt: new Date(runStart).toISOString(),
            actualEndAt: new Date().toISOString(),
            actualLatencyMs: durationMinutes * 60 * 1000,
            actualCpuHours: actualEnergyKwh, // Approximate CPU hours from energy
          },
          emissions: {
            actualCarbonIntensity: carbonIntensity ?? fallbackCarbonIntensity,
            actualEmissionsKgCo2e: actualCO2 / 1000, // Convert g to kg
            measurementSource: 'estimated', // DKS provides estimates
          },
          status: {
            completed: true,
            slaMet: durationMinutes <= (data.delayToleranceMinutes || 60),
            fallbackTriggered: !routing || routing.action === 'fallback',
          },
          metadata: {
            queryId: ensuredQuery.id,
            runId: run.id,
            actualQueries: leadGeneration.requested,
            actualSignals: leadGeneration.inserted,
            organizationId,
            workloadType: 'lead_generation_batch',
          },
        })
        console.log('[leads/run] CO₂Router outcome reported successfully', {
          commandId: co2routerCommandId,
          actualCO2: actualCO2 / 1000,
          region: executionRegion,
        })
      } catch (err) {
        console.error('[leads/run] Failed to report CO₂Router outcome', {
          commandId: co2routerCommandId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // ── 10. Post-run feedback to ECOBE routing API (best-effort) ─────────────
    if (routing?.decisionId) {
      ecobeCompleteWorkload({
        decision_id: routing.decisionId,
        executionRegion,
        durationMinutes,
        status: 'success',
      }).catch((err) =>
        console.error('[leads/run] Failed to send ECOBE workload completion', {
          decisionId: routing.decisionId,
          runId: run.id,
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    }

    // ── 11. Carbon savings badge ───────────────────────────────────────────
    const defaultIntensity = 400 // gCO2/kWh global average
    const routedIntensity = typeof optimization.estimatedCO2 === 'number'
      ? optimization.estimatedCO2 / Math.max(actualEnergyKwh, 0.001)
      : defaultIntensity
    const carbonSavedGrams = Math.max(0, (defaultIntensity - routedIntensity) * actualEnergyKwh)
    const carbonBadge = {
      carbonSavedGrams: Math.round(carbonSavedGrams * 100) / 100,
      routedRegion: executionRegion,
      routedIntensityGCO2: Math.round(routedIntensity),
      defaultIntensityGCO2: defaultIntensity,
      reductionPct: routedIntensity < defaultIntensity
        ? Math.round((1 - routedIntensity / defaultIntensity) * 100)
        : 0,
    }

    return NextResponse.json({
      organizationId,
      query: { id: ensuredQuery.id, query: ensuredQuery.query },
      run: {
        id: finishedRun.id,
        status: finishedRun.status,
        startedAt: finishedRun.startedAt,
        finishedAt: finishedRun.finishedAt,
        resultCount: finishedRun.resultCount,
        leadCount: finishedRun.leadCount,
      },
      routing: routing
        ? {
            action: routing.action,
            decisionId: routing.decisionId,
            selectedRegion: executionRegion,
            carbonDelta: routing.carbonDelta,
            qualityTier: routing.qualityTier,
            policyAction: routing.policyAction,
            decisionTimestamp: routing.timestamp,
          }
        : null,
      optimization,
      leadGeneration,
      carbonBadge,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[leads/run] Unhandled error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to run leads' }, { status: 500 })
  }
}
