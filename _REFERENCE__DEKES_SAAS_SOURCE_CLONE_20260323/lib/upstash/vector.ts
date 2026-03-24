import { Index } from '@upstash/vector'

let vectorIndex: Index | null = null

export function getVectorIndex() {
  if (!vectorIndex) {
    const url = process.env.UPSTASH_VECTOR_REST_URL
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN

    if (!url || !token) {
      throw new Error('Missing Upstash Vector configuration: UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required')
    }

    vectorIndex = new Index({
      url,
      token,
    })
  }

  return vectorIndex
}

// Vector utilities for lead operations
export class VectorService {
  private _index: Index | null = null
  private _openaiApiKey: string | null = null

  private get index(): Index {
    if (!this._index) {
      this._index = getVectorIndex()
    }
    return this._index
  }

  private get openaiApiKey(): string {
    if (!this._openaiApiKey) {
      const key = process.env.OPENAI_API_KEY
      if (!key) throw new Error('Missing OPENAI_API_KEY for embeddings')
      this._openaiApiKey = key
    }
    return this._openaiApiKey
  }

  // Generate embeddings using OpenAI text-embedding-3-small
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI embedding failed: ${error}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }

  // Create combined text for embedding
  private createEmbeddingText(lead: any): string {
    const parts = [
      lead.title || '',
      lead.snippet || '',
      lead.company || '',
      lead.name || '',
      lead.sourceUrl || '',
      // Add enrichment data if available
      lead.meta?.companySize || '',
      lead.meta?.industry || '',
      lead.meta?.techStack?.join(' ') || '',
      lead.meta?.funding || '',
    ].filter(Boolean)

    return parts.join(' ').trim()
  }

  // Index a lead for deduplication and similarity search
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
    const text = this.createEmbeddingText(lead)
    const embedding = await this.generateEmbedding(text)

    const leadData = {
      leadId: lead.id,
      title: lead.title,
      company: lead.company,
      score: lead.score || 0,
      createdAt: new Date().toISOString(),
    }

    await this.index.upsert({
      id: `lead:${lead.id}`,
      data: JSON.stringify(leadData),
      vector: embedding,
      metadata: {
        type: 'lead',
        namespace: 'leads',
        company: lead.company || 'unknown',
        title: lead.title,
      },
    })
  }

  // Check for duplicates using similarity
  async findDuplicates(lead: {
    id: string
    title: string
    snippet: string
    company?: string
    name?: string
    sourceUrl?: string
    meta?: any
  }, threshold: number = 0.95): Promise<Array<{ id: string; score: number; data: any }>> {
    const text = this.createEmbeddingText(lead)
    const embedding = await this.generateEmbedding(text)

    // Search for similar leads, excluding the current lead
    const results = await this.index.query({
      vector: embedding,
      topK: 10,
      includeMetadata: true,
      includeData: true,
      filter: `type = 'lead' AND namespace = 'leads' AND id != 'lead:${lead.id}'`,
    })

    // Filter by similarity threshold and parse results
    const filteredResults: Array<{ id: string; score: number; data: any }> = []
    
    for (const result of results) {
      if (result.score >= threshold) {
        const parsedData = result.data ? JSON.parse(result.data as string) : null
        filteredResults.push({
          id: result.id.toString(),
          score: result.score,
          data: parsedData,
        })
      }
    }

    return filteredResults
  }

  // Find similar leads/companies for "looks like past winner" logic
  async findSimilarLeads(
    queryLead: {
      title: string
      company?: string
      meta?: any
    },
    limit: number = 5
  ): Promise<Array<{ id: string; score: number; data: any }>> {
    const text = this.createEmbeddingText(queryLead)
    const embedding = await this.generateEmbedding(text)

    const results = await this.index.query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
      includeData: true,
      filter: `type = 'lead' AND namespace = 'leads'`,
    })

    const similarResults: Array<{ id: string; score: number; data: any }> = []
    
    for (const result of results) {
      const parsedData = result.data ? JSON.parse(result.data as string) : null
      similarResults.push({
        id: result.id.toString(),
        score: result.score,
        data: parsedData,
      })
    }

    return similarResults
  }

  // Semantic search for dashboard
  async semanticSearch(
    query: string,
    limit: number = 10,
    filters?: {
      company?: string
      minScore?: number
    }
  ): Promise<Array<{ id: string; score: number; data: any }>> {
    const embedding = await this.generateEmbedding(query)

    let filter = `type = 'lead' AND namespace = 'leads'`
    
    if (filters?.company) {
      filter += ` AND company = '${filters.company}'`
    }

    const results = await this.index.query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
      includeData: true,
      filter,
    })

    let filteredResults: Array<{ id: string; score: number; data: any }> = []
    
    for (const result of results) {
      const parsedData = result.data ? JSON.parse(result.data as string) : null
      
      // Apply minScore filter if specified
      if (filters?.minScore && parsedData?.score < filters.minScore) {
        continue
      }
      
      filteredResults.push({
        id: result.id.toString(),
        score: result.score,
        data: parsedData,
      })
    }

    return filteredResults
  }

  // Delete a lead from the index
  async deleteLead(leadId: string): Promise<void> {
    await this.index.delete(`lead:${leadId}`)
  }

  // Batch index multiple leads
  async indexLeads(leads: any[]): Promise<void> {
    const embeddings = await Promise.all(
      leads.map(lead => this.generateEmbedding(this.createEmbeddingText(lead)))
    )

    const vectors = leads.map((lead, index) => {
      const leadData = {
        leadId: lead.id,
        title: lead.title,
        company: lead.company,
        score: lead.score || 0,
        createdAt: new Date().toISOString(),
      }

      return {
        id: `lead:${lead.id}`,
        data: JSON.stringify(leadData),
        vector: embeddings[index],
        metadata: {
          type: 'lead',
          namespace: 'leads',
          company: lead.company || 'unknown',
          title: lead.title,
        },
      }
    })

    await this.index.upsert(vectors)
  }
}

export const vectorService = new VectorService()
