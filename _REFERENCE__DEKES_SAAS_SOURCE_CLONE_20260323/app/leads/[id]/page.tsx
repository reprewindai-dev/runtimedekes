'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Send, Activity } from 'lucide-react'
import LeadHandoffSection from '@/components/ecobe/lead-handoff-section'

interface Lead {
  id: string
  title: string
  snippet: string
  sourceUrl: string
  score: number
  status: string
  createdAt: string
  meta: any
}

interface EcobeHandoff {
  id: string
  status: string
  qualificationScore: number | null
  qualificationReason: string | null
  createdAt: string
  sentAt: string | null
  convertedAt: string | null
  attempts: number
}

export default function LeadDetailPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [lead, setLead] = useState<Lead | null>(null)
  const [handoff, setHandoff] = useState<EcobeHandoff | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const pathParts = window.location.pathname.split('/')
    const leadId = pathParts[pathParts.length - 1]
    
    if (!leadId || leadId === 'page') {
      router.push('/leads')
      return
    }

    Promise.all([
      fetch(`/api/leads/${leadId}`, { credentials: 'include' }),
      fetch(`/api/leads/${leadId}/ecobe-handoff`, { credentials: 'include' })
    ])
      .then(async ([leadRes, handoffRes]) => {
        const leadData = await leadRes.json()
        const handoffData = await handoffRes.json()

        if (!leadRes.ok) {
          throw new Error(leadData.error || 'Failed to load lead')
        }

        setLead(leadData.lead)
        setHandoff(handoffData.handoff || null)
      })
      .catch((err: any) => setError(err.message || 'Failed to load lead'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading lead...</div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 max-w-md">
          <h1 className="text-xl font-bold text-white mb-4">Error</h1>
          <p className="text-slate-400 mb-6">{error || 'Lead not found'}</p>
          <button
            onClick={() => router.push('/leads')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Back to Leads
          </button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WON': return 'text-green-400'
      case 'NEW': return 'text-blue-400'
      case 'CONTACTED': return 'text-yellow-400'
      case 'LOST': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'WON': return 'bg-green-500/10 border-green-500/20'
      case 'NEW': return 'bg-blue-500/10 border-blue-500/20'
      case 'CONTACTED': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'LOST': return 'bg-red-500/10 border-red-500/20'
      default: return 'bg-slate-500/10 border-slate-500/20'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/leads')}
                className="p-2 text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Lead Details</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open(`/ecobe/handoffs`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-400 transition"
              >
                <Activity className="w-4 h-4" />
                ECOBE Pipeline
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Lead Info */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {lead.title || 'Untitled Lead'}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-sm rounded-full border ${getStatusBg(lead.status)} ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                    <span className="text-slate-400 text-sm">
                      Score: <span className="font-medium text-white">{lead.score}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">Created</div>
                  <div className="text-white">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Snippet */}
              {lead.snippet && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
                  <p className="text-slate-300 leading-relaxed">{lead.snippet}</p>
                </div>
              )}

              {/* Source */}
              {lead.sourceUrl && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Source</h3>
                  <a
                    href={lead.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Source
                  </a>
                </div>
              )}

              {/* Enrichment Data */}
              {lead.meta && Object.keys(lead.meta).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Enrichment Data</h3>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
                      {JSON.stringify(lead.meta, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
              <h2 className="text-xl font-bold text-white mb-6">Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    // Update lead status logic here
                    console.log('Mark as contacted')
                  }}
                  className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-left transition"
                >
                  <div className="font-semibold text-white mb-1">Mark as Contacted</div>
                  <div className="text-sm text-slate-400">Update lead status</div>
                </button>

                <button
                  onClick={() => {
                    // Archive lead logic here
                    console.log('Archive lead')
                  }}
                  className="p-4 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 rounded-lg text-left transition"
                >
                  <div className="font-semibold text-white mb-1">Archive Lead</div>
                  <div className="text-sm text-slate-400">Hide from active list</div>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* ECOBE Handoff Section */}
            <LeadHandoffSection
              lead={lead}
              existingHandoff={handoff}
              onHandoffCreated={(newHandoff) => setHandoff(newHandoff)}
            />

            {/* Quick Stats */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-slate-400">Lead Score</div>
                  <div className="text-2xl font-bold text-white">{lead.score}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Status</div>
                  <div className={`px-2 py-1 text-sm rounded-full border ${getStatusBg(lead.status)} ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Age</div>
                  <div className="text-white">
                    {Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
