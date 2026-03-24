// Evidence Engine - Signal Validation and Verification System
// Validates buyer signals with multiple evidence sources to reduce false positives

import { z } from 'zod'
import { createHash } from 'crypto'
import { prisma } from '../db'
import { classifyError, logError } from '../error/error-handler'
import { createLogger } from '../logger'
import { BuyerSignal, SignalType, SignalStrength, SignalConfidence } from './harvesting-engine'

const logger = createLogger('EvidenceEngine')

// Evidence Types and Classification
export enum EvidenceType {
  DOMAIN_VERIFICATION = 'DOMAIN_VERIFICATION',
  COMPANY_EXISTS = 'COMPANY_EXISTS',
  TECHNOLOGY_CONFIRMATION = 'TECHNOLOGY_CONFIRMATION',
  HIRING_VERIFICATION = 'HIRING_VERIFICATION',
  FUNDING_CONFIRMATION = 'FUNDING_CONFIRMATION',
  NEWS_CORROBORATION = 'NEWS_CORROBORATION',
  SOCIAL_MEDIA_ACTIVITY = 'SOCIAL_MEDIA_ACTIVITY',
  TECHNICAL_INDICATORS = 'TECHNICAL_INDICATORS',
  MARKET_PRESENCE = 'MARKET_PRESENCE',
  RELATIONSHIP_MAPPING = 'RELATIONSHIP_MAPPING'
}

export enum EvidenceStrength {
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
  CONCLUSIVE = 'CONCLUSIVE'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  INCONCLUSIVE = 'INCONCLUSIVE',
  DISPUTED = 'DISPUTED'
}

// Evidence Schema
export const EvidenceSchema = z.object({
  id: z.string(),
  signalId: z.string(),
  evidenceType: z.nativeEnum(EvidenceType),
  strength: z.nativeEnum(EvidenceStrength),
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1),
  description: z.string(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  verified: z.boolean().default(false),
  verificationMethod: z.string().optional()
})

export type Evidence = z.infer<typeof EvidenceSchema>

