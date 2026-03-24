// Signal Integration - Orchestrates Harvesting and Evidence Engines
// Coordinates the complete buyer-intent intelligence pipeline

import { createSignalHarvestingEngine, DEFAULT_HARVESTING_CONFIG, BuyerSignal } from './harvesting-engine'
import { createEvidenceEngine, DEFAULT_EVIDENCE_CONFIG, ValidationResult } from './evidence-engine'
import { classifyError, logError } from '../error/error-handler'
import { createLogger } from '../logger'

const logger = createLogger('SignalIntegration')

export interface SignalProcessingResult {
  signal: BuyerSignal
  validation: ValidationResult
  processingTime: number
  success: boolean
  error?: string
}

export interface IntegrationMetrics {
  totalProcessed: number
  successfulValidations: number
  rejectedSignals: number
  averageProcessingTime: number
  signalTypeBreakdown: Record<string, number>
  confidenceDistribution: Record<string, number>
}

export class SignalIntegrationOrchestrator {
  private harvestingEngine: ReturnType<typeof createSignalHarvestingEngine>
  private evidenceEngine: ReturnType<typeof createEvidenceEngine>

  constructor() {
    this.harvestingEngine = createSignalHarvestingEngine(DEFAULT_HARVESTING_CONFIG)
    this.evidenceEngine = createEvidenceEngine(DEFAULT_EVIDENCE_CONFIG)
  }

  // Start the complete signal processing pipeline
  async startProcessing(): Promise<void> {
    logger.info('Starting signal processing pipeline')
    
    try {
      // Start harvesting engine
      await this.harvestingEngine.startHarvesting()
      logger.info('Signal harvesting engine started')
      
      // Evidence engine doesn't need to be started - it's event-driven
      logger.info('Signal processing pipeline started successfully')
      
    } catch (error) {
      const classifiedError = classifyError(error)
      logError(classifiedError, { context: 'SignalIntegrationOrchestrator.startProcessing' })
      throw classifiedError
    }
  }

  // Stop the processing pipeline
  async stopProcessing(): Promise<void> {
    logger.info('Stopping signal processing pipeline')
    
    try {
      await this.harvestingEngine.stopHarvesting()
      logger.info('Signal processing pipeline stopped')
      
    } catch (error) {
      const classifiedError = classifyError(error)
      logError(classifiedError, { context: 'SignalIntegrationOrchestrator.stopProcessing' })
      throw classifiedError
    }
  }

  // Process a single signal through the complete pipeline
  async processSignal(signal: BuyerSignal): Promise<SignalProcessingResult> {
    const startTime = Date.now()
    
    try {
      logger.debug(`Processing signal: ${signal.id}`)
      
      // Validate signal with evidence engine
      const validation = await this.evidenceEngine.validateSignal(signal)
      
      const processingTime = Date.now() - startTime
      
      logger.info(`Signal processed: ${signal.id} - Status: ${validation.verificationStatus}`)
      
      return {
        signal,
        validation,
        processingTime,
        success: true
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      const classifiedError = classifyError(error)
      logError(classifiedError, { 
        context: 'SignalIntegrationOrchestrator.processSignal',
        signalId: signal.id 
      })
      
      return {
        signal,
        validation: {
          signalId: signal.id,
          originalConfidence: signal.confidence,
          validatedConfidence: signal.confidence,
          confidenceScore: 0,
          verificationStatus: 'REJECTED' as any,
          evidenceCount: 0,
          supportingEvidence: 0,
          contradictingEvidence: 0,
          riskFactors: ['PROCESSING_ERROR'],
          validationTimestamp: new Date(),
          validationMethod: 'INTEGRATION_ORCHESTRATOR',
          metadata: { error: classifiedError.message }
        },
        processingTime,
        success: false,
        error: classifiedError.message
      }
    }
  }

  // Process multiple signals in batch
  async processSignalsBatch(signals: BuyerSignal[]): Promise<SignalProcessingResult[]> {
    logger.info(`Processing batch of ${signals.length} signals`)
    
    const results: SignalProcessingResult[] = []
    
    // Process signals in parallel with rate limiting
    const batchSize = 5 // Process 5 signals at a time
    for (let i = 0; i < signals.length; i += batchSize) {
      const batch = signals.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(signal => this.processSignal(signal))
      )
      results.push(...batchResults)
      
      // Small delay between batches
      if (i + batchSize < signals.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    const successCount = results.filter(r => r.success).length
    logger.info(`Batch processing completed: ${successCount}/${signals.length} successful`)
    
    return results
  }

  // Get comprehensive metrics
  async getIntegrationMetrics(): Promise<IntegrationMetrics> {
    // Get harvesting engine status
    const harvestingStatus = this.harvestingEngine.getEngineStatus()
    
    // Get evidence engine metrics
    const evidenceMetrics = await this.evidenceEngine.getValidationMetrics()
    
    // Calculate integration-specific metrics
    const metrics: IntegrationMetrics = {
      totalProcessed: evidenceMetrics.totalValidations,
      successfulValidations: evidenceMetrics.totalValidations - evidenceMetrics.rejectionRate,
      rejectedSignals: evidenceMetrics.rejectionRate,
      averageProcessingTime: 0, // Would need to track this in production
      signalTypeBreakdown: {}, // Would need to query database for this
      confidenceDistribution: {} // Would need to query database for this
    }
    
    return metrics
  }

  // Get pipeline health status
  getPipelineHealth(): {
    harvesting: {
      isRunning: boolean
      activeSources: number
      totalSources: number
    }
    evidence: {
      activeSources: number
      totalSources: number
      rateLimitersActive: number
    }
    overall: 'healthy' | 'degraded' | 'unhealthy'
  } {
    const harvestingStatus = this.harvestingEngine.getEngineStatus()
    const evidenceStatus = this.evidenceEngine.getEngineStatus()
    
    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (!harvestingStatus.isRunning) {
      overall = 'unhealthy'
    } else if (harvestingStatus.activeSources < harvestingStatus.totalSources) {
      overall = 'degraded'
    }
    
    return {
      harvesting: {
        isRunning: harvestingStatus.isRunning,
        activeSources: harvestingStatus.activeSources,
        totalSources: harvestingStatus.totalSources
      },
      evidence: {
        activeSources: evidenceStatus.activeSources,
        totalSources: evidenceStatus.totalSources,
        rateLimitersActive: evidenceStatus.rateLimitersActive
      },
      overall
    }
  }

  // Manual signal validation (for testing or manual processing)
  async validateSignalManually(signalData: Partial<BuyerSignal>): Promise<SignalProcessingResult> {
    // Create a complete signal object from partial data
    const signal: BuyerSignal = {
      id: signalData.id || `manual-${Date.now()}`,
      organizationId: signalData.organizationId || 'manual-org',
      signalType: signalData.signalType || 'SEARCH_INTENT' as any,
      strength: signalData.strength || 'MODERATE' as any,
      confidence: signalData.confidence || 'MEDIUM' as any,
      source: signalData.source || 'MANUAL_INPUT',
      sourceUrl: signalData.sourceUrl,
      title: signalData.title || 'Manual Signal',
      description: signalData.description || 'Manually created signal',
      keywords: signalData.keywords || [],
      entities: signalData.entities || [],
      timestamp: signalData.timestamp || new Date(),
      metadata: signalData.metadata,
      processed: false,
      verified: false
    }
    
    return await this.processSignal(signal)
  }
}

// Factory function
export function createSignalIntegration(): SignalIntegrationOrchestrator {
  return new SignalIntegrationOrchestrator()
}

// Export singleton instance
export const signalIntegration = createSignalIntegration()
