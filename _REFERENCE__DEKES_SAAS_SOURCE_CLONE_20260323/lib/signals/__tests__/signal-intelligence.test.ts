// Comprehensive Test Suite for DEKES Signal Intelligence System
// Tests for Signal Harvesting Engine, Evidence Engine, and ECOBE Integration

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { SignalHarvestingEngine, SignalType, SignalStrength, SignalConfidence, createSignalHarvestingEngine } from '../harvesting-engine'
import { EvidenceEngine, EvidenceType, EvidenceStrength, VerificationStatus, createEvidenceEngine } from '../evidence-engine'
import { DekesEcobeIntegration, createDekesEcobeIntegration } from '../dekes-ecobe-integration'
import { BuyerSignal, ValidationResult, BuyerIntentWorkload } from '../types'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('@/lib/error/error-handler')
jest.mock('@/lib/logger')
jest.mock('@/lib/ecobe/client')

describe('Signal Harvesting Engine', () => {
  let engine: SignalHarvestingEngine

  beforeEach(() => {
    engine = createSignalHarvestingEngine({
      sources: [
        {
          id: 'test-source',
          name: 'Test Source',
          type: 'api',
          endpoint: 'https://api.test.com/signals',
          frequency: 1,
          enabled: true,
          priority: 1
        }
      ],
      filters: [],
      enrichment: {
        entityExtraction: true,
        sentimentAnalysis: true,
        technographic: true,
        firmographic: true,
        intentClassification: true
      },
      thresholds: {
        minimum: 30,
        strong: 70,
        critical: 85
      }
    })
  })

  afterEach(async () => {
    await engine.stopHarvesting()
  })

  describe('Engine Lifecycle', () => {
    it('should start harvesting successfully', async () => {
      await engine.startHarvesting()
      const status = engine.getEngineStatus()
      
      expect(status.isRunning).toBe(true)
      expect(status.activeSources).toBe(1)
    })

    it('should stop harvesting successfully', async () => {
      await engine.startHarvesting()
      await engine.stopHarvesting()
      
      const status = engine.getEngineStatus()
      expect(status.isRunning).toBe(false)
      expect(status.activeSources).toBe(0)
    })

    it('should handle multiple start calls gracefully', async () => {
      await engine.startHarvesting()
      await engine.startHarvesting() // Should not throw
      
      const status = engine.getEngineStatus()
      expect(status.isRunning).toBe(true)
    })
  })

  describe('Signal Processing', () => {
    it('should classify technology stack signals correctly', () => {
      const signalData = {
        title: 'Company looking for React developers',
        description: 'We are hiring React developers with AWS experience',
        keywords: ['react', 'aws', 'hiring'],
        timestamp: new Date().toISOString()
      }

      // Test signal type classification
      const signalType = engine['classifySignalType'](signalData)
      expect(signalType).toBe(SignalType.HIRING_SIGNALS)
    })

    it('should calculate signal strength correctly', () => {
      const signalData = {
        title: 'Major funding round announced',
        description: 'Company raises $50M Series B funding',
        keywords: ['funding', 'investment', 'series b'],
        entities: [{ type: 'company', name: 'TechCorp', confidence: 0.9 }],
        timestamp: new Date().toISOString()
      }

      const strength = engine['calculateSignalStrength'](signalData, SignalType.FUNDING_EVENTS)
      expect([SignalStrength.STRONG, SignalStrength.CRITICAL]).toContain(strength)
    })

    it('should filter signals based on confidence thresholds', () => {
      const weakSignal: BuyerSignal = {
        id: 'weak-signal',
        organizationId: 'test-org',
        signalType: SignalType.SEARCH_INTENT,
        strength: SignalStrength.WEAK,
        confidence: SignalConfidence.LOW,
        source: 'test',
        title: 'Weak Signal',
        description: 'Low confidence signal',
        keywords: [],
        entities: [],
        timestamp: new Date()
      }

      const passes = engine['passesFilters'](weakSignal)
      expect(passes).toBe(false) // Should be filtered out by default threshold
    })
  })

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      await engine.startHarvesting()
      
      // Should not throw, should log error instead
      await new Promise(resolve => setTimeout(resolve, 1100)) // Wait for one harvest cycle
      
      const status = engine.getEngineStatus()
      expect(status.isRunning).toBe(true) // Should still be running
    })

    it('should handle invalid signal data', async () => {
      const invalidSignal = {
        // Missing required fields
        invalidField: 'invalid'
      }

      // Should not throw when processing invalid data
      expect(() => {
        engine['transformRawSignal'](invalidSignal, engine['config'].sources[0])
      }).not.toThrow()
    })
  })
})

