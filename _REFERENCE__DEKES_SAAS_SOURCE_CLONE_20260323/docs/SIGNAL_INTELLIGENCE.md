# DEKES Signal Intelligence System

## Overview

The DEKES Signal Intelligence System is a comprehensive buyer-intent detection and validation platform that integrates with the ECOBE carbon-aware decision infrastructure. It addresses the core challenge of false buyer signals by implementing an evidence-based pipeline with multi-layer validation.

## Architecture

### Core Components

1. **Signal Harvesting Engine** - Detects and collects potential buyer signals from multiple sources
2. **Evidence Engine** - Validates signals through multiple evidence sources and risk assessment
3. **DEKES-ECOBE Integration** - Connects validated buyer intent with carbon-aware execution optimization

### System Flow

```
Signal Sources → Harvesting Engine → Evidence Engine → Validation → ECOBE Integration → Carbon-Optimized Execution
```

## Signal Harvesting Engine

### Purpose

Identifies potential buyer-intent signals from various data sources with configurable confidence thresholds.

### Signal Types

- **SEARCH_INTENT** - General search behavior indicating interest
- **TECHNOLOGY_STACK** - Technology adoption signals
- **HIRING_SIGNALS** - Recruitment and hiring activities
- **FUNDING_EVENTS** - Investment and funding activities
- **PROCUREMENT_BEHAVIOR** - Purchasing and procurement signals
- **CONTENT_CONSUMPTION** - Content engagement patterns
- **TECHNICAL_PROBLEMS** - Technical challenges and pain points
- **COMPETITIVE_DISPLACEMENT** - Competitive migration signals
- **MARKET_EXPANSION** - Growth and expansion activities
- **COMPLIANCE_REQUIREMENTS** - Regulatory and compliance drivers

### Signal Strength Levels

- **WEAK** - Low confidence, limited evidence
- **MODERATE** - Medium confidence, some supporting data
- **STRONG** - High confidence, multiple indicators
- **CRITICAL** - Very high confidence, conclusive evidence

### Configuration

```typescript
const harvestingConfig = {
  sources: [
    {
      id: 'tech-crunch',
      name: 'TechCrunch RSS Feed',
      type: 'feed',
      endpoint: 'https://techcrunch.com/feed/',
      frequency: 60, // minutes
      enabled: true,
      priority: 1
    }
  ],
  filters: [
    {
      field: 'description',
      operator: 'contains',
      value: 'enterprise',
      weight: 1.5
    }
  ],
  thresholds: {
    minimum: 30,
    strong: 70,
    critical: 85
  }
}
```

## Evidence Engine

### Purpose

Validates buyer signals through multiple evidence sources to reduce false positives and ensure high-confidence leads.

### Evidence Types

- **DOMAIN_VERIFICATION** - Confirms domain existence and activity
- **COMPANY_EXISTS** - Validates company registration and presence
- **TECHNOLOGY_CONFIRMATION** - Verifies technology stack usage
- **HIRING_VERIFICATION** - Confirms hiring activities
- **FUNDING_CONFIRMATION** - Validates funding announcements
- **NEWS_CORROBORATION** - Cross-references with news sources
- **SOCIAL_MEDIA_ACTIVITY** - Analyzes social media presence
- **TECHNICAL_INDICATORS** - Identifies technical infrastructure
- **MARKET_PRESENCE** - Assesses market visibility
- **RELATIONSHIP_MAPPING** - Maps business relationships

### Evidence Strength

- **WEAK** - Low confidence evidence
- **MODERATE** - Medium confidence evidence
- **STRONG** - High confidence evidence
- **CONCLUSIVE** - Definitive evidence

### Validation Process

1. **Evidence Collection** - Gather evidence from multiple sources
2. **Evidence Analysis** - Analyze supporting vs contradicting evidence
3. **Risk Assessment** - Identify potential risk factors
4. **Confidence Scoring** - Calculate overall confidence score
5. **Verification Status** - Determine final verification status

### Risk Factors

- **NO_EVIDENCE** - No supporting evidence found
- **LOW_CONFIDENCE_EVIDENCE** - Most evidence has low confidence
- **CONTRADICTORY_EVIDENCE** - Evidence contradicts the signal
- **LOW_SIGNAL_CONFIDENCE** - Original signal has low confidence
- **WEAK_SIGNAL_STRENGTH** - Original signal is weak

