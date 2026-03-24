// DEKES-ECOBE Integration Layer
// Connects buyer-intent intelligence with carbon-aware decision infrastructure

import { z } from 'zod'
import { createHash } from 'crypto'
import { prisma } from '@/lib/db'
import { classifyError, logError } from '@/lib/error/error-handler'
import { Logger } from '@/lib/logger'
import { SignalHarvestingEngine, BuyerSignal, SignalType, SignalStrength } from './harvesting-engine'
import { EvidenceEngine, ValidationResult, VerificationStatus } from './evidence-engine'
import { optimizeWorkload, reportCarbonUsage, type EcobeOptimizeRequest, type EcobeOptimizeResponse } from '@/lib/ecobe/client'

const logger = new Logger('DekesEcobeIntegration')

// Integration Configuration
export interface IntegrationConfig {
  ecobe: {
    baseUrl: string
    apiKey: string
    timeout: number
    retryAttempts: number
  }
  signals: {
    harvestingEnabled: boolean
    evidenceValidation: boolean
    confidenceThreshold: number
    carbonOptimization: boolean
  }
  scheduling: {
    enabled: boolean
    windowSize: number // hours
    maxBatchSize: number
    optimizationInterval: number // minutes
  }
}

// Buyer Intent Workload
export interface BuyerIntentWorkload {
  id: string
  organizationId: string
  query: string
  estimatedResults: number
  signals: BuyerSignal[]
  validatedSignals: ValidationResult[]
  carbonBudget?: number
  preferredRegions: string[]
  deadline?: Date
  priority: 'low' | 'medium' | 'high' | 'urgent'
  metadata: Record<string, unknown>
}

// Carbon-Optimized Execution Plan
export interface ExecutionPlan {
  workloadId: string
  selectedRegion: string
  selectedTime: Date
  estimatedCarbon: number
  carbonSavings: number
  confidence: number
  reasoning: string[]
  alternatives: Array<{
    region: string
    time: Date
    carbon: number
    savings: number
  }>
  signals: {
    total: number
    validated: number
    highConfidence: number
  }
}

// Integration Results
export interface IntegrationResult {
  workloadId: string
  status: 'success' | 'failed' | 'partial'
  executionPlan?: ExecutionPlan
  signalsProcessed: number
  carbonOptimized: boolean
  errors: string[]
  timestamp: Date
  metadata: Record<string, unknown>
}

// DEKES-ECOBE Integration Engine
export class DekesEcobeIntegration {
  private config: IntegrationConfig
  private signalEngine: SignalHarvestingEngine
  private evidenceEngine: EvidenceEngine
  private isRunning = false
  private optimizationInterval?: NodeJS.Timeout

  constructor(config: IntegrationConfig) {
    this.config = config
    this.signalEngine = new SignalHarvestingEngine({
      sources: [],
      filters: [],
      enrichment: {
        entityExtraction: true,
        sentimentAnalysis: true,
        technographic: true,
        firmographic: true,
        intentClassification: true
      },
      thresholds: {
        minimum: config.signals.confidenceThreshold,
        strong: 70,
        critical: 85
      }
    })
    
    this.evidenceEngine = new EvidenceEngine({
      sources: [],
      validators: [],
      thresholds: {
        minimumEvidence: 2,
        highConfidenceThreshold: 70,
        veryHighConfidenceThreshold: 85,
        rejectionThreshold: 30,
        riskThreshold: 50
      },
      riskAssessment: {
        factors: [],
        weights: {},
        thresholds: {
          low: 25,
          medium: 50,
          high: 75,
          critical: 90
        }
      }
    })
  }