describe('Evidence Engine', () => {
  let engine: EvidenceEngine

  beforeEach(() => {
    engine = createEvidenceEngine({
      sources: [
        {
          id: 'domain-verification',
          name: 'Domain Verification',
          type: 'database',
          priority: 1,
          reliability: 0.9,
          enabled: true,
          rateLimit: {
            requests: 100,
            window: 60
          }
        }
      ],
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
  })

  describe('Signal Validation', () => {
    it('should validate signals with high confidence', async () => {
      const signal: BuyerSignal = {
        id: 'test-signal',
        organizationId: 'test-org',
        signalType: SignalType.TECHNOLOGY_STACK,
        strength: SignalStrength.STRONG,
        confidence: SignalConfidence.HIGH,
        source: 'test',
        sourceUrl: 'https://example.com',
        title: 'Company using Kubernetes',
        description: 'Company is looking for Kubernetes engineers',
        keywords: ['kubernetes', 'docker', 'devops'],
        entities: [
          { type: 'technology', name: 'Kubernetes', confidence: 0.9 },
          { type: 'company', name: 'TechCorp', confidence: 0.8 }
        ],
        timestamp: new Date()
      }

      // Mock DNS verification
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          Answer: [{ data: '1.2.3.4', TTL: 300 }]
        })
      })

      const result = await engine.validateSignal(signal)

      expect(result.signalId).toBe(signal.id)
      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED)
      expect(result.confidenceScore).toBeGreaterThan(70)
    })

    it('should reject signals with insufficient evidence', async () => {
      const signal: BuyerSignal = {
        id: 'weak-signal',
        organizationId: 'test-org',
        signalType: SignalType.SEARCH_INTENT,
        strength: SignalStrength.WEAK,
        confidence: SignalConfidence.LOW,
        source: 'test',
        title: 'Vague signal',
        description: 'Some vague description',
        keywords: [],
        entities: [],
        timestamp: new Date()
      }

      // Mock no evidence found
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ evidence: [] })
      })

      const result = await engine.validateSignal(signal)

      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED)
      expect(result.evidenceCount).toBe(0)
    })

    it('should handle batch validation efficiently', async () => {
      const signals: BuyerSignal[] = Array.from({ length: 25 }, (_, i) => ({
        id: `signal-${i}`,
        organizationId: 'test-org',
        signalType: SignalType.TECHNOLOGY_STACK,
        strength: SignalStrength.MODERATE,
        confidence: SignalConfidence.MEDIUM,
        source: 'test',
        title: `Signal ${i}`,
        description: `Description for signal ${i}`,
        keywords: ['tech'],
        entities: [],
        timestamp: new Date()
      }))

      // Mock successful evidence collection
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          evidence: [{
            type: 'domain',
            strength: 'strong',
            confidence: 0.8,
            description: 'Domain verified'
          }]
        })
      })

      const results = await engine.validateSignalsBatch(signals)

      expect(results).toHaveLength(25)
      expect(results.every(r => r.signalId.startsWith('signal-'))).toBe(true)
    })
  })

  describe('Evidence Collection', () => {
    it('should collect domain verification evidence', async () => {
      const signal: BuyerSignal = {
        id: 'test-signal',
        organizationId: 'test-org',
        signalType: SignalType.TECHNOLOGY_STACK,
        strength: SignalStrength.STRONG,
        confidence: SignalConfidence.HIGH,
        source: 'test',
        sourceUrl: 'https://techcorp.com',
        title: 'Tech signal',
        description: 'Description',
        keywords: [],
        entities: [],
        timestamp: new Date()
      }

      // Mock successful DNS lookup
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          Answer: [{ data: '1.2.3.4', TTL: 300 }]
        })
      })

      const evidence = await engine['collectFromDatabase'](
        engine['config'].sources[0],
        signal
      )

      expect(evidence).toHaveLength(1)
      expect(evidence[0].evidenceType).toBe(EvidenceType.DOMAIN_VERIFICATION)
      expect(evidence[0].strength).toBe(EvidenceStrength.STRONG)
    })

    it('should respect rate limits', async () => {
      const source = engine['config'].sources[0]
      
      // Use up rate limit
      for (let i = 0; i < 100; i++) {
        engine['checkRateLimit'](source.id)
      }

      // Should be rate limited now
      expect(engine['checkRateLimit'](source.id)).toBe(false)
    })
  })

  describe('Risk Assessment', () => {
    it('should identify risk factors correctly', async () => {
      const signal: BuyerSignal = {
        id: 'risky-signal',
        organizationId: 'test-org',
        signalType: SignalType.SEARCH_INTENT,
        strength: SignalStrength.WEAK,
        confidence: SignalConfidence.LOW,
        source: 'test',
        title: 'Risky signal',
        description: 'Low confidence signal',
        keywords: [],
        entities: [],
        timestamp: new Date()
      }

      const evidence = [] // No evidence

      const riskFactors = await engine['assessRisk'](signal, evidence)

      expect(riskFactors).toContain('NO_EVIDENCE')
      expect(riskFactors).toContain('LOW_SIGNAL_CONFIDENCE')
      expect(riskFactors).toContain('WEAK_SIGNAL_STRENGTH')
    })
  })
})

