'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Filter, Search, ExternalLink, RefreshCw, Activity, Users, Target, Zap, TrendingUp } from 'lucide-react'

interface Handoff {
  id: string
  status: string
  qualificationScore: number | null
  qualificationReason: string | null
  createdAt: string
  sentAt: string | null
  convertedAt: string | null
  failedAt: string | null
  attempts: number
  errorMessage: string | null
  leadId: string | null
  queryId: string | null
  runId: string | null
  lead: {
    id: string
    title: string
    snippet: string
    sourceUrl: string
    score: number
    status: string
    createdAt: string
  } | null
  query: {
    id: string
    query: string
    name: string
  } | null
  run: {
    id: string
    resultCount: number
    leadCount: number
    startedAt: string
    finishedAt: string | null
  } | null
}

interface PaginatedResponse {
  handoffs: Handoff[]
  pagination: {
    page: number
    totalPages: number
    total: number
    hasMore: boolean
  }
}

export default function EcobeHandoffsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  const fetchHandoffs = async (pageNum = 1, search = '', status = '') => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        ...(search && { search }),
        ...(status && { status }),
      })
      
      const response = await fetch(`/api/ecobe/handoffs?${params}`, { credentials: 'include' })
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch handoffs:', error)
    }
  }

  useEffect(() => {
    fetchHandoffs(page, searchTerm, statusFilter)
      .finally(() => setLoading(false))
  }, [page, searchTerm, statusFilter])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchHandoffs(page, searchTerm, statusFilter)
    setRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONVERTED': return 'text-green-400'
      case 'ACCEPTED': return 'text-blue-400'
      case 'SENT': return 'text-yellow-400'
      case 'FAILED': return 'text-red-400'
      case 'PENDING': return 'text-slate-400'
      default: return 'text-slate-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'CONVERTED': return 'bg-green-500/10 border-green-500/20'
      case 'ACCEPTED': return 'bg-blue-500/10 border-blue-500/20'
      case 'SENT': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'FAILED': return 'bg-red-500/10 border-red-500/20'
      case 'PENDING': return 'bg-slate-500/10 border-slate-500/20'
      default: return 'bg-slate-500/10 border-slate-500/20'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">ECOBE Handoffs</span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Overview */}
        {data && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{data.pagination.total}</div>
              <div className="text-sm text-slate-400">Total Handoffs</div>
            </div>

            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {data.handoffs.filter(h => h.status === 'ACCEPTED' || h.status === 'CONVERTED').length}
              </div>
              <div className="text-sm text-slate-400">Accepted</div>
            </div>

            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {data.handoffs.filter(h => h.status === 'CONVERTED').length}
              </div>
              <div className="text-sm text-slate-400">Converted</div>
            </div>

            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {data.pagination.total > 0 
                  ? Math.round((data.handoffs.filter(h => h.status === 'CONVERTED').length / data.pagination.total) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-slate-400">Conversion Rate</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="CONVERTED">Converted</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Handoffs List */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
          {data?.handoffs.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No handoffs found</h3>
              <p className="text-slate-400">Start by qualifying leads and sending them to ECOBE</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Qualification
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data?.handoffs.map((handoff) => (
                    <tr key={handoff.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-white text-sm truncate max-w-xs">
                            {handoff.lead?.title || 'Unknown Lead'}
                          </div>
                          <div className="text-xs text-slate-400">
                            Score: {handoff.lead?.score || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBg(handoff.status)} ${getStatusColor(handoff.status)}`}>
                          {handoff.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-white">
                            {handoff.qualificationScore || 'N/A'}
                          </div>
                          <div className="text-xs text-slate-400 truncate max-w-xs">
                            {handoff.qualificationReason || 'No reason'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {formatDate(handoff.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {formatDate(handoff.sentAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {handoff.leadId && (
                            <button
                              onClick={() => router.push(`/leads/${handoff.leadId}`)}
                              className="p-1 text-slate-400 hover:text-white transition"
                              title="View Lead"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 mt-8">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              Previous
            </button>
            <span className="text-slate-400">
              Page {page} of {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data.pagination.hasMore}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
