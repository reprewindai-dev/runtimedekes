'use client'

import { useState } from 'react'
import { ExternalLink, Send, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

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

interface QualificationResult {
  isQualified: boolean
  reason: string
  score: number
  signals: string[]
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

interface LeadHandoffSectionProps {
  lead: Lead
  existingHandoff?: EcobeHandoff | null
  onHandoffCreated?: (handoff: EcobeHandoff) => void
}

export default function LeadHandoffSection({ 
  lead, 
  existingHandoff, 
  onHandoffCreated 
}: LeadHandoffSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONVERTED': return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'ACCEPTED': return <CheckCircle className="w-5 h-5 text-blue-400" />
      case 'SENT': return <Clock className="w-5 h-5 text-yellow-400" />
      case 'FAILED': return <XCircle className="w-5 h-5 text-red-400" />
      default: return <Clock className="w-5 h-5 text-slate-400" />
    }
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

  const handleHandoff = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/ecobe/handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ leadId: lead.id }),
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create handoff')
      }

      setSuccess(true)
      onHandoffCreated?.(data)

      // Refresh after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString()
  }

  // If there's already a handoff, show its status
  if (existingHandoff) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            {getStatusIcon(existingHandoff.status)}
            ECOBE Handoff Status
          </h3>
          <span className={`px-3 py-1 text-sm rounded-full border ${getStatusBg(existingHandoff.status)} ${getStatusColor(existingHandoff.status)}`}>
            {existingHandoff.status}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-slate-400 mb-1">Qualification Score</div>
            <div className="text-white font-medium">
              {existingHandoff.qualificationScore || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-400 mb-1">Reason</div>
            <div className="text-white font-medium text-sm">
              {existingHandoff.qualificationReason || 'No reason provided'}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-400 mb-1">Created</div>
            <div className="text-white font-medium">
              {formatDate(existingHandoff.createdAt)}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-400 mb-1">Sent</div>
            <div className="text-white font-medium">
              {formatDate(existingHandoff.sentAt) || 'Not sent yet'}
            </div>
          </div>
        </div>

        {existingHandoff.convertedAt && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Converted!</span>
            </div>
            <div className="text-sm text-slate-300">
              This lead was successfully converted through ECOBE on {formatDate(existingHandoff.convertedAt)}
            </div>
          </div>
        )}

        {existingHandoff.status === 'FAILED' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Handoff Failed</span>
            </div>
            <div className="text-sm text-slate-300">
              The handoff failed after {existingHandoff.attempts} attempts. This may be due to ECOBE API issues or invalid lead data.
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => window.open(`/ecobe/handoffs`, '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-400 transition"
          >
            <ExternalLink className="w-4 h-4" />
            View in ECOBE
          </button>
        </div>
      </div>
    )
  }

  // Check if lead might be qualified (basic heuristics)
  const isLikelyQualified = lead.score >= 70 && lead.status === 'NEW'

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-cyan-400" />
          ECOBE Handoff
        </h3>
        {isLikelyQualified && (
          <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
            Qualified
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="text-sm text-slate-400 mb-2">Lead Score</div>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-white">{lead.score}</div>
          <div className={`px-2 py-1 text-xs rounded-full ${
            lead.score >= 70 
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : lead.score >= 50
              ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {lead.score >= 70 ? 'High' : lead.score >= 50 ? 'Medium' : 'Low'}
          </div>
        </div>
      </div>

      {!isLikelyQualified && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Qualification Required</span>
          </div>
          <div className="text-sm text-slate-300">
            This lead may not meet ECOBE qualification criteria. Leads with higher scores and better intent signals perform better.
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <div className="text-sm text-slate-300">{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Handoff Created!</span>
          </div>
          <div className="text-sm text-slate-300">
            The lead has been queued for handoff to ECOBE. Status will update shortly.
          </div>
        </div>
      )}

      <button
        onClick={handleHandoff}
        disabled={loading || success}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Creating Handoff...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send to ECOBE
          </>
        )}
      </button>

      <div className="mt-4 text-xs text-slate-400">
        <div className="mb-1">ECOBE qualification criteria:</div>
        <ul className="space-y-1 ml-4">
          <li>• Lead score ≥ 70</li>
          <li>• High-intent keywords detected</li>
          <li>• Valid contact information</li>
          <li>• Company size & funding signals</li>
        </ul>
      </div>
    </div>
  )
}