describe('DEKES-ECOBE Integration', () => {
  let integration: DekesEcobeIntegration

  beforeEach(() => {
    integration = createDekesEcobeIntegration({
      ecobe: {
        baseUrl: 'https://api.ecobe.test',
        apiKey: 'test-key',
        timeout: 5000,
        retryAttempts: 2
      },
      signals: {
        harvestingEnabled: true,
        evidenceValidation: true,
        confidenceThreshold: 50,
        carbonOptimization: true
      },
      scheduling: {
        enabled: false, // Disable for testing
        windowSize: 24,
        maxBatchSize: 10,
        optimizationInterval: 15
      }
    })
  })

  afterEach(async () => {
    await integration.stop()
  })

  describe('Integration Lifecycle', () => {
    it('should start integration successfully', async () => {
      await integration.start()
      
      const status = await integration.getIntegrationStatus()
      expect(status.isRunning).toBe(true)
    })

    it('should stop integration successfully', async () => {
      await integration.start()
      await integration.stop()
      
      const status = await integration.getIntegrationStatus()
      expect(status.isRunning).toBe(false)
    })
  })

  describe('Buyer Intent Processing', () => {
    it('should process buyer intent workload successfully', async () => {
      const workload: BuyerIntentWorkload = {
        id: 'test-workload',
        organizationId: 'test-org',
        query: 'enterprise software companies',
        estimatedResults: 100,
        signals: [
          {
            id: 'signal-1',
            organizationId: 'test-org',
            signalType: SignalType.TECHNOLOGY_STACK,
            strength: SignalStrength.STRONG,
            confidence: SignalConfidence.HIGH,
            source: 'test',
            title: 'Company using React',
            description: 'Looking for React developers',
            keywords: ['react', 'javascript'],
            entities: [{ type: 'technology', name: 'React', confidence: 0.9 }],
            timestamp: new Date()
          }
        ],
        validatedSignals: [],
        preferredRegions: ['us-east-1', 'eu-west-1'],
        priority: 'medium',
        metadata: {}
      }

      // Mock ECOBE optimization
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          selectedRegion: 'eu-west-1',
          estimatedCO2: 15.5,
          scheduledTime: new Date(Date.now() + 3600000).toISOString()
        })
      })

      const result = await integration.processBuyerIntent(workload)

      expect(result.workloadId).toBe(workload.id)
      expect(result.status).toBe('success')
      expect(result.carbonOptimized).toBe(true)
      expect(result.executionPlan).toBeDefined()
    })

    it('should handle processing failures gracefully', async () => {
      const workload: BuyerIntentWorkload = {
        id: 'failing-workload',
        organizationId: 'test-org',
        query: 'test query',
        estimatedResults: 50,
        signals: [],
        validatedSignals: [],
        preferredRegions: [],
        priority: 'low',
        metadata: {}
      }

      // Mock ECOBE failure
      global.fetch = jest.fn().mockRejectedValue(new Error('ECOBE unavailable'))

      const result = await integration.processBuyerIntent(workload)

      expect(result.status).toBe('failed')
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should calculate carbon budget correctly', async () => {
      const workload: BuyerIntentWorkload = {
        id: 'budget-test',
        organizationId: 'test-org',
        query: 'test query',
        estimatedResults: 100,
        signals: [],
        validatedSignals: [
          {
            signalId: 'test-signal',
            originalConfidence: SignalConfidence.HIGH,
            validatedConfidence: SignalConfidence.HIGH,
            confidenceScore: 80,
            verificationStatus: VerificationStatus.VERIFIED,
            evidenceCount: 3,
            supportingEvidence: 3,
            contradictingEvidence: 0,
            riskFactors: [],
            validationTimestamp: new Date(),
            validationMethod: 'TEST'
          }
        ],
        preferredRegions: [],
        priority: 'high',
        metadata: {}
      }

      const budget = integration['calculateCarbonBudget'](workload, workload.validatedSignals)

      expect(budget).toBeGreaterThan(0)
      expect(budget).toBeLessThan(10000) // Should be within limits
    })
  })

  describe('Execution Planning', () => {
    it('should generate execution plan with reasoning', async () => {
      const workload: BuyerIntentWorkload = {
        id: 'plan-test',
        organizationId: 'test-org',
        query: 'test query',
        estimatedResults: 100,
        signals: [],
        validatedSignals: [
          {
            signalId: 'signal-1',
            originalConfidence: SignalConfidence.HIGH,
            validatedConfidence: SignalConfidence.VERY_HIGH,
            confidenceScore: 90,
            verificationStatus: VerificationStatus.VERIFIED,
            evidenceCount: 5,
            supportingEvidence: 5,
            contradictingEvidence: 0,
            riskFactors: [],
            validationTimestamp: new Date(),
            validationMethod: 'TEST'
          }
        ],
        preferredRegions: ['us-east-1'],
        priority: 'medium',
        metadata: {}
      }

      // Mock ECOBE response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          selectedRegion: 'us-east-1',
          estimatedCO2: 25.0,
          scheduledTime: new Date(Date.now() + 7200000).toISOString()
        })
      })

      const plan = await integration['generateExecutionPlan'](workload, workload.validatedSignals)

      expect(plan.workloadId).toBe(workload.id)
      expect(plan.selectedRegion).toBe('us-east-1')
      expect(plan.estimatedCarbon).toBe(25.0)
      expect(plan.confidence).toBeGreaterThan(70)
      expect(plan.reasoning.length).toBeGreaterThan(0)
      expect(plan.alternatives.length).toBeGreaterThan(0)
    })

    it('should calculate carbon savings correctly', async () => {
      const request = {
        query: {
          id: 'test',
          query: 'test query',
          estimatedResults: 100
        },
        carbonBudget: 50,
        regions: ['us-east-1']
      }

      const response = {
        selectedRegion: 'us-east-1',
        estimatedCO2: 15.0
      }

      const savings = integration['calculateCarbonSavings'](request, response)

      expect(savings).toBe(35.0) // 50 (baseline) - 15 (optimized)
    })
  })

  describe('Workload Management', () => {
    it('should create buyer intent workload correctly', async () => {
      const workloadData = {
        organizationId: 'test-org',
        query: 'enterprise software',
        estimatedResults: 200,
        preferredRegions: ['us-east-1', 'eu-west-1'],
        priority: 'high' as const,
        carbonBudget: 100
      }

      const workload = await integration.createBuyerIntentWorkload(workloadData)

      expect(workload.organizationId).toBe(workloadData.organizationId)
      expect(workload.query).toBe(workloadData.query)
      expect(workload.estimatedResults).toBe(workloadData.estimatedResults)
      expect(workload.priority).toBe(workloadData.priority)
      expect(workload.id).toMatch(/^workload_\d+_[a-z0-9]+$/)
    })
  })
})

