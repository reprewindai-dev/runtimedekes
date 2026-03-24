# 🚀 Production Deployment Guide

## Repository Overview

### 1. CO₂Router Engine
**GitHub**: `https://github.com/reprewindai-dev/ecobe-engineclaude`
**Purpose**: Carbon-aware routing engine with DKS integration
**Production URL**: `https://ecobe-engineclaude-production.up.railway.app`

### 2. DKS SaaS
**GitHub**: `https://github.com/reprewindai-dev/dekes-saas`
**Purpose**: Lead generation SaaS with CO₂Router integration
**Production URL**: `https://dekes-production.up.railway.app`

### 3. CO₂Router Dashboard
**GitHub**: `https://github.com/reprewindai-dev/co2-router-dashboard`
**Purpose**: Real-time carbon routing dashboard with DKS analytics
**Production URL**: `https://co2-router-dashboard-production.up.railway.app`

## 🔧 Deployment Configuration

### Railway Setup Complete
All three repositories are configured for Railway deployment with:

- **Build Commands**: Optimized for each stack
- **Health Checks**: `/health` endpoints configured
- **Restart Policies**: ON_FAILURE with retries
- **Environment Variables**: Production-ready configurations

### Environment Variables

#### CO₂Router Engine
```bash
PORT=8080
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
# Optional provider API keys
ELECTRICITY_MAPS_API_KEY=...
WATTTIME_USERNAME=...
WATTTIME_PASSWORD=...
EMBER_API_KEY=...
EIA_API_KEY=...
```

#### DKS SaaS
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_APP_URL=https://dekes-production.up.railway.app

# CO₂Router Integration (NEW)
CO2ROUTER_API_URL=https://ecobe-engineclaude-production.up.railway.app
CO2ROUTER_API_KEY=dk_production_integration_key_2024
CO2ROUTER_INTEGRATION_ENABLED=true

# Search providers
SERPAPI_API_KEY=...
APIFY_TOKEN=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
```

#### CO₂Router Dashboard
```bash
ECOBE_API_URL=https://ecobe-engineclaude-production.up.railway.app
NEXT_PUBLIC_ECOBE_API_URL=https://ecobe-engineclaude-production.up.railway.app/api/v1
```

## 🌐 Production URLs & Endpoints

### CO₂Router Engine
- **Health**: `GET /health`
- **DKS Integration**: 
  - `GET /api/v1/integrations/dekes/summary?days=30`
  - `GET /api/v1/integrations/dekes/metrics?hours=168`
- **Carbon Command**: `POST /api/v1/carbon/command`
- **Carbon Outcome**: `POST /api/v1/carbon/outcome`

### DKS SaaS
- **Health**: `GET /health`
- **Auth**: `POST /api/auth/login`
- **Lead Generation**: `POST /api/leads/run`
- **Dashboard**: `https://dekes-production.up.railway.app/dashboard`

### CO₂Router Dashboard
- **Landing**: `https://co2-router-dashboard-production.up.railway.app`
- **DKS Integration**: `https://co2-router-dashboard-production.up.railway.app/dekes`
- **API Proxy**: `GET /api/integrations/dekes?endpoint=summary&days=30`

## 🧪 Verification Commands

### 1. Health Checks
```bash
# CO₂Router Engine
curl https://ecobe-engineclaude-production.up.railway.app/health

# DKS SaaS  
curl https://dekes-production.up.railway.app/health

# CO₂Router Dashboard
curl https://co2-router-dashboard-production.up.railway.app/health
```

### 2. Integration Tests
```bash
# Test DKS integration endpoints
curl https://ecobe-engineclaude-production.up.railway.app/api/v1/integrations/dekes/summary?days=7

# Test DKS auth
curl -X POST https://dekes-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 3. Full Verification Script
```bash
cd dekes-saas
node scripts/verify-production-deployment.js
```

## 🔄 Integration Flow

### DKS → CO₂Router Production Flow
1. **User Action**: Lead generation in DKS SaaS
2. **Workload Emission**: DKS sends carbon command to CO₂Router
3. **Routing Decision**: CO₂Router selects optimal region
4. **Lead Generation**: DKS executes in selected region  
5. **Outcome Reporting**: DKS reports actual carbon usage
6. **Dashboard Display**: CO₂Router shows DKS metrics and savings

### Data Flow
```
DKS SaaS → CO₂Router Engine → CO₂Router Dashboard
   ↓              ↓                    ↓
Workload     → Carbon Command   → Integration Metrics
Emission     → Decision Log     → Carbon Savings Proof
Outcome      → Actual Results   → Real-time Analytics
```

## 📊 Expected Production Metrics

### DKS Integration Dashboard
- **Total Workloads**: Number of DKS lead generation runs
- **Carbon Saved**: Actual CO₂ savings from routing decisions
- **Success Rate**: Percentage of successful integrations
- **Workload Types**: Breakdown by lead generation type

### Carbon Savings
- **Estimated vs Actual**: Comparison of predicted vs real carbon usage
- **Savings Percentage**: % reduction from baseline
- **Regional Impact**: Carbon savings by geographic region

## 🚨 Troubleshooting

### Common Issues

#### 1. CO₂Router Health Check Fails
- **Check**: Railway deployment logs
- **Verify**: Database and Redis connections
- **Action**: Restart deployment

#### 2. DKS Integration Not Working
- **Check**: CO2ROUTER_API_URL in DKS environment
- **Verify**: API key authentication
- **Test**: Manual curl to CO₂Router endpoints

#### 3. Dashboard Shows No Data
- **Check**: API proxy configuration
- **Verify**: CO₂Router engine is accessible
- **Action**: Wait for data propagation (5-10 minutes)

### Health Check Responses

#### CO₂Router Engine
```json
{
  "status": "healthy",
  "service": "ECOBE Engine", 
  "version": "1.0.0",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

#### DKS SaaS
```json
{
  "status": "healthy",
  "service": "DKS SaaS",
  "timestamp": "2026-03-21T19:14:08.083Z"
}
```

## 🎯 Success Criteria

### ✅ Production Ready When:
- [ ] All three services respond to health checks
- [ ] DKS auth flow works (returns 401 for bad credentials)
- [ ] CO₂Router integration endpoints return data
- [ ] Dashboard loads with CO₂Router branding
- [ ] DKS workloads appear in CO₂Router metrics
- [ ] Carbon savings calculations are working

### 🎉 Integration Success:
- DKS lead generation runs are tracked in CO₂Router
- Source attribution shows `sourceApp: 'dks'`
- Carbon savings are calculated and displayed
- Dashboard shows real DKS integration metrics

## 📞 Support & Monitoring

### Railway Dashboard
- Monitor all three deployments
- Check logs for errors
- Set up alerts for health check failures

### Integration Monitoring
- Daily check of DKS → CO₂Router data flow
- Weekly carbon savings report
- Monthly integration health review

---

## 🚀 DEPLOY NOW

All systems are configured and ready for production deployment. The DKS → CO₂Router integration will automatically start tracking carbon savings once deployed.

**Next Steps**:
1. Push latest changes to each repository
2. Railway will automatically deploy
3. Run verification script
4. Monitor first few DKS lead generation runs
5. Verify carbon savings appear in dashboard

🌱 **Your carbon-aware routing integration is ready to save CO₂!**