  // Core Integration Methods
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('DEKES-ECOBE integration already running')
      return
    }

    this.isRunning = true
    logger.info('Starting DEKES-ECOBE integration')

    try {
      // Start signal harvesting if enabled
      if (this.config.signals.harvestingEnabled) {
        await this.signalEngine.startHarvesting()
      }

      // Start optimization scheduling if enabled
      if (this.config.scheduling.enabled) {
        this.startOptimizationScheduling()
      }

      logger.info('DEKES-ECOBE integration started successfully')
    } catch (error) {
      const classifiedError = classifyError(error)
      logError(classifiedError, { context: 'DekesEcobeIntegration.start' })
      throw classifiedError
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    logger.info('Stopping DEKES-ECOBE integration')

    try {
      // Stop signal harvesting
      await this.signalEngine.stopHarvesting()

      // Stop optimization scheduling
      if (this.optimizationInterval) {
        clearInterval(this.optimizationInterval)
        this.optimizationInterval = undefined
      }

      logger.info('DEKES-ECOBE integration stopped')
    } catch (error) {
      const classifiedError = classifyError(error)
      logError(classifiedError, { context: 'DekesEcobeIntegration.stop' })
    }
  }

  // Buyer Intent Processing
  async processBuyerIntent(workload: BuyerIntentWorkload): Promise<IntegrationResult> {
    logger.info(`Processing buyer intent workload: ${workload.id}`)

    const result: IntegrationResult = {
      workloadId: workload.id,
      status: 'success',
      signalsProcessed: 0,
      carbonOptimized: false,
      errors: [],
      timestamp: new Date(),
      metadata: {}
    }

    try {
      // Step 1: Process and validate signals
      const validatedSignals = await this.processSignals(workload.signals)
      result.signalsProcessed = validatedSignals.length

      // Step 2: Filter high-confidence signals
      const highConfidenceSignals = validatedSignals.filter(s => 
        s.verificationStatus === VerificationStatus.VERIFIED &&
        s.validatedConfidence === 'HIGH' || s.validatedConfidence === 'VERY_HIGH'
      )

      // Step 3: Generate carbon-optimized execution plan
      if (this.config.signals.carbonOptimization && highConfidenceSignals.length > 0) {
        const executionPlan = await this.generateExecutionPlan(workload, highConfidenceSignals)
        result.executionPlan = executionPlan
        result.carbonOptimized = true

        // Step 4: Execute the plan
        await this.executePlan(executionPlan)
      }

      logger.info(`Buyer intent processing completed: ${workload.id}`)
      return result

    } catch (error) {
      const classifiedError = classifyError(error)
      logError(classifiedError, { 
        context: 'DekesEcobeIntegration.processBuyerIntent',
        workloadId: workload.id 
      })

      result.status = 'failed'
      result.errors.push(classifiedError.message)
      return result
    }
  }

  private async processSignals(signals: BuyerSignal[]): Promise<ValidationResult[]> {
    if (!this.config.signals.evidenceValidation) {
      // Return mock validation results if evidence validation is disabled
      return signals.map(signal => ({
        signalId: signal.id,
        originalConfidence: signal.confidence,
        validatedConfidence: signal.confidence,
        confidenceScore: 75,
        verificationStatus: VerificationStatus.VERIFIED,
        evidenceCount: 1,
        supportingEvidence: 1,
        contradictingEvidence: 0,
        riskFactors: [],
        validationTimestamp: new Date(),
        validationMethod: 'BYPASSED',
        metadata: {}
      }))
    }

    // Validate signals using evidence engine
    return await this.evidenceEngine.validateSignalsBatch(signals)
  }

  private async generateExecutionPlan(
    workload: BuyerIntentWorkload,
    validatedSignals: ValidationResult[]
  ): Promise<ExecutionPlan> {
    logger.info(`Generating execution plan for workload: ${workload.id}`)

    // Prepare ECOBE optimization request
    const carbonBudget = this.calculateCarbonBudget(workload, validatedSignals)
    
    const ecobeRequest: EcobeOptimizeRequest = {
      query: {
        id: workload.id,
        query: workload.query,
        estimatedResults: workload.estimatedResults
      },
      carbonBudget,
      regions: workload.preferredRegions.length > 0 ? workload.preferredRegions : [
        'us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1'
      ]
    }

    // Call ECOBE for optimization
    const ecobeResponse = await this.callEcobeOptimization(ecobeRequest)

    // Generate execution plan
    const plan: ExecutionPlan = {
      workloadId: workload.id,
      selectedRegion: ecobeResponse.selectedRegion,
      selectedTime: ecobeResponse.scheduledTime ? new Date(ecobeResponse.scheduledTime) : new Date(),
      estimatedCarbon: ecobeResponse.estimatedCO2 || 0,
      carbonSavings: this.calculateCarbonSavings(ecobeRequest, ecobeResponse),
      confidence: this.calculatePlanConfidence(validatedSignals, ecobeResponse),
      reasoning: this.generatePlanReasoning(validatedSignals, ecobeResponse),
      alternatives: this.generateAlternatives(ecobeRequest, ecobeResponse),
      signals: {
        total: workload.signals.length,
        validated: validatedSignals.length,
        highConfidence: validatedSignals.filter(s => 
          s.validatedConfidence === 'HIGH' || s.validatedConfidence === 'VERY_HIGH'
        ).length
      }
    }

    logger.info(`Execution plan generated: ${workload.id} -> ${plan.selectedRegion}`)
    return plan
  }

  private calculateCarbonBudget(workload: BuyerIntentWorkload, validatedSignals: ValidationResult[]): number {
    // Base carbon budget based on workload size
    let baseBudget = workload.estimatedResults * 0.1 // gCO2 per result

    // Adjust based on signal confidence
    const avgConfidence = validatedSignals.reduce((sum, s) => sum + s.confidenceScore, 0) / validatedSignals.length
    const confidenceMultiplier = avgConfidence / 100

    // Adjust based on priority
    const priorityMultipliers = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      urgent: 2.0
    }

    const finalBudget = baseBudget * confidenceMultiplier * priorityMultipliers[workload.priority]

    // Apply minimum and maximum limits
    return Math.max(10, Math.min(10000, finalBudget))
  }

  private async callEcobeOptimization(request: EcobeOptimizeRequest): Promise<EcobeOptimizeResponse> {
    const url = `${this.config.ecobe.baseUrl}/api/v1/route/optimize`
    
    for (let attempt = 1; attempt <= this.config.ecobe.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.ecobe.apiKey}`
          },
          body: JSON.stringify(request),
          timeout: this.config.ecobe.timeout
        })

        if (!response.ok) {
          throw new Error(`ECOBE optimization failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        return data

      } catch (error) {
        logger.warn(`ECOBE optimization attempt ${attempt} failed: ${error}`)
        
        if (attempt === this.config.ecobe.retryAttempts) {
          throw error
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw new Error('ECOBE optimization failed after all retry attempts')
  }

  private calculateCarbonSavings(request: EcobeOptimizeRequest, response: EcobeOptimizeResponse): number {
    // Estimate what the carbon would have been without optimization
    const baselineCarbon = request.estimatedResults * 0.5 // Higher baseline
    const optimizedCarbon = response.estimatedCO2 || 0
    
    return Math.max(0, baselineCarbon - optimizedCarbon)
  }

  private calculatePlanConfidence(validatedSignals: ValidationResult[], ecobeResponse: EcobeOptimizeResponse): number {
    // Signal confidence component (70% weight)
    const avgSignalConfidence = validatedSignals.reduce((sum, s) => sum + s.confidenceScore, 0) / validatedSignals.length
    const signalComponent = avgSignalConfidence * 0.7

    // ECOBE response confidence component (30% weight)
    // This would come from ECOBE's response in a real implementation
    const ecobeComponent = 80 * 0.3 // Assume 80% confidence from ECOBE

    return Math.min(100, signalComponent + ecobeComponent)
  }

  private generatePlanReasoning(validatedSignals: ValidationResult[], ecobeResponse: EcobeOptimizeResponse): string[] {
    const reasoning: string[] = []

    // Signal-based reasoning
    reasoning.push(`Based on ${validatedSignals.length} validated buyer signals`)
    
    const highConfidenceSignals = validatedSignals.filter(s => 
      s.validatedConfidence === 'HIGH' || s.validatedConfidence === 'VERY_HIGH'
    )
    reasoning.push(`${highConfidenceSignals.length} high-confidence signals detected`)

    // Carbon optimization reasoning
    if (ecobeResponse.estimatedCO2) {
      reasoning.push(`Estimated carbon usage: ${ecobeResponse.estimatedCO2.toFixed(2)} gCO2`)
    }

    if (ecobeResponse.scheduledTime) {
      reasoning.push(`Optimized execution time for minimal carbon impact`)
    }

    // Regional reasoning
    reasoning.push(`Selected region ${ecobeResponse.selectedRegion} for optimal carbon efficiency`)

    return reasoning
  }

  private generateAlternatives(request: EcobeOptimizeRequest, response: EcobeOptimizeResponse): Array<{
    region: string
    time: Date
    carbon: number
    savings: number
  }> {
    // Generate alternative execution options
    const alternatives = []
    
    // Alternative regions
    const alternativeRegions = request.regions.filter(r => r !== response.selectedRegion).slice(0, 2)
    
    for (const region of alternativeRegions) {
      alternatives.push({
        region,
        time: new Date(),
        carbon: (response.estimatedCO2 || 0) * 1.2, // 20% higher carbon
        savings: 0
      })
    }

    // Alternative time (if scheduled)
    if (response.scheduledTime) {
      const scheduledTime = new Date(response.scheduledTime)
      const immediateTime = new Date()
      
      alternatives.push({
        region: response.selectedRegion,
        time: immediateTime,
        carbon: (response.estimatedCO2 || 0) * 1.1, // 10% higher for immediate execution
        savings: 0
      })
    }

    return alternatives
  }

  private async executePlan(plan: ExecutionPlan): Promise<void> {
    logger.info(`Executing plan: ${plan.workloadId} in ${plan.selectedRegion}`)

    try {
      // In a real implementation, this would trigger the actual workload execution
      // For now, we'll just log the execution and report carbon usage to ECOBE

      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Report actual carbon usage back to ECOBE
      if (plan.estimatedCarbon > 0) {
        await this.reportCarbonUsage(plan.workloadId, plan.estimatedCarbon)
      }

      logger.info(`Plan execution completed: ${plan.workloadId}`)

    } catch (error) {
      const classifiedError = classifyError(error)
      logError(classifiedError, { 
        context: 'DekesEcobeIntegration.executePlan',
        workloadId: plan.workloadId 
      })
      throw classifiedError
    }
  }

  private async reportCarbonUsage(workloadId: string, actualCarbon: number): Promise<void> {
    try {
      await reportCarbonUsage({
        queryId: workloadId,
        actualCO2: actualCarbon
      })
      
      logger.debug(`Carbon usage reported: ${workloadId} - ${actualCarbon} gCO2`)
    } catch (error) {
      // Don't fail the execution if carbon reporting fails
      logger.warn(`Failed to report carbon usage: ${error}`)
    }
  }

  // Scheduling and Automation
  private startOptimizationScheduling(): void {
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.processScheduledOptimizations()
      } catch (error) {
        const classifiedError = classifyError(error)
        logError(classifiedError, { context: 'DekesEcobeIntegration.processScheduledOptimizations' })
      }
    }, this.config.scheduling.optimizationInterval * 60 * 1000)

    logger.info(`Started optimization scheduling (${this.config.scheduling.optimizationInterval}min interval)`)
  }

  private async processScheduledOptimizations(): Promise<void> {
    // Get pending workloads that need optimization
    const pendingWorkloads = await this.getPendingWorkloads()

    if (pendingWorkloads.length === 0) {
      return
    }

    logger.info(`Processing ${pendingWorkloads.length} scheduled optimizations`)

    // Process workloads in batches
    const batchSize = Math.min(pendingWorkloads.length, this.config.scheduling.maxBatchSize)
    const batch = pendingWorkloads.slice(0, batchSize)

    for (const workload of batch) {
      try {
        await this.processBuyerIntent(workload)
      } catch (error) {
        logger.error(`Failed to process scheduled workload ${workload.id}: ${error}`)
      }
    }
  }

  private async getPendingWorkloads(): Promise<BuyerIntentWorkload[]> {
    // Retrieve pending workloads from database
    // This would query for workloads that are ready for optimization
    
    // Placeholder implementation
    return []
  }

  // Public API Methods
  async getIntegrationStatus(): Promise<{
    isRunning: boolean
    signalEngineStatus: any
    evidenceEngineStatus: any
    schedulingActive: boolean
    processedWorkloads: number
    carbonSavings: number
  }> {
    return {
      isRunning: this.isRunning,
      signalEngineStatus: this.signalEngine.getEngineStatus(),
      evidenceEngineStatus: this.evidenceEngine.getEngineStatus(),
      schedulingActive: !!this.optimizationInterval,
      processedWorkloads: 0, // Would come from database
      carbonSavings: 0 // Would come from database
    }
  }

  async getWorkloadResults(workloadId: string): Promise<IntegrationResult | null> {
    // Retrieve integration result for a specific workload
    // This would query the database
    
    // Placeholder implementation
    return null
  }

  async getCarbonMetrics(filters?: {
    startDate?: Date
    endDate?: Date
    organizationId?: string
  }): Promise<{
    totalWorkloads: number
    totalCarbonSaved: number
    averageCarbonPerWorkload: number
    optimizationRate: number
    regionalBreakdown: Record<string, number>
  }> {
    // Get carbon optimization metrics
    // This would query the database and calculate metrics
    
    // Placeholder implementation
    return {
      totalWorkloads: 0,
      totalCarbonSaved: 0,
      averageCarbonPerWorkload: 0,
      optimizationRate: 0,
      regionalBreakdown: {}
    }
  }

  async createBuyerIntentWorkload(data: {
    organizationId: string
    query: string
    estimatedResults: number
    preferredRegions?: string[]
    deadline?: Date
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    carbonBudget?: number
  }): Promise<BuyerIntentWorkload> {
    const workload: BuyerIntentWorkload = {
      id: this.generateWorkloadId(),
      organizationId: data.organizationId,
      query: data.query,
      estimatedResults: data.estimatedResults,
      signals: [],
      validatedSignals: [],
      carbonBudget: data.carbonBudget,
      preferredRegions: data.preferredRegions || [],
      deadline: data.deadline,
      priority: data.priority || 'medium',
      metadata: {}
    }

    // Store workload in database
    // await prisma.buyerIntentWorkload.create({ data: workload })

    return workload
  }

  private generateWorkloadId(): string {
    return `workload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Factory function for creating configured integration
export function createDekesEcobeIntegration(config?: Partial<IntegrationConfig>): DekesEcobeIntegration {
  const defaultConfig: IntegrationConfig = {
    ecobe: {
      baseUrl: process.env.ECOBE_BASE_URL || 'http://localhost:3000',
      apiKey: process.env.ECOBE_API_KEY || '',
      timeout: 30000,
      retryAttempts: 3
    },
    signals: {
      harvestingEnabled: true,
      evidenceValidation: true,
      confidenceThreshold: 50,
      carbonOptimization: true
    },
    scheduling: {
      enabled: true,
      windowSize: 24,
      maxBatchSize: 10,
      optimizationInterval: 15
    }
  }

  const finalConfig = { ...defaultConfig, ...config }
  return new DekesEcobeIntegration(finalConfig)
}

// Export default configuration
export const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  ecobe: {
    baseUrl: process.env.ECOBE_BASE_URL || 'http://localhost:3000',
    apiKey: process.env.ECOBE_API_KEY || '',
    timeout: 30000,
    retryAttempts: 3
  },
  signals: {
    harvestingEnabled: true,
    evidenceValidation: true,
    confidenceThreshold: 50,
    carbonOptimization: true
  },
  scheduling: {
    enabled: true,
    windowSize: 24,
    maxBatchSize: 10,
    optimizationInterval: 15
  }
}