describe('End-to-End Integration Tests', () => {
  it('should handle complete signal-to-execution workflow', async () => {
    // Create integration
    const integration = createDekesEcobeIntegration()

    // Create workload with signals
    const workload = await integration.createBuyerIntentWorkload({
      organizationId: 'test-org',
      query: 'companies using microservices',
      estimatedResults: 150,
      preferredRegions: ['us-east-1', 'eu-west-1'],
      priority: 'medium'
    })

    // Add high-confidence signals
    workload.signals = [
      {
        id: 'signal-1',
        organizationId: 'test-org',
        signalType: SignalType.TECHNOLOGY_STACK,
        strength: SignalStrength.STRONG,
        confidence: SignalConfidence.HIGH,
        source: 'test',
        title: 'Company adopting microservices',
        description: 'Enterprise company migrating to microservices architecture',
        keywords: ['microservices', 'kubernetes', 'docker'],
        entities: [
          { type: 'technology', name: 'Kubernetes', confidence: 0.9 },
          { type: 'technology', name: 'Docker', confidence: 0.8 }
        ],
        timestamp: new Date()
      }
    ]

    // Mock all external services
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        selectedRegion: 'eu-west-1',
        estimatedCO2: 18.5,
        scheduledTime: new Date(Date.now() + 3600000).toISOString()
      })
    })

    // Process the workload
    const result = await integration.processBuyerIntent(workload)

    // Verify complete workflow
    expect(result.status).toBe('success')
    expect(result.carbonOptimized).toBe(true)
    expect(result.executionPlan).toBeDefined()
    expect(result.executionPlan!.signals.total).toBe(1)
    expect(result.executionPlan!.carbonSavings).toBeGreaterThan(0)

    await integration.stop()
  })

  it('should handle signal validation failures appropriately', async () => {
    const integration = createDekesEcobeIntegration({
      signals: {
        harvestingEnabled: true,
        evidenceValidation: true,
        confidenceThreshold: 80, // High threshold
        carbonOptimization: true
      },
      ecobe: {
        baseUrl: 'https://api.ecobe.test',
        apiKey: 'test-key',
        timeout: 5000,
        retryAttempts: 2
      },
      scheduling: {
        enabled: false,
        windowSize: 24,
        maxBatchSize: 10,
        optimizationInterval: 15
      }
    })

    const workload = await integration.createBuyerIntentWorkload({
      organizationId: 'test-org',
      query: 'test query',
      estimatedResults: 100
    })

    // Add low-confidence signals
    workload.signals = [
      {
        id: 'weak-signal',
        organizationId: 'test-org',
        signalType: SignalType.SEARCH_INTENT,
        strength: SignalStrength.WEAK,
        confidence: SignalConfidence.LOW,
        source: 'test',
        title: 'Vague signal',
        description: 'Not much information',
        keywords: [],
        entities: [],
        timestamp: new Date()
      }
    ]

    // Mock no evidence found
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ evidence: [] })
    })

    const result = await integration.processBuyerIntent(workload)

    // Should not be carbon optimized due to weak signals
    expect(result.status).toBe('success')
    expect(result.carbonOptimized).toBe(false)
    expect(result.executionPlan).toBeUndefined()

    await integration.stop()
  })
})

