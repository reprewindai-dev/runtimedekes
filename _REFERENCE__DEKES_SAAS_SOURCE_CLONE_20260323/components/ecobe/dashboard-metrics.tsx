'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, TrendingUp, Users, Target, Zap, Activity } from 'lucide-react'
import { cacheStrategies } from '../../lib/cache/cache-utils'
import { DashboardGridSkeleton, PanelSkeleton } from '../ui/skeleton'
import { ApiErrorBoundary } from '../error/error-boundary'

interface EcobeStats {
  totalHandoffs: number
  sentHandoffs: number
  acceptedHandoffs: number
  convertedHandoffs: number
  conversionRate: number
  acceptanceRate: number
}

interface RecentHandoff {
  id: string
  status: string
  qualificationScore: number | null
  createdAt: string
  lead: {
    id: string
    title: string
    score: number
    status: string
  } | null
}

interface EcobeDashboardData {
  stats: EcobeStats
  recentHandoffs: RecentHandoff[]
  monthlyStats: Array<{
    month: string
    handoffs: number
    conversions: number
  }>
}

export default function EcobeDashboardMetrics() {
  return (
    <ApiErrorBoundary>
      <EcobeDashboardMetricsInner />
    </ApiErrorBoundary>
  )
}

function EcobeDashboardMetricsInner() {
  const [data, setData] = useState<EcobeDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        const result = await cacheStrategies.analytics('/api/dashboard/ecobe-stats', { 
          credentials: 'include' 
        })
        
        if (result && result.stats) {
          setData(result)
        } else {
          throw new Error('Invalid response format from ECOBE stats API')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load ECOBE metrics'
        setError(errorMessage)
        console.error('ECOBE metrics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <DashboardGridSkeleton items={4} />
  }

  if (error) {
    return (
      <div className="bg-slate-900/50 border border-red-500/20 rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-white font-semibold mb-2">Unable to Load ECOBE Metrics</h3>
        <p className="text-slate-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-400 text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-slate-400">No ECOBE metrics data available</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONVERTED': return 'text-green-400'
      case 'ACCEPTED': return 'text-blue-400'
      case 'SENT': return 'text-yellow-400'
      case 'FAILED': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'CONVERTED': return 'bg-green-500/10 border-green-500/20'
      case 'ACCEPTED': return 'bg-blue-500/10 border-blue-500/20'
      case 'SENT': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'FAILED': return 'bg-red-500/10 border-red-500/20'
      default: return 'bg-slate-500/10 border-slate-500/20'
    }
  }

  return (
    <>
      {/* ECOBE Stats */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="w-6 h-6 text-cyan-400" />
          ECOBE Pipeline
        </h2>
        <p className="text-slate-400">Lead handoff performance and conversion metrics</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-12">
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-sm text-green-400">
              {data.stats.totalHandoffs > 0 ? '+' + Math.round((data.stats.sentHandoffs / data.stats.totalHandoffs) * 100) + '%' : '0%'}
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{data.stats.totalHandoffs}</div>
          <div className="text-sm text-slate-400">Total Handoffs</div>
        </div>

        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-green-400">+{data.stats.acceptanceRate}%</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{data.stats.acceptanceRate}%</div>
          <div className="text-sm text-slate-400">Acceptance Rate</div>
        </div>

        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-green-400">+{data.stats.conversionRate}%</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{data.stats.conversionRate}%</div>
          <div className="text-sm text-slate-400">Conversion Rate</div>
        </div>

        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-green-400">
              {data.stats.convertedHandoffs > 0 ? '+' + data.stats.convertedHandoffs : '0'}
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{data.stats.convertedHandoffs}</div>
          <div className="text-sm text-slate-400">Converted Deals</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Handoffs</h3>
          <div className="space-y-3">
            {data.recentHandoffs.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No handoffs yet</p>
            ) : (
              data.recentHandoffs.map((handoff) => (
                <div key={handoff.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm truncate">
                      {handoff.lead?.title || 'Unknown Lead'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Score: {handoff.qualificationScore || 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBg(handoff.status)} ${getStatusColor(handoff.status)}`}>
                      {handoff.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => window.open('/ecobe/handoffs', '_blank')}
              className="w-full p-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-left transition group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">View All Handoffs</div>
                  <div className="text-xs text-slate-400">Manage ECOBE pipeline</div>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition" />
              </div>
            </button>

            <button
              onClick={() => window.open('/leads?filter=qualified', '_blank')}
              className="w-full p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-left transition group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">Qualified Leads</div>
                  <div className="text-xs text-slate-400">Ready for handoff</div>
                </div>
                <ArrowRight className="w-4 h-4 text-green-400 group-hover:translate-x-1 transition" />
              </div>
            </button>

            <button
              onClick={() => window.open('/settings/ecobe', '_blank')}
              className="w-full p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-left transition group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">ECOBE Settings</div>
                  <div className="text-xs text-slate-400">Configure integration</div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