## DEKES-ECOBE Integration

### Purpose

Connects validated buyer-intent signals with ECOBE's carbon-aware decision infrastructure to optimize execution for minimal environmental impact.

### Integration Flow

1. **Signal Processing** - Process and validate buyer signals
2. **Workload Creation** - Create buyer-intent workloads
3. **Carbon Budgeting** - Calculate appropriate carbon budgets
4. **ECOBE Optimization** - Request optimal execution regions/times
5. **Execution Planning** - Generate carbon-optimized execution plans
6. **Plan Execution** - Execute plans and report actual carbon usage

### Carbon Optimization Features

- **Region Selection** - Choose regions with lowest carbon intensity
- **Time Scheduling** - Schedule execution during low-carbon periods
- **Budget Management** - Allocate carbon budgets based on signal confidence
- **Usage Reporting** - Report actual carbon usage back to ECOBE

### Configuration

```typescript
const integrationConfig = {
  ecobe: {
    baseUrl: 'https://api.ecobe.dev',
    apiKey: process.env.ECOBE_API_KEY,
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
    windowSize: 24, // hours
    maxBatchSize: 10,
    optimizationInterval: 15 // minutes
  }
}
```

## Database Schema

### Core Models

- **BuyerSignal** - Raw signals detected by harvesting engine
- **SignalEntity** - Extracted entities (companies, technologies, people)
- **Evidence** - Supporting or contradicting evidence
- **ValidationResult** - Results of evidence-based validation
- **BuyerIntentWorkload** - Workloads for processing buyer intent
- **ExecutionPlan** - Carbon-optimized execution plans
- **IntegrationResult** - Results from DEKES-ECOBE integration
- **CarbonMetric** - Carbon optimization metrics

### Relationships

```
Organization (1:N) BuyerSignal
BuyerSignal (1:N) SignalEntity
BuyerSignal (1:N) Evidence
BuyerSignal (1:N) ValidationResult
Organization (1:N) BuyerIntentWorkload
BuyerIntentWorkload (1:1) ExecutionPlan
BuyerIntentWorkload (1:1) IntegrationResult
```

## API Reference

### Base Endpoint: `/api/signals`

#### GET /api/signals/status

Get the status of all signal intelligence engines.

**Query Parameters:**
- `endpoint` - Specific engine status (`integration`, `harvesting`, `evidence`, `metrics`)

**Response:**
```json
{
  "integration": {
    "isRunning": true,
    "signalEngineStatus": {...},
    "evidenceEngineStatus": {...},
    "schedulingActive": true,
    "processedWorkloads": 150,
    "carbonSavings": 1250.5
  },
  "harvesting": {
    "isRunning": true,
    "activeSources": 5,
    "totalSources": 8,
    "lastHarvestTime": "2026-03-21T10:00:00Z"
  },
  "evidence": {
    "activeSources": 3,
    "totalSources": 4,
    "rateLimitersActive": 3
  }
}
```

#### POST /api/signals/workloads

Create and process buyer intent workloads.

**Action Parameters:**
- `action=create` - Create new workload
- `action=process` - Process existing workload
- `action=validate` - Validate individual signal
- `action=harvest` - Trigger signal harvesting

**Create Workload Request:**
```json
{
  "organizationId": "org_123",
  "query": "enterprise software companies using microservices",
  "estimatedResults": 200,
  "preferredRegions": ["us-east-1", "eu-west-1"],
  "priority": "high",
  "carbonBudget": 100
}
```

**Process Workload Request:**
```json
{
  "workloadId": "workload_123",
  "organizationId": "org_123",
  "query": "enterprise software companies",
  "estimatedResults": 200,
  "signals": [
    {
      "signalId": "signal_123",
      "signalType": "TECHNOLOGY_STACK",
      "strength": "STRONG",
      "confidence": "HIGH",
      "source": "techcrunch",
      "title": "Company adopts Kubernetes",
      "description": "Enterprise company migrating to microservices",
      "keywords": ["kubernetes", "docker", "microservices"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "workloadId": "workload_123",
    "status": "success",
    "signalsProcessed": 5,
    "carbonOptimized": true,
    "executionPlan": {
      "selectedRegion": "eu-west-1",
      "selectedTime": "2026-03-21T14:00:00Z",
      "estimatedCarbon": 18.5,
      "carbonSavings": 31.5,
      "confidence": 85.2,
      "reasoning": [
        "Based on 5 validated buyer signals",
        "3 high-confidence signals detected",
        "Estimated carbon usage: 18.5 gCO2",
        "Selected region eu-west-1 for optimal carbon efficiency"
      ]
    }
  }
}
```

