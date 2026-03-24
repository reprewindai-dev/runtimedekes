# DEKES - AI-Powered Lead Generation SaaS

Production-capable lead generation platform with buyer-intent detection, multi-signal scoring, learning loop optimization, and enterprise-grade automation.

## Features

- **AI Intent Detection** - 92% accuracy buyer vs seller classification
- **Multi-Signal Scoring** - Intent, urgency, budget, fit analysis
- **Real-Time Discovery** - Continuous scanning across web sources
- **Proof Extraction** - Automated validation of genuine buying intent
- **Learning Loop** - Self-improving system from outcome feedback
- **Contact Enrichment** - Email, social profiles, company data
- **Stripe Billing** - Subscription management with tiered pricing
- **Multi-Tenancy** - Organization-based access control
- **Production Ready** - Full auth, rate limiting, monitoring
- **ECOBE Integration** - Seamless handoff to intelligence platform
- **Vector Intelligence** - Lead deduplication and semantic search
- **Automated Workflows** - Event-driven + scheduled job processing

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon)
- **Auth**: JWT, bcrypt
- **Payments**: Stripe
- **Search**: SerpAPI integration
- **AI**: Groq LLM for intent classification
- **Infrastructure**: Upstash Redis, QStash, Vector
- **Embeddings**: OpenAI text-embedding-3-small

## Premium Infrastructure

### **Hybrid Job System**
- **Event-driven**: Immediate actions (handoffs, enrichment, webhooks)
- **Scheduled**: Maintenance tasks (retries, cleanup, analytics)
- **Retry Policy**: 3 attempts (5m, 15m, 60m) with exponential backoff
- **Monitoring**: Real-time job status and failure tracking

### **Vector Intelligence**
- **Lead Deduplication**: 95% similarity threshold for duplicate detection
- **Semantic Search**: Find leads by meaning, not just keywords
- **Similar Company Lookup**: "Looks like past winner" logic
- **Clustering**: Automatic lead segmentation and pattern detection

### **Real-time Analytics**
- **Dashboard Metrics**: Live handoff stats and conversion tracking
- **Performance Monitoring**: Job execution times and failure rates
- **Usage Analytics**: Per-organization quota and billing metrics
- **Conversion Funnels**: End-to-end pipeline visibility

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb dekes_saas

# Set DATABASE_URL in .env
cp .env.example .env

# Generate Prisma client and push schema
npm run prisma:generate
npx prisma db push
```

### 3. Configure Upstash Infrastructure

See [Upstash Setup Guide](docs/upstash-setup.md) for complete infrastructure setup.

```env
# Upstash Infrastructure
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
QSTASH_TOKEN=""
QSTASH_CURRENT_SIGNING_KEY=""
QSTASH_NEXT_SIGNING_KEY=""
UPSTASH_VECTOR_REST_URL=""
UPSTASH_VECTOR_REST_TOKEN=""

# OpenAI
OPENAI_API_KEY=""
```

### 4. Configure Environment

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dekes_saas"
JWT_SECRET="your-jwt-secret-here"
SESSION_SECRET="your-session-secret-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
SERPAPI_API_KEY="your-serpapi-key"

ECOBE_API_BASE_URL="https://api.ecobe.dev"
ECOBE_API_KEY=""
```

### 5. Start Development

```bash
npm run dev
```

## Architecture

### **System Design**

```
DEKES SaaS Platform
├── Frontend (Next.js)
│   ├── Dashboard with real-time metrics
│   ├── Lead management with semantic search
│   ├── ECOBE pipeline visibility
│   └── Settings and configuration
├── Backend (API Routes)
│   ├── Lead generation and enrichment
│   ├── ECOBE integration and handoffs
│   ├── User management and billing
│   └── Analytics and reporting
├── Infrastructure (Upstash)
│   ├── Redis: Caching and rate limiting
│   ├── QStash: Job scheduling and retries
│   └── Vector: Lead intelligence and deduplication
└── Database (PostgreSQL)
    ├── Multi-tenant organization model
    ├── Lead and run tracking
    ├── ECOBE handoff lifecycle
    └── Billing and usage metrics
```

### **Job Processing**

```
Event-Driven Jobs (Immediate)
├── Lead qualification → ECOBE handoff
├── Run completion → Lead enrichment
├── Stripe events → Billing updates
└── ECOBE webhooks → Status updates

Scheduled Jobs (Cron-based)
├── Every 5min → ECOBE handoff retries
├── Every hour → Lead enrichment batches
├── Every hour → Analytics aggregation
├── Daily → Quota resets
└── Daily → Lead cleanup
```

### **Vector Intelligence**

```
Lead Processing Pipeline
├── Text Generation → OpenAI Embeddings
├── Vector Index → Upstash Vector
├── Similarity Search → Deduplication
├── Semantic Analysis → Lead scoring
└── Pattern Recognition → "Past winner" logic
```

## API Endpoints

### Lead Management
- `GET /api/leads` - List leads with filtering
- `GET /api/leads/[id]` - Lead details
- `GET /api/leads/search` - Semantic search
- `POST /api/leads/similar` - Find similar leads

### ECOBE Integration
- `POST /api/ecobe/handoff` - Create handoff
- `GET /api/ecobe/handoffs` - List handoffs
- `POST /api/ecobe/handoff-status` - Webhook handler

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads/run` - Generate new leads
- `POST /api/leads/:id/outcome` - Record outcome

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT tokens with 7-day expiration
- Rate limiting on API routes
- SQL injection prevention (Prisma)
- CSRF protection
- Secure session management
- Input validation with Zod
- Organization-based access control

## Monitoring & Analytics

- Stripe dashboard for billing metrics
- Database query logging
- Error tracking
- User session tracking
- Lead conversion analytics

## Support

- Email: support@dekes.com
- Documentation: https://docs.dekes.com
- Status: https://status.dekes.com

## License

Proprietary - All Rights Reserved

---

Built with ❤️ by the DEKES team
