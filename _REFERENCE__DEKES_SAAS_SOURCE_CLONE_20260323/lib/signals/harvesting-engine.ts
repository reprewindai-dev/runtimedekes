// Signal Harvesting Engine - Buyer Intent Detection System
// Core component for identifying high-confidence buyer signals

import { z } from 'zod'
import { createHash } from 'crypto'
import { prisma } from '../db'
import { classifyError, logError } from '../error/error-handler'
import { createLogger } from '../logger'

const logger = createLogger('SignalHarvestingEngine')

// Signal Types and Classification
export enum SignalType {
  SEARCH_INTENT = 'SEARCH_INTENT',
  TECHNOLOGY_STACK = 'TECHNOLOGY_STACK',
  HIRING_SIGNALS = 'HIRING_SIGNALS',
  FUNDING_EVENTS = 'FUNDING_EVENTS',
  PROCUREMENT_BEHAVIOR = 'PROCUREMENT_BEHAVIOR',
  CONTENT_CONSUMPTION = 'CONTENT_CONSUMPTION',
  TECHNICAL_PROBLEMS = 'TECHNICAL_PROBLEMS',
  COMPETITIVE_DISPLACEMENT = 'COMPETITIVE_DISPLACEMENT',
  MARKET_EXPANSION = 'MARKET_EXPANSION',
  COMPLIANCE_REQUIREMENTS = 'COMPLIANCE_REQUIREMENTS'
}

export enum SignalStrength {
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
  CRITICAL = 'CRITICAL'
}

export enum SignalConfidence {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

// Core Signal Schema
export const BuyerSignalSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  signalType: z.nativeEnum(SignalType),
  strength: z.nativeEnum(SignalStrength),
  confidence: z.nativeEnum(SignalConfidence),
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  entities: z.array(z.object({
    type: z.string(),
    name: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  timestamp: z.date(),
  metadata: z.record(z.unknown()).optional(),
  processed: z.boolean().default(false),
  verified: z.boolean().default(false)
})

export type BuyerSignal = z.infer<typeof BuyerSignalSchema>

// Signal Harvesting Configuration
export interface HarvestingConfig {
  sources: SignalSource[]
  filters: SignalFilter[]
  enrichment: EnrichmentConfig
  thresholds: ConfidenceThresholds
}

export interface SignalSource {
  id: string
  name: string
  type: 'api' | 'webhook' | 'scraper' | 'feed'
  endpoint?: string
  credentials?: Record<string, string>
  frequency: number // minutes
  enabled: boolean
  priority: number
}

export interface SignalFilter {
  field: string
  operator: 'contains' | 'equals' | 'regex' | 'greater_than' | 'less_than'
  value: string | number
  weight: number
}

export interface EnrichmentConfig {
  entityExtraction: boolean
  sentimentAnalysis: boolean
  technographic: boolean
  firmographic: boolean
  intentClassification: boolean
}

export interface ConfidenceThresholds {
  minimum: number
  strong: number
  critical: number
}

// Signal Harvesting Engine
export class SignalHarvestingEngine {
  private config: HarvestingConfig
  private isRunning = false
  private harvestIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: HarvestingConfig) {
    this.config = config
  }

  // Core Harvesting Methods
  async startHarvesting(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Signal harvesting already running')
      return
    }

    this.isRunning = true
    logger.info('Starting signal harvesting engine')

    try {
      // Start all enabled sources
      for (const source of this.config.sources.filter(s => s.enabled)) {
        await this.startSourceHarvesting(source)
      }

      logger.info(`Started harvesting from ${this.config.sources.filter(s => s.enabled).length} sources`)
    } catch (error) {
      const classifiedError = classifyError(error)
      logError(classifiedError, { context: 'SignalHarvestingEngine.startHarvesting' })
      throw classifiedError
    }
  }

  async stopHarvesting(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    logger.info('Stopping signal harvesting engine')

    // Clear all intervals
    this.harvestIntervals.forEach((interval, sourceId) => {
      clearInterval(interval)
      logger.info(`Stopped harvesting for source: ${sourceId}`)
    })

    this.harvestIntervals.clear()
  }

