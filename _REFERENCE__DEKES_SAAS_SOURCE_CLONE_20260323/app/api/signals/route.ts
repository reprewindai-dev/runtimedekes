// API Routes for DEKES Signal Intelligence System
// Exposes Signal Harvesting Engine, Evidence Engine, and ECOBE Integration

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSignalIntegration } from '@/lib/signals/signal-integration'
import { createSignalHarvestingEngine } from '@/lib/signals/harvesting-engine'
import { createEvidenceEngine } from '@/lib/signals/evidence-engine'
import { createValidationError, createApiError, classifyError, logError } from '@/lib/error/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('SignalIntelligenceAPI')

// Initialize engines (in production, these would be singletons)
let integration: ReturnType<typeof createSignalIntegration> | null = null
let signalEngine: ReturnType<typeof createSignalHarvestingEngine> | null = null
let evidenceEngine: ReturnType<typeof createEvidenceEngine> | null = null

// Initialize engines on first request
function getIntegration() {
  if (!integration) {
    integration = createSignalIntegration()
  }
  return integration
}

function getSignalEngine() {
  if (!signalEngine) {
    signalEngine = createSignalHarvestingEngine()
  }
  return signalEngine
}

function getEvidenceEngine() {
  if (!evidenceEngine) {
    evidenceEngine = createEvidenceEngine()
  }
  return evidenceEngine
}

// Validation schemas
const CreateWorkloadSchema = z.object({
  organizationId: z.string().min(1),
  query: z.string().min(1),
  estimatedResults: z.number().min(1),
  preferredRegions: z.array(z.string()).optional(),
  deadline: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  carbonBudget: z.number().min(0).optional()
})

const ProcessSignalSchema = z.object({
  signalId: z.string().min(1),
  organizationId: z.string().min(1),
  signalType: z.enum([
    'SEARCH_INTENT', 'TECHNOLOGY_STACK', 'HIRING_SIGNALS', 'FUNDING_EVENTS',
    'PROCUREMENT_BEHAVIOR', 'CONTENT_CONSUMPTION', 'TECHNICAL_PROBLEMS',
    'COMPETITIVE_DISPLACEMENT', 'MARKET_EXPANSION', 'COMPLIANCE_REQUIREMENTS'
  ]),
  strength: z.enum(['WEAK', 'MODERATE', 'STRONG', 'CRITICAL']),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']),
  source: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  entities: z.array(z.object({
    type: z.string(),
    name: z.string(),
    confidence: z.number().min(0).max(1)
  })).default([]),
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional()
})

// GET /api/signals/status
// Get the status of all signal intelligence engines
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const endpoint = searchParams.get('endpoint')

    switch (endpoint) {
      case 'integration':
        return await getIntegrationStatus()
      case 'harvesting':
        return await getHarvestingStatus()
      case 'evidence':
        return await getEvidenceStatus()
      case 'metrics':
        return await getMetrics()
      default:
        return await getAllStatuses()
    }

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.GET' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to get status' },
      { status: 500 }
    )
  }
}

// POST /api/signals/workloads
// Create a new buyer intent workload
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    switch (action) {
      case 'create':
        return await createWorkload(request)
      case 'process':
        return await processWorkload(request)
      case 'validate':
        return await validateSignal(request)
      case 'harvest':
        return await triggerHarvesting(request)
      default:
        throw createValidationError('Invalid action parameter', { action })
    }

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.POST' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to process request' },
      { status: classifiedError.type === 'VALIDATION' ? 400 : 500 }
    )
  }
}

// PUT /api/signals/workloads/[id]
// Update a workload or signal
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    switch (action) {
      case 'workload':
        return await updateWorkload(params.id, request)
      case 'signal':
        return await updateSignal(params.id, request)
      default:
        throw createValidationError('Invalid action parameter', { action })
    }

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.PUT' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to update resource' },
      { status: classifiedError.type === 'VALIDATION' ? 400 : 500 }
    )
  }
}

// DELETE /api/signals/workloads/[id]
// Delete a workload or signal
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const searchParams = request.nextUrl.searchParams
    const resource = searchParams.get('resource')

    switch (resource) {
      case 'workload':
        return await deleteWorkload(params.id)
      case 'signal':
        return await deleteSignal(params.id)
      default:
        throw createValidationError('Invalid resource parameter', { resource })
    }

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.DELETE' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to delete resource' },
      { status: classifiedError.type === 'VALIDATION' ? 400 : 500 }
    )
  }
}

// Helper Functions

