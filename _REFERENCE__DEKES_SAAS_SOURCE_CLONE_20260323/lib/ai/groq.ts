import Groq from 'groq-sdk'

let _groq: Groq | null = null
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

export type IntentClassification = {
  intentClass: 'HIGH_INTENT' | 'MEDIUM_INTENT' | 'LOW_INTENT'
  confidence: number
  buyerType: 'B2B_SaaS' | 'B2B_ECOMMERCE' | 'B2B_ENTERPRISE' | 'UNKNOWN'
  urgencySignals: {
    immediate: boolean
    timeline: string
    budgetIndicators: string[]
  }
  painPoints: string[]
  serviceFit: number
}

export async function classifyLeadIntent(
  title: string,
  snippet: string,
  url: string
): Promise<IntentClassification> {
  const model = process.env.GROQ_MODEL_SMART || 'llama3-70b-8192'
  
  const prompt = `Analyze this lead for B2B SaaS intent:

Title: ${title}
Description: ${snippet}
URL: ${url}

Respond with JSON only:
{
  "intentClass": "HIGH_INTENT|MEDIUM_INTENT|LOW_INTENT",
  "confidence": 0.0-1.0,
  "buyerType": "B2B_SaaS|B2B_ECOMMERCE|B2B_ENTERPRISE|UNKNOWN",
  "urgencySignals": {
    "immediate": true/false,
    "timeline": "immediate|weeks|months|unknown",
    "budgetIndicators": ["string"]
  },
  "painPoints": ["string"],
  "serviceFit": 0.0-1.0
}`

  try {
    const response = await getGroq().chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from Groq')
    }

    return JSON.parse(content) as IntentClassification
  } catch (error) {
    console.error('Groq intent classification failed:', error)
    
    // Fallback classification
    return {
      intentClass: 'MEDIUM_INTENT',
      confidence: 0.5,
      buyerType: 'B2B_SaaS',
      urgencySignals: {
        immediate: false,
        timeline: 'unknown',
        budgetIndicators: [],
      },
      painPoints: [],
      serviceFit: 0.5,
    }
  }
}

export async function generateLeadInsights(
  leads: Array<{ title: string; snippet: string; url: string }>
): Promise<{
  marketSignals: string[]
  competitorMentions: string[]
  trendingTopics: string[]
  recommendedActions: string[]
}> {
  const model = process.env.GROQ_MODEL_FAST || 'mixtral-8x7b-32768'
  
  const leadsText = leads.map((lead, i) => 
    `${i + 1}. ${lead.title} - ${lead.snippet}`
  ).join('\n')

  const prompt = `Analyze these leads for market intelligence:

${leadsText}

Respond with JSON only:
{
  "marketSignals": ["string"],
  "competitorMentions": ["string"],
  "trendingTopics": ["string"],
  "recommendedActions": ["string"]
}`

  try {
    const response = await getGroq().chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from Groq')
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Groq insights generation failed:', error)
    
    // Fallback insights
    return {
      marketSignals: [],
      competitorMentions: [],
      trendingTopics: [],
      recommendedActions: [],
    }
  }
}
