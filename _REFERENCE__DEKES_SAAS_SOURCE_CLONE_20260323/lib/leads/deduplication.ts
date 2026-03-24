import { prisma } from '@/lib/db'
import { vectorService } from '@/lib/upstash/vector'
import { redisCache } from '@/lib/upstash/redis'

export class LeadDeduplicationService {
  private static instance: LeadDeduplicationService

  static getInstance(): LeadDeduplicationService {
    if (!LeadDeduplicationService.instance) {
      LeadDeduplicationService.instance = new LeadDeduplicationService()
    }
    return LeadDeduplicationService.instance
  }

  // Check for duplicates using vector similarity
  async checkForDuplicates(lead: {
    id?: string
    title: string
    snippet: string
    company?: string
    name?: string
    sourceUrl?: string
    meta?: any
  }, threshold: number = 0.95): Promise<{
    isDuplicate: boolean
    duplicates: Array<{
      id: string
      score: number
      lead: any
    }>
  }> {
    try {
      // Search for similar leads in vector database
      const similarLeads = await vectorService.findDuplicates({ ...lead, id: lead.id ?? '' }, threshold)

      if (similarLeads.length === 0) {
        return { isDuplicate: false, duplicates: [] }
      }

      // Get full lead data from database
      const leadIds = similarLeads.map(s => s.data?.leadId).filter(Boolean)
      
      if (leadIds.length === 0) {
        return { isDuplicate: false, duplicates: [] }
      }

      const dbLeads = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
        include: {
          organization: true,
          query: true,
          run: true,
        },
      })

      // Combine vector results with database data
      const duplicates = similarLeads
        .filter(similar => similar.data?.leadId && dbLeads.find(l => l.id === similar.data.leadId))
        .map(similar => {
          const dbLead = dbLeads.find(l => l.id === similar.data.leadId)
          return {
            id: similar.id.replace('lead:', ''),
            score: similar.score,
            lead: dbLead,
          }
        })
        .filter(d => d.lead)