  private async startSourceHarvesting(source: SignalSource): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.harvestFromSource(source)
      } catch (error) {
        const classifiedError = classifyError(error)
        logError(classifiedError, { 
          context: 'SignalHarvestingEngine.harvestFromSource',
          sourceId: source.id 
        })
      }
    }, source.frequency * 60 * 1000) // Convert minutes to milliseconds

    this.harvestIntervals.set(source.id, interval)
    logger.info(`Started harvesting from source: ${source.name} (${source.frequency}min interval)`)
  }

  private async harvestFromSource(source: SignalSource): Promise<void> {
    logger.debug(`Harvesting from source: ${source.name}`)

    let rawSignals: unknown[]

    switch (source.type) {
      case 'api':
        rawSignals = await this.harvestFromApi(source)
        break
      case 'webhook':
        // Webhooks are event-driven, not polled
        return
      case 'scraper':
        rawSignals = await this.harvestFromScraper(source)
        break
      case 'feed':
        rawSignals = await this.harvestFromFeed(source)
        break
      default:
        throw new Error(`Unsupported source type: ${source.type}`)
    }

    // Process and store signals
    await this.processRawSignals(rawSignals, source)
  }

  private async harvestFromApi(source: SignalSource): Promise<unknown[]> {
    if (!source.endpoint) {
      throw new Error(`API source ${source.id} missing endpoint`)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    try {
      const response = await fetch(source.endpoint, {
        headers: this.buildAuthHeaders(source.credentials),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async harvestFromScraper(source: SignalSource): Promise<unknown[]> {
    // Implementation for web scraping
    // This would use a scraping library like Puppeteer or Cheerio
    logger.debug(`Scraping from: ${source.endpoint}`)
    
    // Placeholder implementation
    return []
  }

  private async harvestFromFeed(source: SignalSource): Promise<unknown[]> {
    if (!source.endpoint) {
      throw new Error(`Feed source ${source.id} missing endpoint`)
    }

    // RSS/Atom feed parsing
    const response = await fetch(source.endpoint)
    const feedText = await response.text()
    
    // Parse feed XML/JSON
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

  private async processRawSignals(rawSignals: unknown[], source: SignalSource): Promise<void> {
    const processedSignals: BuyerSignal[] = []

    for (const rawSignal of rawSignals) {
      try {
        const signal = await this.transformRawSignal(rawSignal, source)
        
        if (signal && this.passesFilters(signal)) {
          processedSignals.push(signal)
        }
      } catch (error) {
        const classifiedError = classifyError(error)
        logError(classifiedError, { 
          context: 'SignalHarvestingEngine.transformRawSignal',
          sourceId: source.id,
          rawSignal 
        })
      }
    }

    // Enrich signals
    const enrichedSignals = await this.enrichSignals(processedSignals)

    // Store signals
    await this.storeSignals(enrichedSignals)

    logger.info(`Processed ${enrichedSignals.length} signals from ${source.name}`)
  }

  private async transformRawSignal(rawSignal: unknown, source: SignalSource): Promise<BuyerSignal | null> {
    // This is where the core signal detection logic happens
    // Different sources will have different formats
    
    const signalData = this.extractSignalData(rawSignal, source)
    
    if (!signalData) {
      return null
    }

    // Classify signal type and strength
    const signalType = this.classifySignalType(signalData)
    const strength = this.calculateSignalStrength(signalData, signalType)
    const confidence = this.calculateConfidence(signalData, signalType, strength)

    // Apply confidence thresholds
    const confidenceScore = this.getConfidenceScore(confidence)
    if (confidenceScore < this.config.thresholds.minimum) {
      return null
    }

    const signal: BuyerSignal = {
      id: this.generateSignalId(signalData),
      organizationId: signalData.organizationId || 'unknown',
      signalType,
      strength,
      confidence,
      source: source.name,
      sourceUrl: signalData.url,
      title: signalData.title || 'Untitled Signal',
      description: signalData.description || '',
      keywords: signalData.keywords || [],
      entities: signalData.entities || [],
      timestamp: signalData.timestamp ? new Date(signalData.timestamp) : new Date(),
      metadata: signalData.metadata
    }

    return BuyerSignalSchema.parse(signal)
  }

  private extractSignalData(rawSignal: unknown, source: SignalSource): any {
    // Source-specific data extraction with proper type handling
    const signal = rawSignal as any
    
    // Placeholder implementation - in reality, this would have complex
    // parsing logic for each source format
    return {
      title: signal?.title || signal?.headline,
      description: signal?.description || signal?.summary,
      url: signal?.url || signal?.link,
      timestamp: signal?.date || signal?.publishedAt,
      keywords: signal?.tags || signal?.categories,
      organizationId: this.extractOrganizationId(signal)
    }
  }

  private extractOrganizationId(rawSignal: unknown): string | undefined {
    // Extract organization identifier from signal with proper type handling
    const signal = rawSignal as any
    return signal?.organization?.id || signal?.company?.id
  }

  private classifySignalType(signalData: any): SignalType {
    const content = `${signalData.title} ${signalData.description}`.toLowerCase()
    
    // Technology stack signals
    if (this.matchesKeywords(content, ['react', 'aws', 'kubernetes', 'docker', 'microservices'])) {
      return SignalType.TECHNOLOGY_STACK
    }
    
    // Hiring signals
    if (this.matchesKeywords(content, ['hiring', 'job opening', 'we are looking', 'join our team'])) {
      return SignalType.HIRING_SIGNALS
    }
    
    // Funding events
    if (this.matchesKeywords(content, ['funding', 'investment', 'series a', 'series b', 'raise'])) {
      return SignalType.FUNDING_EVENTS
    }
    
    // Technical problems
    if (this.matchesKeywords(content, ['problem', 'issue', 'challenge', 'struggling', 'need help'])) {
      return SignalType.TECHNICAL_PROBLEMS
    }
    
    // Market expansion
    if (this.matchesKeywords(content, ['expanding', 'growth', 'new market', 'international'])) {
      return SignalType.MARKET_EXPANSION
    }
    
    // Default to search intent
    return SignalType.SEARCH_INTENT
  }

  private matchesKeywords(content: string, keywords: string[]): boolean {
    return keywords.some(keyword => content.includes(keyword.toLowerCase()))
  }

  private calculateSignalStrength(signalData: any, signalType: SignalType): SignalStrength {
    let score = 0
    
    // Base score from signal type
    const typeScores = {
      [SignalType.FUNDING_EVENTS]: 80,
      [SignalType.HIRING_SIGNALS]: 70,
      [SignalType.TECHNICAL_PROBLEMS]: 75,
      [SignalType.TECHNOLOGY_STACK]: 60,
      [SignalType.PROCUREMENT_BEHAVIOR]: 85,
      [SignalType.MARKET_EXPANSION]: 65,
      [SignalType.SEARCH_INTENT]: 40,
      [SignalType.CONTENT_CONSUMPTION]: 30,
      [SignalType.COMPETITIVE_DISPLACEMENT]: 70,
      [SignalType.COMPLIANCE_REQUIREMENTS]: 60
    }
    
    score += typeScores[signalType] || 40
    
    // Boost from keywords
    if (signalData.keywords && signalData.keywords.length > 0) {
      score += Math.min(signalData.keywords.length * 5, 20)
    }
    
    // Boost from entities
    if (signalData.entities && signalData.entities.length > 0) {
      score += Math.min(signalData.entities.length * 3, 15)
    }
    
    // Convert to SignalStrength
    if (score >= 85) return SignalStrength.CRITICAL
    if (score >= 70) return SignalStrength.STRONG
    if (score >= 55) return SignalStrength.MODERATE
    return SignalStrength.WEAK
  }

  private calculateConfidence(signalData: any, signalType: SignalType, strength: SignalStrength): SignalConfidence {
    let score = 50 // Base confidence
    
    // Source reliability
    score += 20 // Assuming source is somewhat reliable
    
    // Data completeness
    if (signalData.title) score += 10
    if (signalData.description) score += 10
    if (signalData.url) score += 5
    if (signalData.timestamp) score += 5
    
    // Signal strength correlation
    const strengthScores = {
      [SignalStrength.CRITICAL]: 20,
      [SignalStrength.STRONG]: 15,
      [SignalStrength.MODERATE]: 10,
      [SignalStrength.WEAK]: 5
    }
    
    score += strengthScores[strength]
    
    // Convert to SignalConfidence
    if (score >= 85) return SignalConfidence.VERY_HIGH
    if (score >= 70) return SignalConfidence.HIGH
    if (score >= 55) return SignalConfidence.MEDIUM
    return SignalConfidence.LOW
  }

  private getConfidenceScore(confidence: SignalConfidence): number {
    const scores = {
      [SignalConfidence.LOW]: 25,
      [SignalConfidence.MEDIUM]: 50,
      [SignalConfidence.HIGH]: 75,
      [SignalConfidence.VERY_HIGH]: 90
    }
    return scores[confidence]
  }

  private passesFilters(signal: BuyerSignal): boolean {
    return this.config.filters.every(filter => {
      const fieldValue = (signal as any)[filter.field]
      
      switch (filter.operator) {
        case 'contains':
          return typeof fieldValue === 'string' && 
                 fieldValue.toLowerCase().includes(filter.value.toString().toLowerCase())
        case 'equals':
          return fieldValue === filter.value
        case 'regex':
          return typeof fieldValue === 'string' && 
                 new RegExp(filter.value.toString()).test(fieldValue)
        case 'greater_than':
          return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue > filter.value
        case 'less_than':
          return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue < filter.value
        default:
          return true
      }
    })
  }

  private async enrichSignals(signals: BuyerSignal[]): Promise<BuyerSignal[]> {
    if (!this.config.enrichment) {
      return signals
    }

    const enrichedSignals: BuyerSignal[] = []

    for (const signal of signals) {
      let enrichedSignal = { ...signal }

      if (this.config.enrichment.entityExtraction) {
        enrichedSignal = await this.enrichWithEntities(enrichedSignal)
      }

      if (this.config.enrichment.sentimentAnalysis) {
        enrichedSignal = await this.enrichWithSentiment(enrichedSignal)
      }

      if (this.config.enrichment.technographic) {
        enrichedSignal = await this.enrichWithTechnographic(enrichedSignal)
      }

      if (this.config.enrichment.firmographic) {
        enrichedSignal = await this.enrichWithFirmographic(enrichedSignal)
      }

      enrichedSignals.push(enrichedSignal)
    }

    return enrichedSignals
  }

  private async enrichWithEntities(signal: BuyerSignal): Promise<BuyerSignal> {
    // Entity extraction implementation
    // This would use NLP services to extract companies, people, technologies
    
    // Placeholder implementation
    return signal
  }

  private async enrichWithSentiment(signal: BuyerSignal): Promise<BuyerSignal> {
    // Sentiment analysis implementation
    // This would analyze the emotional tone of the signal
    
    // Placeholder implementation
    return signal
  }

  private async enrichWithTechnographic(signal: BuyerSignal): Promise<BuyerSignal> {
    // Technographic enrichment
    // This would add technology stack information
    
    // Placeholder implementation
    return signal
  }

  private async enrichWithFirmographic(signal: BuyerSignal): Promise<BuyerSignal> {
    // Firmographic enrichment
    // This would add company size, industry, revenue information
    
    // Placeholder implementation
    return signal
  }

  private async storeSignals(signals: BuyerSignal[]): Promise<void> {
    // Store signals in database
    // This would use Prisma to store the signals
    
    for (const signal of signals) {
      try {
        // Store signal in database
        logger.debug(`Storing signal: ${signal.id}`)
        
        // Placeholder for database storage
        // await prisma.buyerSignal.create({ data: signal })
        
      } catch (error) {
        const classifiedError = classifyError(error)
        logError(classifiedError, { 
          context: 'SignalHarvestingEngine.storeSignals',
          signalId: signal.id 
        })
      }
    }
  }

  private generateSignalId(signalData: any): string {
    const content = `${signalData.title || ''}${signalData.description || ''}${signalData.url || ''}`
    return createHash('sha256').update(content).digest('hex').substring(0, 16)
  }

  // Public API Methods
  async getSignalsByOrganization(organizationId: string, filters?: {
    signalType?: SignalType
    strength?: SignalStrength
    confidence?: SignalConfidence
    startDate?: Date
    endDate?: Date
  }): Promise<BuyerSignal[]> {
    // Retrieve signals for an organization with optional filters
    // This would query the database
    
    // Placeholder implementation
    return []
  }

  async getSignalById(signalId: string): Promise<BuyerSignal | null> {
    // Retrieve a specific signal by ID
    // This would query the database
    
    // Placeholder implementation
    return null
  }

  async updateSignal(signalId: string, updates: Partial<BuyerSignal>): Promise<BuyerSignal> {
    // Update a signal
    // This would update the database
    
    // Placeholder implementation
    throw new Error('Not implemented')
  }

  async deleteSignal(signalId: string): Promise<void> {
    // Delete a signal
    // This would delete from the database
    
    // Placeholder implementation
    throw new Error('Not implemented')
  }

  getEngineStatus(): {
    isRunning: boolean
    activeSources: number
    totalSources: number
    lastHarvestTime?: Date
  } {
    return {
      isRunning: this.isRunning,
      activeSources: this.harvestIntervals.size,
      totalSources: this.config.sources.length,
      lastHarvestTime: new Date() // Placeholder
    }
  }
}

// Factory function for creating configured engines
export function createSignalHarvestingEngine(config?: Partial<HarvestingConfig>): SignalHarvestingEngine {
  const defaultConfig: HarvestingConfig = {
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
      minimum: 30,
      strong: 70,
      critical: 85
    }
  }

  const finalConfig = { ...defaultConfig, ...config }
  return new SignalHarvestingEngine(finalConfig)
}

// Export default configuration
export const DEFAULT_HARVESTING_CONFIG: HarvestingConfig = {
  sources: [
    {
      id: 'tech-crunch',
      name: 'TechCrunch RSS Feed',
      type: 'feed',
      endpoint: 'https://techcrunch.com/feed/',
      frequency: 60,
      enabled: true,
      priority: 1
    },
    {
      id: 'hiring-api',
      name: 'Hiring Board API',
      type: 'api',
      endpoint: 'https://api.hiringboard.com/v1/jobs',
      frequency: 30,
      enabled: true,
      priority: 2,
      credentials: {
        apiKey: process.env.HIRING_API_KEY
      }
    }
  ],
  filters: [
    {
      field: 'description',
      operator: 'contains',
      value: 'enterprise',
      weight: 1.5
    },
    {
      field: 'confidence',
      operator: 'greater_than',
      value: 50,
      weight: 1.0
    }
  ],
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
}
