# Railway Deployment Setup

## 🚀 **What I've Completed**

✅ **Prisma Client Regenerated** - All models recognized  
✅ **Database Schema Synced** - EcobeHandoff model ready  
✅ **Job Scheduler Auto-Initializes** - Starts with app  
✅ **All APIs Wired** - Real endpoints, no mock data  
✅ **Environment Variables Updated** - Dynamic URLs for Railway  

## 🔑 **NEW Environment Variables for Railway**

**Add ONLY these new variables to your Railway environment:**

### **Upstash Infrastructure**
```
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
QSTASH_TOKEN=your_qstash_token_here
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key_here
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key_here
UPSTASH_VECTOR_REST_URL=your_vector_url_here
UPSTASH_VECTOR_REST_TOKEN=your_vector_token_here
```

### **OpenAI**
```
OPENAI_API_KEY=sk-your-openai-key-here
```

## 📋 **Your Action Items**

### **1. Create Upstash Resources**
- Redis database → Copy REST URL + Token
- QStash project → Copy Token + Both Signing Keys  
- Vector index → Copy REST URL + Token

### **2. Get OpenAI API Key**
- Go to https://platform.openai.com/
- Create API key → Copy key

### **3. Add to Railway**
- Go to your Railway project
- Settings → Environment Variables
- Add the 8 variables above (nothing else needed!)

## 🎯 **What Happens Automatically**

Once you add the variables and deploy:

1. **App starts** → Job scheduler initializes automatically
2. **Scheduled jobs** → Every 5min: ECOBE retries, hourly: enrichment/analytics  
3. **Event-driven jobs** → Handoffs trigger immediately, enrichments queue automatically
4. **Vector indexing** → New leads automatically indexed for deduplication
5. **Real-time monitoring** → Job status and failure tracking

## 🔧 **Verification Steps**

After deployment, test these endpoints:

```bash
# Test job health
curl https://your-app.railway.app/api/jobs/schedule

# Test vector search  
curl "https://your-app.railway.app/api/leads/search?q=AI%20companies&limit=5"

# Test ECOBE handoff (requires auth)
# Use the dashboard UI for this
```

## 🚨 **Important Notes**

- **No other variables needed** - All existing variables work as-is
- **Dynamic URLs** - Jobs endpoint automatically uses your Railway URL
- **Auto-initialization** - No manual job setup required
- **Production ready** - All retry logic, monitoring, error handling included

## 🎉 **You're Ready!**

Once you add the 8 Upstash + OpenAI variables to Railway, the entire premium infrastructure will activate automatically:

- ✅ Automated ECOBE handoffs with retry logic
- ✅ Vector-based lead deduplication and semantic search  
- ✅ Real-time job monitoring and failure handling
- ✅ Enterprise-grade rate limiting and caching
- ✅ Complete analytics and performance tracking

**Just add the 8 variables and deploy - everything else is done!** 🚀