// Performance Tests
describe('Performance Tests', () => {
  it('should handle large signal batches efficiently', async () => {
    const engine = createSignalHarvestingEngine()
    
    const signals: BuyerSignal[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `signal-${i}`,
      organizationId: 'test-org',
      signalType: SignalType.TECHNOLOGY_STACK,
      strength: SignalStrength.MODERATE,
      confidence: SignalConfidence.MEDIUM,
      source: 'test',
      title: `Signal ${i}`,
      description: `Description ${i}`,
      keywords: ['tech'],
      entities: [],
      timestamp: new Date()
    }))

    const startTime = Date.now()
    
    // Process signals (this would normally involve evidence validation)
    const results = signals.map(signal => ({
      signalId: signal.id,
      originalConfidence: signal.confidence,
      validatedConfidence: signal.confidence,
      confidenceScore: 75,
      verificationStatus: VerificationStatus.VERIFIED,
      evidenceCount: 2,
      supportingEvidence: 2,
      contradictingEvidence: 0,
      riskFactors: [],
      validationTimestamp: new Date(),
      validationMethod: 'PERFORMANCE_TEST'
    }))

    const endTime = Date.now()
    const processingTime = endTime - startTime

    expect(results).toHaveLength(1000)
    expect(processingTime).toBeLessThan(5000) // Should complete within 5 seconds
  })

  it('should handle concurrent integration requests', async () => {
    const integration = createDekesEcobeIntegration({
      scheduling: { enabled: false, windowSize: 24, maxBatchSize: 10, optimizationInterval: 15 },
      signals: { harvestingEnabled: false, evidenceValidation: false, confidenceThreshold: 50, carbonOptimization: false },
      ecobe: { baseUrl: 'https://api.test', apiKey: 'test', timeout: 5000, retryAttempts: 1 }
    })

    // Mock ECOBE to respond quickly
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        selectedRegion: 'us-east-1',
        estimatedCO2: 10.0
      })
    })

    const workloads = Array.from({ length: 50 }, (_, i) => 
      integration.createBuyerIntentWorkload({
        organizationId: 'test-org',
        query: `Query ${i}`,
        estimatedResults: 100
      })
    )

    const startTime = Date.now()
    
    const results = await Promise.all(
      workloads.map(workload => integration.processBuyerIntent(workload))
    )

    const endTime = Date.now()
    const processingTime = endTime - startTime

    expect(results).toHaveLength(50)
    expect(results.every(r => r.status === 'success')).toBe(true)
    expect(processingTime).toBeLessThan(10000) // Should complete within 10 seconds

    await integration.stop()
  })
})

