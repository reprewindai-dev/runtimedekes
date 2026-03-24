# Upstash Infrastructure Setup Guide

This guide walks you through setting up the complete Upstash infrastructure for DEKES SaaS.

## 🎯 **What You'll Get**

- **Redis**: Caching, rate limiting, job state management
- **QStash**: Event-driven + scheduled job processing  
- **Vector**: Lead deduplication and semantic search
- **Automated Workflows**: Retry logic, enrichment, analytics

## 📋 **Prerequisites**

1. Upstash account (https://upstash.com/)
2. OpenAI API key (for embeddings)
3. DEKES application deployed

---

## 🚀 **Step 1: Create Upstash Resources**

### 1.1 Redis Database
```bash
# In Upstash Console
1. Go to Redis → Create Database
2. Name: "dekes-redis"
3. Region: Choose closest to your app
4. Enable: TLS, Multi-zone (recommended)
5. Copy REST URL and Token
```

### 1.2 QStash Project
```bash
# In Upstash Console
1. Go to QStash → Create Project  
2. Name: "dekes-jobs"
3. Region: Same as Redis
4. Copy:
   - QSTASH_TOKEN
   - QSTASH_CURRENT_SIGNING_KEY
   - QSTASH_NEXT_SIGNING_KEY
```

### 1.3 Vector Database
```bash
# In Upstash Console
1. Go to Vector → Create Index
2. Name: "dekes-vectors"
3. Dimensions: 1536 (for OpenAI text-embedding-3-small)
4. Metric: Cosine
5. Copy REST URL and Token
```

---

## 🔑 **Step 2: Environment Variables**

Add these to your `.env` file:

```bash
# Upstash Infrastructure
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
QSTASH_TOKEN="your-qstash-token"
QSTASH_CURRENT_SIGNING_KEY="your-current-signing-key"
QSTASH_NEXT_SIGNING_KEY="your-next-signing-key"
UPSTASH_VECTOR_REST_URL="https://your-vector-url.upstash.io"
UPSTASH_VECTOR_REST_TOKEN="your-vector-token"

# OpenAI
OPENAI_API_KEY="sk-your-openai-key"

# Jobs (Legacy - keep for compatibility)
JOBS_ENDPOINT_URL="https://your-domain.com/api/jobs/runner"
JOBS_SECRET="your-jobs-secret"
```

---

## 🏗️ **Step 3: Initialize Jobs**

### 3.1 Automatic Initialization
Jobs auto-initialize when the app starts (5-second delay).

### 3.2 Manual Initialization
```bash
curl -X POST https://your-domain.com/api/jobs/schedule \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📊 **Step 4: Verify Setup**

### 4.1 Check Job Health
```bash
curl -X GET https://your-domain.com/api/jobs/schedule \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4.2 Test Vector Search
```bash
curl -X GET "https://your-domain.com/api/leads/search?q=AI%20companies&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4.3 Test Lead Deduplication
```bash
curl -X POST https://your-domain.com/api/leads/similar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Software Engineer at Tech Company",
    "company": "Acme Corp",
    "limit": 5
  }'
```

---

## 🔄 **Step 5: Automated Workflows**

### 5.1 Scheduled Jobs (Cron-based)
```bash
# Every 5 minutes: ECOBE handoff retries
# Every hour: Lead enrichment batches  
# Every hour: Analytics aggregation
# Daily at midnight: Quota resets
# Daily at 2 AM: Lead cleanup
```

### 5.2 Event-Driven Jobs
```bash
# Lead run finishes → Trigger enrichment
# Lead qualifies for ECOBE → Trigger handoff
# Stripe event lands → Process billing
# ECOBE webhook lands → Update status
```

---

## 🎛️ **Step 6: Monitor & Debug**

### 6.1 Job Status Dashboard
```bash
# Check running jobs
curl -X GET https://your-domain.com/api/jobs/schedule

# View recent failures
curl -X GET https://your-domain.com/api/jobs/schedule \
  | jq '.recentFailures'
```

### 6.2 Redis Monitoring
```bash
# Check Redis usage
UPSTASH_REDIS_REST_URL="your-url"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Rate limiting status
curl "$UPSTASH_REDIS_REST_URL/get/rate_limit:ecobe-handoff:user123" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

### 6.3 Vector Index Stats
```bash
# Check indexed leads
curl "$UPSTASH_VECTOR_REST_URL/info" \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"
```

---

## 🚨 **Troubleshooting**

### Common Issues

#### 1. "Missing QSTASH_TOKEN"
```bash
# Check your .env file
echo $QSTASH_TOKEN
# Re-copy from Upstash console if missing
```

#### 2. Jobs not running
```bash
# Check job scheduler health
curl -X GET https://your-domain.com/api/jobs/schedule

# Re-initialize if needed
curl -X POST https://your-domain.com/api/jobs/schedule
```

#### 3. Vector search returns empty
```bash
# Check if leads are indexed
curl "$UPSTASH_VECTOR_REST_URL/query" \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{"vector": [0.1, 0.2, ...], "topK": 5}'
```

#### 4. Rate limiting issues
```bash
# Check rate limit status
curl "$UPSTASH_REDIS_REST_URL/get/rate_limit:*" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

---

## 📈 **Performance Tuning**

### Redis Optimization
```bash
# Set appropriate TTL for cache keys
- Analytics: 1 hour
- Rate limits: 5 minutes
- Job state: 1 hour
- Session cache: 7 days
```

### Vector Optimization
```bash
# Batch indexing for better performance
- Index in batches of 100 leads
- Use native OpenAI dimensions (1536)
- Cosine similarity for text data
```

### QStash Optimization
```bash
# Retry policy: 3 attempts (5m, 15m, 60m)
# Job timeout: 10 minutes
# Concurrent jobs: 10 per organization
```

---

## 🔒 **Security Considerations**

### Environment Variables
- Never commit `.env` files
- Use different keys for staging/production
- Rotate keys quarterly

### Rate Limiting
- Per-user rate limits on API endpoints
- Per-organization job quotas
- Global rate limits on expensive operations

### Webhook Security
- Verify QStash signatures
- Validate job payloads
- Log all job executions

---

## 📚 **API Reference**

### Jobs API
```bash
POST /api/jobs/schedule    # Initialize jobs
GET  /api/jobs/schedule    # Job health status
POST /api/jobs/runner      # Job execution (QStash only)
```

### Vector API
```bash
GET  /api/leads/search      # Semantic search
POST /api/leads/similar     # Find similar leads
```

### Redis API (Internal)
```bash
# Rate limiting
redisCache.checkRateLimit(identifier, limit, window)

# Job state
redisCache.getJobState(jobId)
redisCache.setJobState(jobId, state, ttl)

# Caching
redisCache.get(key)
redisCache.set(key, value, ttl)
```

---

## 🎯 **Next Steps**

1. ✅ Set up Upstash resources
2. ✅ Configure environment variables  
3. ✅ Initialize job scheduler
4. ✅ Test API endpoints
5. ✅ Monitor job execution
6. 🔄 Optimize performance
7. 📊 Add custom metrics
8. 🚀 Scale to production

---

## 💡 **Pro Tips**

- **Batch Operations**: Group vector indexing for better performance
- **Health Checks**: Set up monitoring for job failures
- **Graceful Degradation**: App works even if jobs fail temporarily
- **Debug Mode**: Use Redis to inspect job states during development
- **Cost Optimization**: Monitor Upstash usage and optimize TTLs

Your DEKES SaaS now has enterprise-grade automation with Upstash! 🚀
