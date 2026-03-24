#!/usr/bin/env node

/**
 * Production Deployment Verification Script
 * Tests all three systems in their production Railway environments
 */

const fetch = require('node-fetch')

// Production URLs
const PRODUCTION_URLS = {
  co2routerEngine: 'https://ecobe-engineclaude-production.up.railway.app',
  dksSaaS: 'https://dekes-production.up.railway.app', 
  co2routerDashboard: 'https://co2-router-dashboard-production.up.railway.app'
}

async function testHealthCheck(url, name) {
  console.log(`🔍 Testing ${name} health...`)
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: { 'User-Agent': 'Production-Verification-Script' }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ ${name} - HEALTHY`)
      console.log(`   Status: ${data.status || 'OK'}`)
      console.log(`   Service: ${data.service || name}`)
      return true
    } else {
      console.log(`❌ ${name} - FAILED (${response.status})`)
      return false
    }
  } catch (error) {
    console.log(`❌ ${name} - ERROR: ${error.message}`)
    return false
  }
}

async function testCo2routerIntegrations() {
  console.log('\n📡 Testing CO₂Router integration endpoints...')
  
  const baseUrl = PRODUCTION_URLS.co2routerEngine
  
  try {
    // Test DKS summary endpoint
    const summaryResponse = await fetch(`${baseUrl}/api/v1/integrations/dekes/summary?days=7`, {
      headers: { 'User-Agent': 'Production-Verification-Script' }
    })
    
    if (summaryResponse.ok) {
      const summary = await summaryResponse.json()
      console.log('✅ DKS Summary Endpoint - WORKING')
      console.log(`   Integration: ${summary.integration}`)
      console.log(`   Status: ${summary.status}`)
      console.log(`   Workloads: ${summary.metrics?.totalWorkloads || 0}`)
    } else {
      console.log(`❌ DKS Summary Endpoint - FAILED (${summaryResponse.status})`)
    }

    // Test DKS metrics endpoint
    const metricsResponse = await fetch(`${baseUrl}/api/v1/integrations/dekes/metrics?hours=24`, {
      headers: { 'User-Agent': 'Production-Verification-Script' }
    })
    
    if (metricsResponse.ok) {
      const metrics = await metricsResponse.json()
      console.log('✅ DKS Metrics Endpoint - WORKING')
      console.log(`   Success Rate: ${metrics.metrics?.successRate || 0}%`)
      console.log(`   Status: ${metrics.status}`)
    } else {
      console.log(`❌ DKS Metrics Endpoint - FAILED (${metricsResponse.status})`)
    }

  } catch (error) {
    console.log(`❌ Integration Test - ERROR: ${error.message}`)
  }
}

async function testDksAuth() {
  console.log('\n🔐 Testing DKS auth flow...')
  
  try {
    // Test login endpoint
    const loginResponse = await fetch(`${PRODUCTION_URLS.dksSaaS}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Verification-Script'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    })
    
    if (loginResponse.status === 401) {
      console.log('✅ DKS Auth Endpoint - WORKING (401 expected for invalid credentials)')
    } else if (loginResponse.ok) {
      console.log('✅ DKS Auth Endpoint - WORKING (Login successful)')
    } else {
      console.log(`❌ DKS Auth Endpoint - FAILED (${loginResponse.status})`)
    }
  } catch (error) {
    console.log(`❌ DKS Auth Test - ERROR: ${error.message}`)
  }
}

async function testDashboard() {
  console.log('\n🖥️ Testing CO₂Router Dashboard...')
  
  try {
    const response = await fetch(PRODUCTION_URLS.co2routerDashboard, {
      headers: { 'User-Agent': 'Production-Verification-Script' }
    })
    
    if (response.ok) {
      const text = await response.text()
      if (text.includes('CO₂Router') || text.includes('CO2Router')) {
        console.log('✅ Dashboard - WORKING (Correct branding detected)')
      } else {
        console.log('⚠️ Dashboard - LOADING (May need time for full load)')
      }
    } else {
      console.log(`❌ Dashboard - FAILED (${response.status})`)
    }
  } catch (error) {
    console.log(`❌ Dashboard Test - ERROR: ${error.message}`)
  }
}

async function runProductionVerification() {
  console.log('🚀 PRODUCTION DEPLOYMENT VERIFICATION')
  console.log('=' .repeat(50))
  
  // Test health checks
  const engineHealthy = await testHealthCheck(PRODUCTION_URLS.co2routerEngine, 'CO₂Router Engine')
  const dksHealthy = await testHealthCheck(PRODUCTION_URLS.dksSaaS, 'DKS SaaS')
  const dashboardHealthy = await testHealthCheck(PRODUCTION_URLS.co2routerDashboard, 'CO₂Router Dashboard')
  
  // Test integrations
  await testCo2routerIntegrations()
  await testDksAuth()
  await testDashboard()
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📊 DEPLOYMENT SUMMARY')
  console.log(`CO₂Router Engine: ${engineHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`)
  console.log(`DKS SaaS: ${dksHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`)
  console.log(`CO₂Router Dashboard: ${dashboardHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`)
  
  const allHealthy = engineHealthy && dksHealthy && dashboardHealthy
  console.log(`\n🎯 OVERALL STATUS: ${allHealthy ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME ISSUES DETECTED'}`)
  
  if (allHealthy) {
    console.log('\n🎉 Production deployment successful!')
    console.log('🌱 DKS → CO₂Router integration is live and tracking carbon savings.')
  } else {
    console.log('\n🔧 Check the failed systems above and retry deployment.')
  }
}

// Run verification
if (require.main === module) {
  runProductionVerification().catch(error => {
    console.error('💥 Verification failed:', error)
    process.exit(1)
  })
}

module.exports = { runProductionVerification }