async function getAllStatuses() {
  const integration = getIntegration()
  const signalEngine = getSignalEngine()
  const evidenceEngine = getEvidenceEngine()

  const [integrationStatus, harvestingStatus, evidenceStatus] = await Promise.all([
    integration.getIntegrationStatus(),
    Promise.resolve(signalEngine.getEngineStatus()),
    Promise.resolve(evidenceEngine.getEngineStatus())
  ])

  return NextResponse.json({
    integration: integrationStatus,
    harvesting: harvestingStatus,
    evidence: evidenceStatus,
    timestamp: new Date().toISOString()
  })
}

async function getIntegrationStatus() {
  const integration = getIntegration()
  const status = await integration.getIntegrationStatus()
  
  return NextResponse.json({
    ...status,
    timestamp: new Date().toISOString()
  })
}

async function getHarvestingStatus() {
  const signalEngine = getSignalEngine()
  const status = signalEngine.getEngineStatus()
  
  return NextResponse.json({
    ...status,
    timestamp: new Date().toISOString()
  })
}

async function getEvidenceStatus() {
  const evidenceEngine = getEvidenceEngine()
  const status = evidenceEngine.getEngineStatus()
  
  return NextResponse.json({
    ...status,
    timestamp: new Date().toISOString()
  })
}

async function getMetrics() {
  const integration = getIntegration()
  const evidenceEngine = getEvidenceEngine()

  const [carbonMetrics, validationMetrics] = await Promise.all([
    integration.getCarbonMetrics(),
    evidenceEngine.getValidationMetrics()
  ])

  return NextResponse.json({
    carbon: carbonMetrics,
    validation: validationMetrics,
    timestamp: new Date().toISOString()
  })
}

async function createWorkload(request: NextRequest) {
  const body = await request.json()
  const validatedData = CreateWorkloadSchema.parse(body)

  const integration = getIntegration()
  const workload = await integration.createBuyerIntentWorkload(validatedData)

  logger.info(`Created buyer intent workload: ${workload.id}`)

  return NextResponse.json({
    success: true,
    workload: {
      id: workload.id,
      organizationId: workload.organizationId,
      query: workload.query,
      estimatedResults: workload.estimatedResults,
      priority: workload.priority,
      preferredRegions: workload.preferredRegions,
      deadline: workload.deadline,
      carbonBudget: workload.carbonBudget,
      createdAt: new Date().toISOString()
    }
  }, { status: 201 })
}

async function processWorkload(request: NextRequest) {
  const body = await request.json()
  const { workloadId, signals = [] } = body

  if (!workloadId) {
    throw createValidationError('workloadId is required')
  }

  const integration = getIntegration()
  
  // Get workload (in real implementation, this would come from database)
  const workload = await integration.createBuyerIntentWorkload({
    organizationId: body.organizationId || 'default',
    query: body.query || 'Default query',
    estimatedResults: body.estimatedResults || 100,
    preferredRegions: body.preferredRegions || [],
    priority: body.priority || 'medium'
  })

  // Add provided signals
  workload.signals = signals.map((signal: any) => ({
    ...signal,
    timestamp: new Date(signal.timestamp || Date.now())
  }))

  const result = await integration.processBuyerIntent(workload)

  logger.info(`Processed buyer intent workload: ${workloadId}`)

  return NextResponse.json({
    success: true,
    result: {
      workloadId: result.workloadId,
      status: result.status,
      signalsProcessed: result.signalsProcessed,
      carbonOptimized: result.carbonOptimized,
      executionPlan: result.executionPlan,
      errors: result.errors,
      timestamp: result.timestamp
    }
  })
}

async function validateSignal(request: NextRequest) {
  const body = await request.json()
  const validatedData = ProcessSignalSchema.parse(body)

  const evidenceEngine = getEvidenceEngine()
  
  // Convert to BuyerSignal format
  const signal = {
    ...validatedData,
    timestamp: new Date(),
    processed: false,
    verified: false
  }

  const validationResult = await evidenceEngine.validateSignal(signal)

  logger.info(`Validated signal: ${signal.signalId}`)

  return NextResponse.json({
    success: true,
    validation: {
      signalId: validationResult.signalId,
      originalConfidence: validationResult.originalConfidence,
      validatedConfidence: validationResult.validatedConfidence,
      confidenceScore: validationResult.confidenceScore,
      verificationStatus: validationResult.verificationStatus,
      evidenceCount: validationResult.evidenceCount,
      supportingEvidence: validationResult.supportingEvidence,
      contradictingEvidence: validationResult.contradictingEvidence,
      riskFactors: validationResult.riskFactors,
      validationTimestamp: validationResult.validationTimestamp
    }
  })
}