      return {
        isDuplicate: duplicates.length > 0,
        duplicates,
      }

    } catch (error) {
      console.error('Error checking for duplicates:', error)
      return { isDuplicate: false, duplicates: [] }
    }
  }

  // Find similar leads for "looks like past winner" logic
  async findSimilarToWinners(
    queryLead: {
      title: string
      company?: string
      meta?: any
    },
    limit: number = 5
  ): Promise<Array<{
    id: string
    score: number
    lead: any
    similarityReason: string
  }>> {
    try {
      const similarLeads = await vectorService.findSimilarLeads(queryLead, limit)

      if (similarLeads.length === 0) {
        return []
      }

      // Get full lead data
      const leadIds = similarLeads.map(s => s.data?.leadId).filter(Boolean)
      
      if (leadIds.length === 0) {
        return []
      }

      const dbLeads = await prisma.lead.findMany({
        where: { 
          id: { in: leadIds },
          status: 'WON' // Only look at past winners
        },
        include: {
          organization: true,
          query: true,
          run: true,
        },
      })

      const results = similarLeads
        .filter(similar => similar.data?.leadId && dbLeads.find(l => l.id === similar.data.leadId))
        .map(similar => {
          const dbLead = dbLeads.find(l => l.id === similar.data.leadId)
          return {
            id: similar.id.replace('lead:', ''),
            score: similar.score,
            lead: dbLead,
            similarityReason: this.generateSimilarityReason(queryLead, dbLead),
          }
        })
        .filter(d => d.lead)

      return results

    } catch (error) {
      console.error('Error finding similar winners:', error)
      return []
    }
  }

  // Semantic search for leads
  async semanticSearch(
    query: string,
    organizationId?: string,
    filters?: {
      company?: string
      minScore?: number
      status?: string
      limit?: number
    }
  ): Promise<Array<{
    id: string
    score: number
    lead: any
    semanticScore: number
  }>> {
    try {
      const limit = filters?.limit || 20
      const vectorResults = await vectorService.semanticSearch(query, limit, {
        company: filters?.company,
        minScore: filters?.minScore,
      })

      if (vectorResults.length === 0) {
        return []
      }

      // Get lead IDs from vector results
      const leadIds = vectorResults
        .map(r => r.data?.leadId)
        .filter(Boolean)

      if (leadIds.length === 0) {
        return []
      }

      // Build database query
      const whereClause: any = { id: { in: leadIds } }
      
      if (organizationId) {
        whereClause.organizationId = organizationId
      }
      
      if (filters?.status) {
        whereClause.status = filters.status
      }

      const dbLeads = await prisma.lead.findMany({
        where: whereClause,
        include: {
          organization: true,
          query: true,
          run: true,
        },
        orderBy: { score: 'desc' },
      })

      // Combine results
      const results = vectorResults
        .filter(vector => vector.data?.leadId && dbLeads.find(l => l.id === vector.data.leadId))
        .map(vector => {
          const dbLead = dbLeads.find(l => l.id === vector.data.leadId)
          return {
            id: vector.id.replace('lead:', ''),
            score: dbLead?.score || 0,
            lead: dbLead,
            semanticScore: vector.score,
          }
        })
        .filter(r => r.lead)

      return results

    } catch (error) {
      console.error('Error in semantic search:', error)
      return []
    }
  }

  // Index a lead for deduplication
  async indexLead(lead: {
    id: string
    title: string
    snippet: string
    company?: string
    name?: string
    sourceUrl?: string
    score?: number
    meta?: any
  }): Promise<void> {
    try {
      await vectorService.indexLead(lead)
      
      // Cache indexing status
      await redisCache.set(`lead_indexed:${lead.id}`, true, 86400) // 24 hours
      
    } catch (error) {
      console.error(`Error indexing lead ${lead.id}:`, error)
      throw error
    }
  }

  // Remove lead from index
  async removeLead(leadId: string): Promise<void> {
    try {
      await vectorService.deleteLead(leadId)
      await redisCache.del(`lead_indexed:${leadId}`)
      
    } catch (error) {
      console.error(`Error removing lead ${leadId} from index:`, error)
      throw error
    }
  }

  // Batch index multiple leads
  async indexLeads(leads: any[]): Promise<void> {
    try {
      await vectorService.indexLeads(leads)
      
      // Cache indexing status for all leads
      const promises = leads.map(lead => 
        redisCache.set(`lead_indexed:${lead.id}`, true, 86400)
      )
      await Promise.all(promises)
      
    } catch (error) {
      console.error('Error batch indexing leads:', error)
      throw error
    }
  }

  // Check if lead is indexed
  async isLeadIndexed(leadId: string): Promise<boolean> {
    return await redisCache.exists(`lead_indexed:${leadId}`)
  }

  // Generate similarity reason for UI
  private generateSimilarityReason(queryLead: any, similarLead: any): string {
    const reasons = []

    if (queryLead.company && similarLead.company === queryLead.company) {
      reasons.push('same company')
    }

    if (queryLead.title && similarLead.title) {
      const queryTitle = queryLead.title.toLowerCase()
      const similarTitle = similarLead.title.toLowerCase()
      
      if (queryTitle.includes(similarTitle) || similarTitle.includes(queryTitle)) {
        reasons.push('similar title')
      }
    }

    if (similarLead.status === 'WON') {
      reasons.push('past winner')
    }

    if (similarLead.score >= 85) {
      reasons.push('high score')
    }

    return reasons.length > 0 ? reasons.join(', ') : 'similar content'
  }

  // Get deduplication statistics
  async getDeduplicationStats(organizationId?: string): Promise<{
    totalIndexed: number
    duplicatesFound: number
    similarityThreshold: number
    lastIndexed: string | null
  }> {
    try {
      const baseFilter = organizationId ? { organizationId } : {}
      
      const [totalLeads, recentDuplicates] = await Promise.all([
        prisma.lead.count({ where: baseFilter }),
        prisma.lead.count({ 
          where: { 
            ...baseFilter,
            isDuplicate: true,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }),
      ])

      const lastIndexedLead = await prisma.lead.findFirst({
        where: baseFilter,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })

      return {
        totalIndexed: totalLeads,
        duplicatesFound: recentDuplicates,
        similarityThreshold: 0.95, // Default threshold
        lastIndexed: lastIndexedLead?.createdAt?.toISOString() || null,
      }

    } catch (error) {
      console.error('Error getting deduplication stats:', error)
      return {
        totalIndexed: 0,
        duplicatesFound: 0,
        similarityThreshold: 0.95,
        lastIndexed: null,
      }
    }
  }
}

export const leadDeduplication = LeadDeduplicationService.getInstance()
