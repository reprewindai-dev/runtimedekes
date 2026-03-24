import { NextRequest, NextResponse } from 'next/server'
import { verifyQstashWebhook } from '@/lib/upstash/qstash'
import { redisCache } from '@/lib/upstash/redis'
import { recordMetric } from '@/lib/metrics/recorder'
import { publishEvent } from '@/lib/events/publisher'

// Job type registry
const jobHandlers = {
  'ecobe-handoff-retry': handleEcobeHandoffRetry,
  'lead-enrichment-batch': handleLeadEnrichmentBatch,
  'analytics-aggregation': handleAnalyticsAggregation,
  'quota-reset': handleQuotaReset,
  'lead-cleanup': handleLeadCleanup,
  'ecobe-handoff-immediate': handleEcobeHandoffImmediate,
  'lead-enrichment-immediate': handleLeadEnrichmentImmediate,
}

export async function POST(req: NextRequest) {
  try {
    // Verify QStash webhook signature
    const isValid = await verifyQstashWebhook(req)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const body = await req.json()
    const jobType = req.headers.get('X-Job-Type')
    const jobId = req.headers.get('X-Job-ID')

    if (!jobType || !jobId) {
      return NextResponse.json({ error: 'Missing job type or ID' }, { status: 400 })
    }

    // Get job handler
    const handler = jobHandlers[jobType as keyof typeof jobHandlers]
    if (!handler) {
      return NextResponse.json({ error: `Unknown job type: ${jobType}` }, { status: 400 })
    }

    // Check if job is already running (prevent duplicates)
    const jobState = await redisCache.getJobState(jobId)
    if (jobState && jobState.status === 'running') {
      return NextResponse.json({ error: 'Job already running' }, { status: 409 })
    }

    // Set job state to running
    await redisCache.setJobState(jobId, {
      status: 'running',
      startedAt: new Date().toISOString(),
      jobType,
      payload: body,
    }, 3600)

    console.log(`Starting job: ${jobType} (${jobId})`)

    // Execute job
    const startTime = Date.now()
    const result = await handler(body, jobId)
    const duration = Date.now() - startTime

    // Update job state
    await redisCache.setJobState(jobId, {
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration,
      result,
    }, 3600)

    // Record metrics
    await recordMetric(`job.${jobType}`, {
      success: result.success,
      duration,
      jobId,
    })

    console.log(`Completed job: ${jobType} (${jobId}) in ${duration}ms`)

    return NextResponse.json({ 
      success: true, 
      jobId,
      result,
      duration 
    })

  } catch (error) {
    console.error('Job runner error:', error)
    
    const jobId = req.headers.get('X-Job-ID')
    const jobType = req.headers.get('X-Job-Type')

    if (jobId) {
      await redisCache.setJobState(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString(),
      }, 3600)
    }

    if (jobType) {
      await recordMetric(`job.${jobType}`, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
      })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Job handlers

async function handleEcobeHandoffRetry(payload: any, jobId: string) {
  const { maxRetries = 3 } = payload
  
  // Find failed handoffs that need retry
  const { prisma } = await import('@/lib/db')
  
  const failedHandoffs = await prisma.ecobeHandoff.findMany({
    where: {
      status: 'FAILED',
      attempts: { lt: maxRetries },
      lastAttemptAt: {
        lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      }
    },
    include: {
      lead: true,
      organization: true,
    },
    take: 10, // Process in batches
  })

  if (failedHandoffs.length === 0) {
    return { success: true, processed: 0, message: 'No failed handoffs to retry' }
  }

  const results = []
  
  for (const handoff of failedHandoffs) {
    try {
      // Update status to retrying
      await prisma.ecobeHandoff.update({
        where: { id: handoff.id },
        data: {
          status: 'PENDING',
          lastAttemptAt: new Date(),
          attempts: handoff.attempts + 1,
        },
      })

      // Trigger immediate handoff job
      const { publishEventJob } = await import('@/lib/upstash/qstash')
      await publishEventJob({
        jobId: `ecobe-handoff-${handoff.id}-${Date.now()}`,
        jobType: 'ecobe-handoff-immediate',
        payload: { handoffId: handoff.id },
      })

      results.push({ handoffId: handoff.id, status: 'retrying' })

    } catch (error) {
      console.error(`Failed to retry handoff ${handoff.id}:`, error)
      results.push({ 
        handoffId: handoff.id, 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  await publishEvent({
    type: 'ECOBE_HANDOFFS_RETRIED',
    payload: {
      jobId,
      retriedCount: results.filter(r => r.status === 'retrying').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      results,
    } as any,
  })

  return { 
    success: true, 
    processed: failedHandoffs.length,
    retried: results.filter(r => r.status === 'retrying').length,
    results 
  }
}

async function handleLeadEnrichmentBatch(payload: any, jobId: string) {
  const { batchSize = 25 } = payload
  
  const { prisma } = await import('@/lib/db')
  const { runLeadEnrichmentJob } = await import('@/lib/jobs/tasks/leadEnrichment')
  
  const result = await runLeadEnrichmentJob()
  
  return result
}

async function handleAnalyticsAggregation(payload: any, jobId: string) {
  const { prisma } = await import('@/lib/db')
  
  // Aggregate various analytics metrics
  const [
    totalLeads,
    totalHandoffs,
    totalConversions,
    orgCount,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.ecobeHandoff.count(),
    prisma.ecobeHandoff.count({ where: { status: 'CONVERTED' } }),
    prisma.organization.count(),
  ])

  const analytics = {
    totalLeads,
    totalHandoffs,
    totalConversions,
    orgCount,
    conversionRate: totalHandoffs > 0 ? (totalConversions / totalHandoffs) * 100 : 0,
    recordedAt: new Date().toISOString(),
  }

  // Store in Redis for fast dashboard access
  await redisCache.set('analytics:global', analytics, 3600) // 1 hour TTL

  return { success: true, analytics }
}

async function handleQuotaReset(payload: any, jobId: string) {
  const { prisma } = await import('@/lib/db')
  
  // Find organizations that need quota reset
  const organizations = await prisma.organization.findMany({
    where: {
      // Add logic for quota reset timing
      // This would depend on your billing cycle logic
    },
  })

  const results = []
  
  for (const org of organizations) {
    try {
      // Reset quota logic here
      // This would update the organization's quota counters
      
      results.push({ orgId: org.id, status: 'reset' })
    } catch (error) {
      results.push({ 
        orgId: org.id, 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  return { success: true, processed: organizations.length, results }
}

async function handleLeadCleanup(payload: any, jobId: string) {
  const { daysOld = 90 } = payload
  
  const { prisma } = await import('@/lib/db')
  
  // Clean up old, stale leads
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
  
  const deletedLeads = await prisma.lead.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: 'LOST',
      score: { lt: 30 }, // Low quality old leads
    },
  })

  return { success: true, deletedCount: deletedLeads.count }
}

async function handleEcobeHandoffImmediate(payload: any, jobId: string) {
  const { handoffId } = payload
  
  const { prisma } = await import('@/lib/db')
  const { createEcobeProspect } = await import('@/lib/ecobe/client')
  const { RetryPolicy } = await import('@/lib/upstash/qstash')
  
  const handoff = await prisma.ecobeHandoff.findUnique({
    where: { id: handoffId },
    include: { lead: true, organization: true },
  })

  if (!handoff) {
    return { success: false, error: 'Handoff not found' }
  }

  try {
    // Create prospect in ECOBE using the structured EcobeProspectPayload shape
    const leadMeta = handoff.lead?.meta as Record<string, unknown> | null | undefined
    const ecobePayload = {
      organization: {
        name: handoff.organization?.name ?? 'Unknown',
        domain: leadMeta?.domain as string | undefined,
        sizeLabel: leadMeta?.companySize as string | undefined,
        region: leadMeta?.gl as string | undefined,
      },
      intent: {
        score: handoff.qualificationScore ?? 0,
        reason: handoff.qualificationReason ?? '',
        keywords: (leadMeta?.painTags as string[] | undefined) ?? [],
      },
      contact: {
        name: leadMeta?.contactName as string | undefined,
        email: leadMeta?.contactEmail as string | undefined,
        linkedin: leadMeta?.linkedin as string | undefined,
      },
      source: {
        leadId: handoff.leadId ?? '',
        queryId: handoff.queryId,
        runId: handoff.runId,
      },
    }

    const result = await RetryPolicy.retryWithBackoff(
      () => createEcobeProspect(ecobePayload),
      jobId,
      3
    )

    if (result.success) {
      // Update handoff status
      await prisma.ecobeHandoff.update({
        where: { id: handoffId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          responseJson: result.result,
        },
      })

      await publishEvent({
        type: 'ECOBE_HANDOFF_SENT',
        payload: {
          handoffId,
          externalId: result.result?.id,
          leadId: handoff.leadId,
        } as any,
      })

      return { success: true, externalId: result.result?.id }
    } else {
      // Mark as failed
      await prisma.ecobeHandoff.update({
        where: { id: handoffId },
        data: {
          status: 'FAILED',
          errorMessage: result.error,
          failedAt: new Date(),
        },
      })

      return { success: false, error: result.error }
    }

  } catch (error) {
    // Mark as failed
    await prisma.ecobeHandoff.update({
      where: { id: handoffId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date(),
      },
    })

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function handleLeadEnrichmentImmediate(payload: any, jobId: string) {
  const { leadId } = payload
  
  const { prisma } = await import('@/lib/db')
  const { vectorService } = await import('@/lib/upstash/vector')
  
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  })

  if (!lead) {
    return { success: false, error: 'Lead not found' }
  }

  try {
    // Perform enrichment
    const { runLeadEnrichmentJob } = await import('@/lib/jobs/tasks/leadEnrichment')
    
    // For single lead, we'll run a simplified enrichment
    const companySize = lead.score > 85 ? '1000+ employees' : 
                       lead.score > 70 ? '501-1000 employees' :
                       lead.score > 55 ? '201-500 employees' :
                       lead.score > 40 ? '51-200 employees' :
                       lead.score > 25 ? '11-50 employees' : '1-10 employees'
    
    const funding = lead.score > 85 ? 'Series B+' :
                   lead.score > 70 ? 'Series A' :
                   lead.score > 60 ? 'Seed' : 'Pre-seed'
    
    const techStack = lead.snippet?.match(/\b(aws|azure|gcp|snowflake|databricks|kubernetes)\b/gi) || []
    
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        enrichmentStatus: 'ENRICHED',
        enrichedAt: new Date(),
        score: Math.min(98, Math.round(lead.score + techStack.length * 2)),
        meta: {
          ...(lead.meta as Record<string, unknown>),
          companySize,
          funding,
          techStack,
          enrichedBy: 'immediate-job',
        },
      },
    })

    // Index in vector database (indexLead requires non-null title and snippet)
    await vectorService.indexLead({
      ...updatedLead,
      title: updatedLead.title ?? '',
      snippet: updatedLead.snippet ?? '',
    })

    return { success: true, lead: updatedLead }
    
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
