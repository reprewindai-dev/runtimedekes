#!/usr/bin/env node

/**
 * Quick test user creation for DKS
 */

const fetch = require('node-fetch')

const DKS_BASE_URL = 'http://localhost:3001'

async function createTestUser() {
  console.log('👤 Creating test user...')
  
  try {
    // Create user
    const signupResponse = await fetch(`${DKS_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })
    })

    if (signupResponse.ok) {
      console.log('✅ Test user created successfully')
      return { email: 'test@example.com', password: 'password123' }
    } else {
      const error = await signupResponse.json()
      console.log('User creation response:', error)
      
      // Try logging in if user already exists
      const loginResponse = await fetch(`${DKS_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      if (loginResponse.ok) {
        console.log('✅ Test user login successful')
        return { email: 'test@example.com', password: 'password123' }
      } else {
        throw new Error('Failed to create or login test user')
      }
    }
  } catch (error) {
    console.error('❌ Test user creation failed:', error.message)
    throw error
  }
}

if (require.main === module) {
  createTestUser().catch(console.error)
}

module.exports = { createTestUser }
