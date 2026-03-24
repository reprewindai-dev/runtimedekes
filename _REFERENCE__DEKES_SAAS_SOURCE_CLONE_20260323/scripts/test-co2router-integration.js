#!/usr/bin/env node

/**
 * DKS → CO₂Router Integration Test Script
 * Tests the complete integration flow from DKS workload emission to CO₂Router dashboard display
 */

const fetch = require('node-fetch')

// Configuration
const DKS_BASE_URL = process.env.DKS_BASE_URL || 'http://localhost:3001'
const CO2ROUTADER_BASE_URL = process.env.CO2ROUTADER_BASE_URL || 'http://localhost:8080'
const DKS_API_KEY = process.env.DKS_API_KEY || 'test-key'
const CO2ROUTADER_API_KEY = process.env.CO2ROUTADER_API_KEY || 'test-key'

// Test data
const testQuery = {
  query: 'enterprise AI companies in California',
  estimatedResults: 50,
  carbonBudget: 5000,
  regions: ['US-CAL-CISO', 'FR', 'DE'],
  delayToleranceMinutes: 30
}

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DKS_API_KEY}`,
      ...options.headers
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

async function testCo2RouterHealth() {
  console.log('🔍 Testing CO₂Router health...')
  try {
    const response = await fetch(`${CO2ROUTADER_BASE_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${CO2ROUTADER_API_KEY}`
      }
    })
    
    if (response.ok) {
      console.log('✅ CO₂Router health check passed')
      return true
    } else {
      console.log(`❌ CO₂Router health check failed: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ CO₂Router health check error: ${error.message}`)
    return false
  }
}

async function testDksRun() {
  console.log('🚀 Testing DKS lead generation run...')
  try {
    const response = await makeRequest(`${DKS_BASE_URL}/api/leads/run`, {
      method: 'POST',
      body: JSON.stringify(testQuery)
    })
    
    console.log('✅ DKS run initiated successfully')
    console.log(`📊 Run ID: ${response.run?.id}`)
    console.log(`🌍 Selected region: ${response.optimization?.selectedRegion}`)
    console.log(`💰 Carbon badge: ${JSON.stringify(response.carbonBadge)}`)
    
    return response
  } catch (error) {
    console.log(`❌ DKS run failed: ${error.message}`)
    return null
  }
}

async function testCo2RouterIntegration() {
  console.log('📡 Testing CO₂Router integration endpoints...')
  
  try {
    // Test summary endpoint
    const summaryResponse = await fetch(`${CO2ROUTADER_BASE_URL}/api/v1/integrations/dekes/summary?days=7`, {
      headers: {
        'Authorization': `Bearer ${CO2ROUTADER_API_KEY}`
      }
    })
    
    if (summaryResponse.ok) {
      const summary = await summaryResponse.json()
      console.log('✅ CO₂Router summary endpoint working')
      console.log(`📈 Total workloads: ${summary.metrics?.totalWorkloads}`)
      console.log(`💾 Carbon savings: ${summary.metrics?.carbonSavingsKg} kg`)
    } else {
      console.log(`❌ CO₂Router summary endpoint failed: ${summaryResponse.status}`)
    }
    
    // Test metrics endpoint
    const metricsResponse = await fetch(`${CO2ROUTADER_BASE_URL}/api/v1/integrations/dekes/metrics?hours=24`, {
      headers: {
        'Authorization': `Bearer ${CO2ROUTADER_API_KEY}`
      }
    })
    
    if (metricsResponse.ok) {
      const metrics = await metricsResponse.json()
      console.log('✅ CO₂Router metrics endpoint working')
      console.log(`📊 Success rate: ${metrics.metrics?.successRate}%`)
      console.log(`⚡ Average response time: ${metrics.metrics?.avgResponseTimeMs}ms`)
    } else {
      console.log(`❌ CO₂Router metrics endpoint failed: ${metricsResponse.status}`)
    }
    
  } catch (error) {
    console.log(`❌ CO₂Router integration test error: ${error.message}`)
  }
}

async function testDashboardApi() {
  console.log('🖥️ Testing CO₂Router dashboard API...')
  
  try {
    // Test dashboard proxy API
    const summaryResponse = await fetch(`${CO2ROUTADER_BASE_URL}/api/integrations/dekes?endpoint=summary&days=7`)
    
    if (summaryResponse.ok) {
      const summary = await summaryResponse.json()
      console.log('✅ Dashboard summary API working')
      console.log(`📈 Integration status: ${summary.data?.status}`)
      console.log(`🔄 Last sync: ${summary.data?.lastSync}`)
    } else {
      console.log(`❌ Dashboard summary API failed: ${summaryResponse.status}`)
    }
    
    const metricsResponse = await fetch(`${CO2ROUTADER_BASE_URL}/api/integrations/dekes?endpoint=metrics&hours=24`)
    
    if (metricsResponse.ok) {
      const metrics = await metricsResponse.json()
      console.log('✅ Dashboard metrics API working')
      console.log(`📊 Total DKS workloads: ${metrics.data?.metrics?.dksWorkloads}`)
    } else {
      console.log(`❌ Dashboard metrics API failed: ${metricsResponse.status}`)
    }
    
  } catch (error) {
    console.log(`❌ Dashboard API test error: ${error.message}`)
  }
}

async function waitForWorkloadProcessing(runId, maxWaitTime = 60000) {
  console.log(`⏳ Waiting for workload processing... (${maxWaitTime/1000}s max)`)
  
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await makeRequest(`${DKS_BASE_URL}/api/leads/${runId}`)
      
      if (response.run?.status === 'FINISHED') {
        console.log('✅ Workload processing completed')
        console.log(`📊 Results: ${response.run.leadCount} leads generated`)
        return response
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.log(`⚠️ Error checking run status: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log('⏰ Workload processing timed out')
  return null
}

async function runIntegrationTest() {
  console.log('🧪 Starting DKS → CO₂Router Integration Test')
  console.log('=' .repeat(50))
  
  // Test 1: CO₂Router Health
  const co2routerHealthy = await testCo2RouterHealth()
  if (!co2routerHealthy) {
    console.log('❌ CO₂Router is not healthy - aborting test')
    return
  }
  
  // Test 2: CO₂Router Integration Endpoints
  await testCo2RouterIntegration()
  
  // Test 3: Dashboard API
  await testDashboardApi()
  
  // Test 4: DKS Run with CO₂Router Integration
  const runResponse = await testDksRun()
  if (!runResponse) {
    console.log('❌ DKS run failed - cannot test full integration')
    return
  }
  
  // Test 5: Wait for processing and verify results
  if (runResponse.run?.id) {
    const finalResult = await waitForWorkloadProcessing(runResponse.run.id)
    if (finalResult) {
      console.log('🎉 Full integration test completed successfully!')
      
      // Final verification: Check CO₂Router for the new workload
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait for data propagation
      await testCo2RouterIntegration()
    }
  }
  
  console.log('=' .repeat(50))
  console.log('🏁 Integration test completed')
}

// Run the test
if (require.main === module) {
  runIntegrationTest().catch(error => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })
}

module.exports = { runIntegrationTest, testCo2RouterHealth, testDksRun }