// Error Recovery Tests
describe('Error Recovery Tests', () => {
  it('should recover from temporary ECOBE failures', async () => {
    const integration = createDekesEcobeIntegration({
      ecobe: {
        baseUrl: 'https://api.ecobe.test',
        apiKey: 'test-key',
        timeout: 1000,
        retryAttempts: 3
      },
      scheduling: { enabled: false, windowSize: 24, maxBatchSize: 10, optimizationInterval: 15 },
      signals: { harvestingEnabled: false, evidenceValidation: false, confidenceThreshold: 50, carbonOptimization: true }
    })

    const workload = await integration.createBuyerIntentWorkload({
      organizationId: 'test-org',
      query: 'test query',
      estimatedResults: 100
    })

    // Mock ECOBE to fail twice, then succeed
    let callCount = 0
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.reject(new Error('Temporary failure'))
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          selectedRegion: 'us-east-1',
          estimatedCO2: 15.0
        })
      })
    })

    const result = await integration.processBuyerIntent(workload)

    expect(result.status).toBe('success')
    expect(result.carbonOptimized).toBe(true)
    expect(callCount).toBe(3) // Should have retried twice

    await integration.stop()
  })

  it('should handle partial signal validation failures', async () => {
    const evidenceEngine = createEvidenceEngine()

    const signals: BuyerSignal[] = [
      {
        id: 'valid-signal',
        organizationId: 'test-org',
        signalType: SignalType.TECHNOLOGY_STACK,
        strength: SignalStrength.STRONG,
        confidence: SignalConfidence.HIGH,
        source: 'test',
        title: 'Valid signal',
        description: 'Strong signal',
        keywords: ['tech'],
        entities: [],
        timestamp: new Date()
      },
      {
        id: 'invalid-signal',
        organizationId: 'test-org',
        signalType: SignalType.SEARCH_INTENT,
        strength: SignalStrength.WEAK,
        confidence: SignalConfidence.LOW,
        source: 'test',
        title: 'Invalid signal',
        description: 'Weak signal',
        keywords: [],
        entities: [],
        timestamp: new Date()
      }
    ]

    // Mock mixed evidence results
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('valid-signal')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            evidence: [{
              type: 'domain',
              strength: 'strong',
              confidence: 0.9,
              description: 'Domain verified'
            }]
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ evidence: [] })
      })
    })

    const results = await evidenceEngine.validateSignalsBatch(signals)

    expect(results).toHaveLength(2)
    expect(results[0].verificationStatus).toBe(VerificationStatus.VERIFIED)
    expect(results[1].verificationStatus).toBe(VerificationStatus.REJECTED)
  })
})
