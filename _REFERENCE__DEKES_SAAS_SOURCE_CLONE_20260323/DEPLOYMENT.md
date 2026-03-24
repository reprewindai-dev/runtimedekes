# DEKES - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.production` with secure values:

```bash
# Generate secure secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # SESSION_SECRET
```

### 2. Database Setup

```bash
# Production PostgreSQL
# Recommended: Supabase, Neon, or AWS RDS

# Set up connection pooling
DATABASE_URL="postgresql://user:password@host:5432/dekes_saas?pgbouncer=true"

# Run migrations
npx prisma migrate deploy
```

### 3. Stripe Configuration

```bash
# Create products and prices in Stripe Dashboard
# Starter: $99/mo
# Professional: $299/mo
# Enterprise: $999/mo

# Set up webhook endpoint
https://your-domain.com/api/webhooks/stripe

# Add webhook events:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
```

### 4. Domain & SSL

```bash
# Set up domain
NEXT_PUBLIC_APP_URL="https://dekes.com"

# Configure SSL (auto with Vercel/Netlify)
# Or use Cloudflare for additional protection
```

## Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard
# Connect PostgreSQL database
# Configure domains
```

### Option 2: Docker + Cloud Run

```bash
# Build image
docker build -t dekes-saas:latest .

# Push to registry
docker tag dekes-saas gcr.io/PROJECT_ID/dekes-saas
docker push gcr.io/PROJECT_ID/dekes-saas

# Deploy to Cloud Run
gcloud run deploy dekes-saas \
  --image gcr.io/PROJECT_ID/dekes-saas \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Option 3: AWS (ECS + RDS)

```bash
# Create RDS PostgreSQL instance
# Create ECS cluster
# Push Docker image to ECR
# Deploy service with load balancer
# Configure Route53 for domain
```

## Post-Deployment

### 1. Monitoring

```bash
# Set up Sentry for error tracking
npm install @sentry/nextjs

# Configure in next.config.js
```

### 2. Analytics

```bash
# Add PostHog or Mixpanel
# Track key metrics:
- Signups
- Lead generation runs
- Conversion rates
- Churn
```

### 3. Backups

```bash
# Automated PostgreSQL backups
# Retention: 30 days
# Point-in-time recovery enabled
```

### 4. Rate Limiting

```bash
# Cloudflare rate limiting rules
# API: 100 req/min per IP
# Auth: 5 req/min per IP
```

### 5. Security Headers

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
    ]
  },
}
```

## Environment-Specific Configs

### Development
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Staging
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.dekes.com
```

### Production
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://dekes.com
```

## Scaling

### Database

```bash
# Connection pooling with PgBouncer
# Read replicas for analytics queries
# Automated vertical scaling
```

### Application

```bash
# Vercel: Auto-scales
# Docker: Use orchestration (K8s, ECS)
# Set min instances: 2
# Set max instances: 10
```

## Maintenance

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name add_feature

# Deploy to production
npx prisma migrate deploy
```

### Rollback Plan

```bash
# Database: Point-in-time recovery
# Application: Revert to previous deployment
# Stripe: Webhooks are idempotent
```

## Cost Optimization

- **Database**: Start with smallest instance, scale as needed
- **Hosting**: Vercel Hobby → Pro as you grow
- **CDN**: Cloudflare free tier
- **Monitoring**: Sentry free tier (5k events/mo)

## Support

- Status page: https://status.dekes.com
- Documentation: https://docs.dekes.com
- Support: support@dekes.com