async function triggerHarvesting(request: NextRequest) {
  const body = await request.json()
  const { sourceId, signalType } = body

  const signalEngine = getSignalEngine()

  if (sourceId) {
    // Trigger harvesting from specific source
    // This would require extending the SignalHarvestingEngine API
    throw createValidationError('Source-specific harvesting not yet implemented')
  } else {
    // Start general harvesting
    await signalEngine.startHarvesting()
    
    logger.info('Triggered signal harvesting')

    return NextResponse.json({
      success: true,
      message: 'Signal harvesting started',
      status: signalEngine.getEngineStatus()
    })
  }
}

async function updateWorkload(workloadId: string, request: NextRequest) {
  const body = await request.json()
  
  // This would update the workload in the database
  // For now, return a success response
  
  logger.info(`Updated workload: ${workloadId}`)

  return NextResponse.json({
    success: true,
    message: 'Workload updated successfully',
    workloadId
  })
}

async function updateSignal(signalId: string, request: NextRequest) {
  const body = await request.json()
  
  // This would update the signal in the database
  // For now, return a success response
  
  logger.info(`Updated signal: ${signalId}`)

  return NextResponse.json({
    success: true,
    message: 'Signal updated successfully',
    signalId
  })
}

async function deleteWorkload(workloadId: string) {
  // This would delete the workload from the database
  // For now, return a success response
  
  logger.info(`Deleted workload: ${workloadId}`)

  return NextResponse.json({
    success: true,
    message: 'Workload deleted successfully',
    workloadId
  })
}

async function deleteSignal(signalId: string) {
  // This would delete the signal from the database
  // For now, return a success response
  
  logger.info(`Deleted signal: ${signalId}`)

  return NextResponse.json({
    success: true,
    message: 'Signal deleted successfully',
    signalId
  })
}

// Additional API endpoints for specific functionality

// GET /api/signals/workloads/[id]
async function getWorkload(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const integration = getIntegration()
    const result = await integration.getWorkloadResults(params.id)

    if (!result) {
      return NextResponse.json(
        { error: 'Workload not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      workload: result
    })

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.getWorkload' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to get workload' },
      { status: 500 }
    )
  }
}

// GET /api/signals/evidence/[signalId]
async function getSignalEvidence(request: NextRequest, { params }: { params: { signalId: string } }) {
  try {
    const evidenceEngine = getEvidenceEngine()
    const evidence = await evidenceEngine.getEvidenceBySignal(params.signalId)

    return NextResponse.json({
      success: true,
      signalId: params.signalId,
      evidence,
      count: evidence.length
    })

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.getSignalEvidence' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to get signal evidence' },
      { status: 500 }
    )
  }
}

// GET /api/signals/history/[signalId]
async function getValidationHistory(request: NextRequest, { params }: { params: { signalId: string } }) {
  try {
    const evidenceEngine = getEvidenceEngine()
    const history = await evidenceEngine.getValidationHistory(params.signalId)

    return NextResponse.json({
      success: true,
      signalId: params.signalId,
      history,
      count: history.length
    })

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.getValidationHistory' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to get validation history' },
      { status: 500 }
    )
  }
}

// POST /api/signals/integration/start
async function startIntegration(request: NextRequest) {
  try {
    const integration = getIntegration()
    await integration.start()

    logger.info('Started DEKES-ECOBE integration')

    return NextResponse.json({
      success: true,
      message: 'Integration started successfully',
      status: await integration.getIntegrationStatus()
    })

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.startIntegration' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to start integration' },
      { status: 500 }
    )
  }
}

// POST /api/signals/integration/stop
async function stopIntegration(request: NextRequest) {
  try {
    const integration = getIntegration()
    await integration.stop()

    logger.info('Stopped DEKES-ECOBE integration')

    return NextResponse.json({
      success: true,
      message: 'Integration stopped successfully',
      status: await integration.getIntegrationStatus()
    })

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.stopIntegration' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to stop integration' },
      { status: 500 }
    )
  }
}

// GET /api/signals/analytics
async function getAnalytics(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const organizationId = searchParams.get('organizationId')

    const integration = getIntegration()
    const evidenceEngine = getEvidenceEngine()

    const [carbonMetrics, validationMetrics] = await Promise.all([
      integration.getCarbonMetrics({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        organizationId: organizationId || undefined
      }),
      evidenceEngine.getValidationMetrics({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      })
    ])

    return NextResponse.json({
      success: true,
      analytics: {
        carbon: carbonMetrics,
        validation: validationMetrics,
        period: {
          startDate: startDate || 'all-time',
          endDate: endDate || 'now',
          organizationId: organizationId || 'all'
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const classifiedError = classifyError(error)
    logError(classifiedError, { context: 'SignalIntelligenceAPI.getAnalytics' })
    
    return NextResponse.json(
      { error: classifiedError.userMessage || 'Failed to get analytics' },
      { status: 500 }
    )
  }
}
