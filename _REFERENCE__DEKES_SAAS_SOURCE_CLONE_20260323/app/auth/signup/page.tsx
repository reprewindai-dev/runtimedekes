'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string) || ''
    const password = (formData.get('password') as string) || ''
    const name = ((formData.get('name') as string) || '').trim()
    const organizationName = ((formData.get('organizationName') as string) || '').trim()

    const data: {
      email: string
      password: string
      name?: string
      organizationName?: string
    } = {
      email,
      password,
    }

    if (name) data.name = name
    if (organizationName) data.organizationName = organizationName

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to sign up')
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-slate-400 mb-8">Start finding better leads today</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Organization Name</label>
              <input
                type="text"
                name="organizationName"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
              <p className="mt-2 text-xs text-slate-500">
                Minimum 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg font-semibold transition"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