#### GET /api/signals/workloads/[id]

Get details of a specific workload.

#### GET /api/signals/evidence/[signalId]

Get all evidence for a specific signal.

#### GET /api/signals/analytics

Get analytics and metrics.

**Query Parameters:**
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `organizationId` - Filter by organization

## Usage Examples

### Basic Signal Processing

```typescript
import { createDekesEcobeIntegration } from '@/lib/signals'

const integration = createDekesEcobeIntegration()

// Start the integration
await integration.start()

// Create a workload
const workload = await integration.createBuyerIntentWorkload({
  organizationId: 'org_123',
  query: 'companies adopting AI technologies',
  estimatedResults: 150,
  preferredRegions: ['us-east-1', 'eu-west-1'],
  priority: 'medium'
})

// Add signals to workload
workload.signals = [
  {
    id: 'signal_1',
    organizationId: 'org_123',
    signalType: 'TECHNOLOGY_STACK',
    strength: 'STRONG',
    confidence: 'HIGH',
    source: 'tech-news',
    title: 'Company implements AI solution',
    description: 'Enterprise adopts machine learning platform',
    keywords: ['ai', 'machine-learning', 'enterprise'],
    entities: [
      { type: 'technology', name: 'Machine Learning', confidence: 0.9 },
      { type: 'company', name: 'TechCorp', confidence: 0.8 }
    ],
    timestamp: new Date()
  }
]

// Process the workload
const result = await integration.processBuyerIntent(workload)

console.log(`Carbon optimized: ${result.carbonOptimized}`)
console.log(`Selected region: ${result.executionPlan?.selectedRegion}`)
console.log(`Carbon savings: ${result.executionPlan?.carbonSavings} gCO2`)
```

### Direct Signal Validation

```typescript
import { createEvidenceEngine } from '@/lib/signals'

const evidenceEngine = createEvidenceEngine()

const signal = {
  id: 'signal_123',
  organizationId: 'org_123',
  signalType: 'HIRING_SIGNALS',
  strength: 'STRONG',
  confidence: 'HIGH',
  source: 'linkedin',
  title: 'Company hiring React developers',
  description: 'Looking for experienced React engineers',
  keywords: ['react', 'hiring', 'developers'],
  timestamp: new Date()
}

const validationResult = await evidenceEngine.validateSignal(signal)

console.log(`Verification status: ${validationResult.verificationStatus}`)
console.log(`Confidence score: ${validationResult.confidenceScore}`)
console.log(`Evidence count: ${validationResult.evidenceCount}`)
```

### Signal Harvesting

```typescript
import { createSignalHarvestingEngine } from '@/lib/signals'

const harvestingEngine = createSignalHarvestingEngine({
  sources: [
    {
      id: 'crunchbase',
      name: 'Crunchbase Funding API',
      type: 'api',
      endpoint: 'https://api.crunchbase.com/v4/funding-rounds',
      frequency: 30,
      enabled: true,
      credentials: {
        apiKey: process.env.CRUNCHBASE_API_KEY
      }
    }
  ]
})

await harvestingEngine.startHarvesting()

// Get engine status
const status = harvestingEngine.getEngineStatus()
console.log(`Active sources: ${status.activeSources}`)
console.log(`Is running: ${status.isRunning}`)
```

## Configuration

### Environment Variables

```env
# ECOBE Integration
ECOBE_BASE_URL=https://api.ecobe.dev
ECOBE_API_KEY=your_ecobe_api_key

# Signal Sources
CRUNCHBASE_API_KEY=your_crunchbase_key
LINKEDIN_API_KEY=your_linkedin_key
TECHSTACK_API_KEY=your_techstack_key

# Database
DATABASE_URL=postgresql://...
SHADOW_DATABASE_URL=postgresql://...

# Logging
LOG_LEVEL=info
```

