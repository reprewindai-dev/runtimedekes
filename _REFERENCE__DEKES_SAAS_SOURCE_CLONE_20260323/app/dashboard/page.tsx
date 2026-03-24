'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, TrendingUp, Users, Zap, ArrowRight } from 'lucide-react'
import EcobeDashboardMetrics from '@/components/ecobe/dashboard-metrics'
import EcobeInboundEventsPanel from '@/components/ecobe/inbound-events-panel'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ leads: 0, qualified: 0, won: 0, conversion: 0 })

  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          return { error: true, status: res.status, data }
        }
        return data
      })
      .then((data) => {
        if (!data || data.error) {
          router.push('/auth/login')
        } else {
          setUser(data.user)
          setStats((prev) => data.stats || prev)
        }
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">DEKES</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">{user?.email}</span>
              <button
                onClick={() => {
                  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                    .catch(() => {})
                    .finally(() => router.push('/'))
                }}
                className="text-sm text-slate-400 hover:text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name || 'there'}!</h1>
          <p className="text-slate-400">Here&apos;s what&apos;s happening with your lead generation</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-green-400">+12%</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.leads}</div>
            <div className="text-sm text-slate-400">Total Leads</div>
          </div>

          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm text-green-400">+8%</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.qualified}</div>
            <div className="text-sm text-slate-400">Qualified Leads</div>
          </div>

          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-green-400">+15%</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.won}</div>
            <div className="text-sm text-slate-400">Conversions</div>
          </div>

          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-sm text-green-400">+3.2%</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.conversion}%</div>
            <div className="text-sm text-slate-400">Conversion Rate</div>
          </div>
        </div>

        {/* ECOBE Pipeline Metrics */}
        <EcobeDashboardMetrics />

        {/* ECOBE Inbound Signals */}
        <EcobeInboundEventsPanel />

        {/* Quick Actions */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/runs/new')}
              className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-left transition group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white mb-1">Run New Search</div>
                  <div className="text-sm text-slate-400">Generate fresh leads now</div>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition" />
              </div>
            </button>

            <button
              onClick={() => router.push('/leads')}
              className="p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-left transition group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white mb-1">Review Leads</div>
                  <div className="text-sm text-slate-400">Check pending leads</div>
                </div>
                <ArrowRight className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition" />
              </div>
            </button>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Unlock More Leads</h3>
              <p className="text-slate-300">Upgrade to Professional for unlimited queries and advanced features</p>
            </div>
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition whitespace-nowrap">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