// Signal Validation Result
export const ValidationResultSchema = z.object({
  signalId: z.string(),
  originalConfidence: z.nativeEnum(SignalConfidence),
  validatedConfidence: z.nativeEnum(SignalConfidence),
  confidenceScore: z.number().min(0).max(1),
  verificationStatus: z.nativeEnum(VerificationStatus),
  evidenceCount: z.number(),
  supportingEvidence: z.number(),
  contradictingEvidence: z.number(),
  riskFactors: z.array(z.string()),
  validationTimestamp: z.date(),
  validationMethod: z.string(),
  metadata: z.record(z.unknown()).optional()
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>

// Evidence Collection Configuration
export interface EvidenceConfig {
  sources: EvidenceSource[]
  validators: EvidenceValidator[]
  thresholds: ValidationThresholds
  riskAssessment: RiskAssessmentConfig
}

export interface EvidenceSource {
  id: string
  name: string
  type: 'api' | 'database' | 'webhook' | 'scraper' | 'third_party'
  endpoint?: string
  credentials?: Record<string, string>
  priority: number
  reliability: number // 0-1 score
  enabled: boolean
  rateLimit?: {
    requests: number
    window: number // seconds
  }
}

export interface EvidenceValidator {
  id: string
  name: string
  evidenceTypes: EvidenceType[]
  validationFunction: string // function name or reference
  weight: number
  enabled: boolean
}

export interface ValidationThresholds {
  minimumEvidence: number
  highConfidenceThreshold: number
  veryHighConfidenceThreshold: number
  rejectionThreshold: number
  riskThreshold: number
}

export interface RiskAssessmentConfig {
  factors: RiskFactor[]
  weights: Record<string, number>
  thresholds: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export interface RiskFactor {
  id: string
  name: string
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  detectable: boolean
}

// Evidence Engine
export class EvidenceEngine {
  private config: EvidenceConfig
  private rateLimiters: Map<string, RateLimiter> = new Map()

  constructor(config: EvidenceConfig) {
    this.config = config
    this.initializeRateLimiters()
  }

  // Core Validation Methods
  async validateSignal(signal: BuyerSignal): Promise<ValidationResult> {
    logger.info(`Validating signal: ${signal.id}`)

    try {
      // Collect evidence from all sources
      const evidence = await this.collectEvidence(signal)
      
      // Analyze evidence
      const analysis = await this.analyzeEvidence(signal, evidence)
      
      // Assess risk factors
      const riskAssessment = await this.assessRisk(signal, evidence)
      
      // Generate validation result
      const result = await this.generateValidationResult(signal, evidence, analysis, riskAssessment)
      
      // Store validation result
      await this.storeValidationResult(result)
      
      logger.info(`Signal validation completed: ${signal.id} - ${result.verificationStatus}`)
      return result
      
    } catch (error) {
      const classifiedError = classifyError(error)
      logError(classifiedError, { 
        context: 'EvidenceEngine.validateSignal',
        signalId: signal.id 
      })
      throw classifiedError
    }
  }

  async validateSignalsBatch(signals: BuyerSignal[]): Promise<ValidationResult[]> {
    logger.info(`Validating batch of ${signals.length} signals`)

    const results: ValidationResult[] = []
    
    // Process signals in parallel with rate limiting
    const batchSize = 10 // Process 10 signals at a time
    for (let i = 0; i < signals.length; i += batchSize) {
      const batch = signals.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(signal => this.validateSignal(signal))
      )
      results.push(...batchResults)
      
      // Small delay between batches to avoid overwhelming sources
      if (i + batchSize < signals.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    logger.info(`Batch validation completed: ${results.length} results`)
    return results
  }

  private async collectEvidence(signal: BuyerSignal): Promise<Evidence[]> {
    const evidence: Evidence[] = []
    
    // Get relevant evidence sources for this signal type
    const relevantSources = this.getRelevantSources(signal.signalType)
    
    for (const source of relevantSources) {
      if (!source.enabled) continue
      
      // Check rate limiting
      if (!this.checkRateLimit(source.id)) {
        logger.warn(`Rate limit exceeded for source: ${source.id}`)
        continue
      }
      
      try {
        const sourceEvidence = await this.collectFromSource(source, signal)
        evidence.push(...sourceEvidence)
      } catch (error) {
        const classifiedError = classifyError(error)
        logError(classifiedError, { 
          context: 'EvidenceEngine.collectFromSource',
          sourceId: source.id,
          signalId: signal.id 
        })
      }
    }

    logger.debug(`Collected ${evidence.length} pieces of evidence for signal: ${signal.id}`)
    return evidence
  }

  private getRelevantSources(signalType: SignalType): EvidenceSource[] {
    // Map signal types to relevant evidence sources
    const sourceMappings: Record<SignalType, string[]> = {
      [SignalType.SEARCH_INTENT]: ['domain-verification', 'company-exists'],
      [SignalType.TECHNOLOGY_STACK]: ['technology-confirmation', 'technical-indicators'],
      [SignalType.HIRING_SIGNALS]: ['hiring-verification', 'company-exists'],
      [SignalType.FUNDING_EVENTS]: ['funding-confirmation', 'news-corroboration'],
      [SignalType.PROCUREMENT_BEHAVIOR]: ['company-exists', 'market-presence'],
      [SignalType.CONTENT_CONSUMPTION]: ['social-media-activity', 'market-presence'],
      [SignalType.TECHNICAL_PROBLEMS]: ['technical-indicators', 'technology-confirmation'],
      [SignalType.COMPETITIVE_DISPLACEMENT]: ['relationship-mapping', 'news-corroboration'],
      [SignalType.MARKET_EXPANSION]: ['market-presence', 'company-exists'],
      [SignalType.COMPLIANCE_REQUIREMENTS]: ['company-exists', 'news-corroboration']
    }

    const relevantSourceIds = sourceMappings[signalType] || []
    return this.config.sources.filter(source => 
      relevantSourceIds.includes(source.id)
    )
  }

  private async collectFromSource(source: EvidenceSource, signal: BuyerSignal): Promise<Evidence[]> {
    switch (source.type) {
      case 'api':
        return await this.collectFromApi(source, signal)
      case 'database':
        return await this.collectFromDatabase(source, signal)
      case 'scraper':
        return await this.collectFromScraper(source, signal)
      case 'third_party':
        return await this.collectFromThirdParty(source, signal)
      default:
        throw new Error(`Unsupported evidence source type: ${source.type}`)
    }
  }

  private async collectFromApi(source: EvidenceSource, signal: BuyerSignal): Promise<Evidence[]> {
    if (!source.endpoint) {
      throw new Error(`API source ${source.id} missing endpoint`)
    }

    const headers = this.buildAuthHeaders(source.credentials)
    
    // Build request based on signal type
    const requestData = this.buildEvidenceRequest(signal, source)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    try {
      const response = await fetch(source.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Evidence API request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      return this.parseEvidenceResponse(data, source, signal)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async collectFromDatabase(source: EvidenceSource, signal: BuyerSignal): Promise<Evidence[]> {
    // Collect evidence from internal databases
    const evidence: Evidence[] = []

    // Domain verification
    if (source.id === 'domain-verification') {
      const domainEvidence = await this.verifyDomain(signal)
      if (domainEvidence) evidence.push(domainEvidence)
    }

    // Company existence check
    if (source.id === 'company-exists') {
      const companyEvidence = await this.verifyCompany(signal)
      if (companyEvidence) evidence.push(companyEvidence)
    }

    return evidence
  }

  private async collectFromScraper(source: EvidenceSource, signal: BuyerSignal): Promise<Evidence[]> {
    // Web scraping for evidence
    // This would use a scraping library to gather evidence from websites
    
    // Placeholder implementation
    return []
  }

  private async collectFromThirdParty(source: EvidenceSource, signal: BuyerSignal): Promise<Evidence[]> {
    // Third-party evidence services
    // This could integrate with services like Crunchbase, LinkedIn, etc.
    
    // Placeholder implementation
    return []
  }

  private buildAuthHeaders(credentials?: Record<string, string>): Record<string, string> {
    if (!credentials) return {}

    const headers: Record<string, string> = {}

    if (credentials.apiKey) {
      headers['Authorization'] = `Bearer ${credentials.apiKey}`
    }

    if (credentials.username && credentials.password) {
      const encoded = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')
      headers['Authorization'] = `Basic ${encoded}`
    }

    return headers
  }

  private buildEvidenceRequest(signal: BuyerSignal, source: EvidenceSource): any {
    // Build request payload for evidence collection
    return {
      signal: {
        id: signal.id,
        type: signal.signalType,
        title: signal.title,
        description: signal.description,
        keywords: signal.keywords,
        entities: signal.entities
      },
      organizationId: signal.organizationId,
      source: source.id
    }
  }

  private parseEvidenceResponse(data: any, source: EvidenceSource, signal: BuyerSignal): Evidence[] {
    const evidence: Evidence[] = []

    if (data.evidence && Array.isArray(data.evidence)) {
      for (const evidenceData of data.evidence) {
        const evidenceItem: Evidence = {
          id: this.generateEvidenceId(signal.id, source.id, evidenceData),
          signalId: signal.id,
          evidenceType: this.mapEvidenceType(evidenceData.type),
          strength: this.mapEvidenceStrength(evidenceData.strength),
          source: source.name,
          sourceUrl: evidenceData.url,
          confidence: evidenceData.confidence || 0.5,
          description: evidenceData.description,
          metadata: evidenceData.metadata,
          timestamp: new Date(evidenceData.timestamp || Date.now()),
          verified: false,
          verificationMethod: evidenceData.method
        }

        evidence.push(evidenceItem)
      }
    }

    return evidence
  }

  private async verifyDomain(signal: BuyerSignal): Promise<Evidence | null> {
    // Extract domain from signal
    const domain = this.extractDomain(signal)
    if (!domain) return null

    // Check if domain exists and is active
    try {
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`)
      const data = await response.json()

      if (data.Answer && data.Answer.length > 0) {
        return {
          id: this.generateEvidenceId(signal.id, 'domain-verification', domain),
          signalId: signal.id,
          evidenceType: EvidenceType.DOMAIN_VERIFICATION,
          strength: EvidenceStrength.STRONG,
          source: 'DNS Verification',
          confidence: 0.9,
          description: `Domain ${domain} is active and resolves to ${data.Answer[0].data}`,
          metadata: {
            domain,
            ip: data.Answer[0].data,
            ttl: data.Answer[0].TTL
          },
          timestamp: new Date(),
          verified: true,
          verificationMethod: 'DNS_LOOKUP'
        }
      }
    } catch (error) {
      logger.warn(`Domain verification failed for ${domain}: ${error}`)
    }

    return null
  }

  private async verifyCompany(signal: BuyerSignal): Promise<Evidence | null> {
    // Check if company exists in internal database
    // This would query the company database
    
    // Placeholder implementation
    return null
  }

  private extractDomain(signal: BuyerSignal): string | null {
    // Extract domain from signal source URL or entities
    if (signal.sourceUrl) {
      try {
        const url = new URL(signal.sourceUrl)
        return url.hostname
      } catch {
        return null
      }
    }

    // Check entities for domain
    const domainEntity = signal.entities.find(e => e.type === 'domain')
    return domainEntity ? domainEntity.name : null
  }

  private generateEvidenceId(signalId: string, sourceId: string, evidenceData: any): string {
    const content = `${signalId}${sourceId}${JSON.stringify(evidenceData)}`
    return createHash('sha256').update(content).digest('hex').substring(0, 16)
  }

  private mapEvidenceType(type: string): EvidenceType {
    const typeMap: Record<string, EvidenceType> = {
      'domain': EvidenceType.DOMAIN_VERIFICATION,
      'company': EvidenceType.COMPANY_EXISTS,
      'technology': EvidenceType.TECHNOLOGY_CONFIRMATION,
      'hiring': EvidenceType.HIRING_VERIFICATION,
      'funding': EvidenceType.FUNDING_CONFIRMATION,
      'news': EvidenceType.NEWS_CORROBORATION,
      'social': EvidenceType.SOCIAL_MEDIA_ACTIVITY,
      'technical': EvidenceType.TECHNICAL_INDICATORS,
      'market': EvidenceType.MARKET_PRESENCE,
      'relationship': EvidenceType.RELATIONSHIP_MAPPING
    }

    return typeMap[type.toLowerCase()] || EvidenceType.COMPANY_EXISTS
  }

  private mapEvidenceStrength(strength: string): EvidenceStrength {
    const strengthMap: Record<string, EvidenceStrength> = {
      'weak': EvidenceStrength.WEAK,
      'moderate': EvidenceStrength.MODERATE,
      'strong': EvidenceStrength.STRONG,
      'conclusive': EvidenceStrength.CONCLUSIVE
    }

    return strengthMap[strength.toLowerCase()] || EvidenceStrength.MODERATE
  }

  private async analyzeEvidence(signal: BuyerSignal, evidence: Evidence[]): Promise<{
    supportingCount: number
    contradictingCount: number
    totalConfidence: number
    evidenceScore: number
  }> {
    let supportingCount = 0
    let contradictingCount = 0
    let totalConfidence = 0

    for (const evidenceItem of evidence) {
      totalConfidence += evidenceItem.confidence

      // Determine if evidence supports or contradicts the signal
      if (this.isSupportingEvidence(evidenceItem, signal)) {
        supportingCount++
      } else {
        contradictingCount++
      }
    }

    const averageConfidence = evidence.length > 0 ? totalConfidence / evidence.length : 0
    const evidenceScore = this.calculateEvidenceScore(supportingCount, contradictingCount, averageConfidence)

    return {
      supportingCount,
      contradictingCount,
      totalConfidence: averageConfidence,
      evidenceScore
    }
  }

  private isSupportingEvidence(evidence: Evidence, signal: BuyerSignal): boolean {
    // Logic to determine if evidence supports the signal
    // This would be more sophisticated in practice
    
    switch (evidence.evidenceType) {
      case EvidenceType.DOMAIN_VERIFICATION:
      case EvidenceType.COMPANY_EXISTS:
        return evidence.confidence > 0.7
      
      case EvidenceType.TECHNOLOGY_CONFIRMATION:
        return signal.signalType === SignalType.TECHNOLOGY_STACK && evidence.confidence > 0.6
      
      case EvidenceType.HIRING_VERIFICATION:
        return signal.signalType === SignalType.HIRING_SIGNALS && evidence.confidence > 0.7
      
      case EvidenceType.FUNDING_CONFIRMATION:
        return signal.signalType === SignalType.FUNDING_EVENTS && evidence.confidence > 0.8
      
      default:
        return evidence.confidence > 0.5
    }
  }

  private calculateEvidenceScore(supporting: number, contradicting: number, confidence: number): number {
    const total = supporting + contradicting
    if (total === 0) return 0

    const supportRatio = supporting / total
    const confidenceWeight = confidence * 0.3
    const supportWeight = supportRatio * 0.7

    return (supportWeight + confidenceWeight) * 100
  }

  private async assessRisk(signal: BuyerSignal, evidence: Evidence[]): Promise<string[]> {
    const riskFactors: string[] = []

    // Check for common risk factors
    if (evidence.length === 0) {
      riskFactors.push('NO_EVIDENCE')
    }

    if (evidence.filter(e => e.confidence < 0.5).length > evidence.length / 2) {
      riskFactors.push('LOW_CONFIDENCE_EVIDENCE')
    }

    if (signal.confidence === SignalConfidence.LOW) {
      riskFactors.push('LOW_SIGNAL_CONFIDENCE')
    }

    if (signal.strength === SignalStrength.WEAK) {
      riskFactors.push('WEAK_SIGNAL_STRENGTH')
    }

    // Check for contradictory evidence
    const contradictingEvidence = evidence.filter(e => !this.isSupportingEvidence(e, signal))
    const supportingEvidence = evidence.filter(e => this.isSupportingEvidence(e, signal))
    if (contradictingEvidence.length > supportingEvidence.length) {
      riskFactors.push('CONTRADICTORY_EVIDENCE')
    }

    return riskFactors
  }

  private async generateValidationResult(
    signal: BuyerSignal,
    evidence: Evidence[],
    analysis: any,
    riskFactors: string[]
  ): Promise<ValidationResult> {
    const confidenceScore = analysis.evidenceScore
    const verificationStatus = this.determineVerificationStatus(confidenceScore, riskFactors)
    const validatedConfidence = this.mapScoreToConfidence(confidenceScore)

    return {
      signalId: signal.id,
      originalConfidence: signal.confidence,
      validatedConfidence,
      confidenceScore,
      verificationStatus,
      evidenceCount: evidence.length,
      supportingEvidence: analysis.supportingCount,
      contradictingEvidence: analysis.contradictingCount,
      riskFactors,
      validationTimestamp: new Date(),
      validationMethod: 'EVIDENCE_ENGINE_V1',
      metadata: {
        evidenceSources: Array.from(new Set(evidence.map(e => e.source))),
        averageEvidenceConfidence: analysis.totalConfidence,
        evidenceScore: analysis.evidenceScore
      }
    }
  }

  private determineVerificationStatus(score: number, riskFactors: string[]): VerificationStatus {
    if (riskFactors.includes('CONTRADICTORY_EVIDENCE') || riskFactors.includes('NO_EVIDENCE')) {
      return VerificationStatus.REJECTED
    }

    if (score >= this.config.thresholds.veryHighConfidenceThreshold) {
      return VerificationStatus.VERIFIED
    }

    if (score >= this.config.thresholds.highConfidenceThreshold) {
      return VerificationStatus.VERIFIED
    }

    if (score < this.config.thresholds.rejectionThreshold) {
      return VerificationStatus.REJECTED
    }

    return VerificationStatus.INCONCLUSIVE
  }

  private mapScoreToConfidence(score: number): SignalConfidence {
    if (score >= 85) return SignalConfidence.VERY_HIGH
    if (score >= 70) return SignalConfidence.HIGH
    if (score >= 55) return SignalConfidence.MEDIUM
    return SignalConfidence.LOW
  }

  private async storeValidationResult(result: ValidationResult): Promise<void> {
    // Store validation result in database
    logger.debug(`Storing validation result for signal: ${result.signalId}`)
    
    // Placeholder for database storage
    // await prisma.validationResult.create({ data: result })
  }

  // Rate Limiting
  private initializeRateLimiters(): void {
    for (const source of this.config.sources) {
      if (source.rateLimit) {
        this.rateLimiters.set(source.id, new RateLimiter(
          source.rateLimit.requests,
          source.rateLimit.window * 1000 // Convert to milliseconds
        ))
      }
    }
  }

  private checkRateLimit(sourceId: string): boolean {
    const limiter = this.rateLimiters.get(sourceId)
    return limiter ? limiter.checkLimit() : true
  }

  // Public API Methods
  async getValidationHistory(signalId: string): Promise<ValidationResult[]> {
    // Retrieve validation history for a signal
    // This would query the database
    
    // Placeholder implementation
    return []
  }

  async getEvidenceBySignal(signalId: string): Promise<Evidence[]> {
    // Retrieve all evidence for a signal
    // This would query the database
    
    // Placeholder implementation
    return []
  }

  async getValidationMetrics(filters?: {
    startDate?: Date
    endDate?: Date
    signalType?: SignalType
    verificationStatus?: VerificationStatus
  }): Promise<{
    totalValidations: number
    verificationRate: number
    averageConfidence: number
    rejectionRate: number
    statusBreakdown: Record<VerificationStatus, number>
  }> {
    // Get validation metrics
    // This would query the database and calculate metrics
    
    // Placeholder implementation
    return {
      totalValidations: 0,
      verificationRate: 0,
      averageConfidence: 0,
      rejectionRate: 0,
      statusBreakdown: {} as Record<VerificationStatus, number>
    }
  }

  getEngineStatus(): {
    activeSources: number
    totalSources: number
    rateLimitersActive: number
  } {
    return {
      activeSources: this.config.sources.filter(s => s.enabled).length,
      totalSources: this.config.sources.length,
      rateLimitersActive: this.rateLimiters.size
    }
  }
}

// Rate Limiter Implementation
class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  checkLimit(): boolean {
    const now = Date.now()
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(timestamp => 
      now - timestamp < this.windowMs
    )

    // Check if we can make a new request
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now)
      return true
    }

    return false
  }

  getRemainingRequests(): number {
    const now = Date.now()
    this.requests = this.requests.filter(timestamp => 
      now - timestamp < this.windowMs
    )
    return Math.max(0, this.maxRequests - this.requests.length)
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0
    return Math.min(...this.requests) + this.windowMs
  }
}

// Factory function for creating configured engines
export function createEvidenceEngine(config?: Partial<EvidenceConfig>): EvidenceEngine {
  const defaultConfig: EvidenceConfig = {
    sources: [
      {
        id: 'domain-verification',
        name: 'Domain Verification Service',
        type: 'database',
        priority: 1,
        reliability: 0.9,
        enabled: true,
        rateLimit: {
          requests: 100,
          window: 60
        }
      },
      {
        id: 'company-exists',
        name: 'Company Database',
        type: 'database',
        priority: 2,
        reliability: 0.8,
        enabled: true,
        rateLimit: {
          requests: 200,
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
      factors: [
        {
          id: 'NO_EVIDENCE',
          name: 'No Supporting Evidence',
          description: 'Signal has no supporting evidence',
          impact: 'critical',
          detectable: true
        },
        {
          id: 'LOW_CONFIDENCE_EVIDENCE',
          name: 'Low Confidence Evidence',
          description: 'Most evidence has low confidence scores',
          impact: 'high',
          detectable: true
        }
      ],
      weights: {
        'NO_EVIDENCE': 0.4,
        'LOW_CONFIDENCE_EVIDENCE': 0.3,
        'CONTRADICTORY_EVIDENCE': 0.3
      },
      thresholds: {
        low: 25,
        medium: 50,
        high: 75,
        critical: 90
      }
    }
  }

  const finalConfig = { ...defaultConfig, ...config }
  return new EvidenceEngine(finalConfig)
}

// Export default configuration
export const DEFAULT_EVIDENCE_CONFIG: EvidenceConfig = {
  sources: [
    {
      id: 'domain-verification',
      name: 'Domain Verification Service',
      type: 'database',
      priority: 1,
      reliability: 0.9,
      enabled: true,
      rateLimit: {
        requests: 100,
        window: 60
      }
    },
    {
      id: 'company-exists',
      name: 'Company Database',
      type: 'database',
      priority: 2,
      reliability: 0.8,
      enabled: true,
      rateLimit: {
        requests: 200,
        window: 60
      }
    },
    {
      id: 'technology-confirmation',
      name: 'Technology Stack API',
      type: 'api',
      endpoint: 'https://api.techstack.com/v1/verify',
      priority: 3,
      reliability: 0.7,
      enabled: true,
      credentials: {
        apiKey: process.env.TECHSTACK_API_KEY
      },
      rateLimit: {
        requests: 50,
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
    factors: [
      {
        id: 'NO_EVIDENCE',
        name: 'No Supporting Evidence',
        description: 'Signal has no supporting evidence',
        impact: 'critical',
        detectable: true
      },
      {
        id: 'LOW_CONFIDENCE_EVIDENCE',
        name: 'Low Confidence Evidence',
        description: 'Most evidence has low confidence scores',
        impact: 'high',
        detectable: true
      },
      {
        id: 'CONTRADICTORY_EVIDENCE',
        name: 'Contradictory Evidence',
        description: 'Evidence contradicts the signal',
        impact: 'critical',
        detectable: true
      }
    ],
    weights: {
      'NO_EVIDENCE': 0.4,
      'LOW_CONFIDENCE_EVIDENCE': 0.3,
      'CONTRADICTORY_EVIDENCE': 0.3
    },
    thresholds: {
      low: 25,
      medium: 50,
      high: 75,
      critical: 90
    }
  }
}