### Signal Source Configuration

```typescript
const signalSources = [
  {
    id: 'crunchbase-funding',
    name: 'Crunchbase Funding Rounds',
    type: 'api',
    endpoint: 'https://api.crunchbase.com/v4/funding-rounds',
    frequency: 60,
    enabled: true,
    priority: 1,
    credentials: {
      apiKey: process.env.CRUNCHBASE_API_KEY
    },
    rateLimit: {
      requests: 1000,
      window: 3600
    }
  },
  {
    id: 'linkedin-jobs',
    name: 'LinkedIn Job Postings',
    type: 'api',
    endpoint: 'https://api.linkedin.com/v2/jobPostings',
    frequency: 30,
    enabled: true,
    priority: 2,
    credentials: {
      apiKey: process.env.LINKEDIN_API_KEY
    }
  },
  {
    id: 'techcrunch-feed',
    name: 'TechCrunch RSS Feed',
    type: 'feed',
    endpoint: 'https://techcrunch.com/feed/',
    frequency: 120,
    enabled: true,
    priority: 3
  }
]
```

## Performance Considerations

### Rate Limiting

- All external API calls are rate-limited
- Configurable per-source rate limits
- Automatic backoff on rate limit exceeded

### Batching

- Signal validation is processed in batches
- Configurable batch sizes (default: 10 signals)
- Parallel processing with rate limiting

### Caching

- Evidence results are cached to reduce API calls
- Domain verification results cached for 24 hours
- Company data cached for 7 days

### Scaling

- Horizontal scaling through multiple instances
- Database connection pooling
- Redis for distributed caching

## Monitoring and Analytics

### Key Metrics

- **Signal Harvesting Rate** - Signals collected per hour
- **Validation Success Rate** - Percentage of signals verified
- **False Positive Rate** - Percentage of rejected signals
- **Carbon Savings** - Total CO2 savings in grams
- **Processing Latency** - Time from signal to validation

### Alerts

- High error rates in signal sources
- Low validation success rates
- ECOBE integration failures
- Rate limit exceeded

### Dashboards

- Real-time signal harvesting status
- Evidence validation metrics
- Carbon optimization analytics
- System health monitoring

## Security Considerations

### API Keys

- All API keys stored in environment variables
- Encrypted storage in database
- Regular key rotation

### Data Privacy

- PII detection and redaction
- GDPR compliance
- Data retention policies

### Access Control

- Organization-based data isolation
- Role-based access control
- API rate limiting per organization

## Troubleshooting

### Common Issues

1. **Low Signal Quality**
   - Check source configurations
   - Verify confidence thresholds
   - Review filter settings

2. **High False Positive Rate**
   - Increase evidence requirements
   - Adjust risk thresholds
   - Add more evidence sources

3. **ECOBE Integration Failures**
   - Verify API credentials
   - Check network connectivity
   - Review timeout settings

4. **Performance Issues**
   - Monitor database query performance
   - Check rate limiting settings
   - Review caching configuration

### Debug Mode

```typescript
const integration = createDekesEcobeIntegration({
  ecobe: {
    baseUrl: 'https://api.ecobe.dev',
    apiKey: process.env.ECOBE_API_KEY,
    timeout: 30000,
    retryAttempts: 3
  },
  debug: true // Enable detailed logging
})
```

## Future Enhancements

### Phase 2 Features

- **Machine Learning Models** - Advanced signal classification
- **Real-time Streaming** - WebSocket-based signal processing
- **Advanced Analytics** - Predictive analytics and trend detection
- **Multi-language Support** - International signal sources

### Phase 3 Features

- **Autonomous Operation** - Self-optimizing configurations
- **Integration Marketplace** - Third-party integrations
- **Advanced Security** - Zero-trust architecture
- **Global Deployment** - Multi-region deployment

## Support

- **Documentation**: https://docs.dekes.com
- **API Reference**: https://api.dekes.com/docs
- **Support Email**: support@dekes.com
- **Community Forum**: https://community.dekes.com

---

**Built for intelligent buyer-intent detection with environmental responsibility** 🌱
