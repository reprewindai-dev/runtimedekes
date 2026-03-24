'use client'

import { Leaf, MapPin, Zap, Shield, Clock, ExternalLink } from 'lucide-react'

export type RunRoutingData = {
  action: 'execute' | 'delay' | 'reroute'
  decisionId: string
  selectedRegion?: string
  cleanWindowRegion?: string
  carbonDelta?: number | null
  qualityTier?: string | null
  policyAction?: string | null
  decisionTimestamp?: string
  retryAfterMinutes?: number
}

type Props = {
  routing: RunRoutingData
}

const ACTION_STYLES = {
  execute: {
    badge: 'bg-green-500/15 text-green-400 border border-green-500/30',
    dot: 'bg-green-400',
    label: 'Execute',
  },
  reroute: {
    badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    dot: 'bg-blue-400',
    label: 'Rerouted',
  },
  delay: {
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    dot: 'bg-amber-400',
    label: 'Delayed',
  },
}

function ecobeDashboardUrl(decisionId: string): string {
  const base = (
    process.env.NEXT_PUBLIC_ECOBE_DASHBOARD_URL || 'https://app.ecobe.dev'
  ).replace(/\/+$/, '')
  return `${base}/decisions/${decisionId}`
}

export default function RunRoutingCard({ routing }: Props) {
  const style = ACTION_STYLES[routing.action]
  const region = routing.selectedRegion ?? routing.cleanWindowRegion

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-green-400" />
          </div>
          <span className="text-white font-semibold text-sm">Carbon-Aware Routing</span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Selected region */}
        <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-xs">
              {routing.action === 'delay' ? 'Clean Window Region' : 'Selected Region'}
            </span>
          </div>
          <div className="text-white text-sm font-medium">{region ?? '—'}</div>
        </div>

        {/* Carbon delta */}
        <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-xs">Carbon Delta</span>
          </div>
          <div className="text-white text-sm font-medium">
            {routing.carbonDelta != null
              ? `${routing.carbonDelta > 0 ? '+' : ''}${routing.carbonDelta.toFixed(1)} g CO₂`
              : '—'}
          </div>
        </div>

        {/* Quality tier */}
        <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-xs">Quality Tier</span>
          </div>
          <div className="text-white text-sm font-medium capitalize">
            {routing.qualityTier ?? '—'}
          </div>
        </div>

        {/* Delay info or policy action */}
        <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-xs">
              {routing.action === 'delay' ? 'Delay Applied' : 'Policy Action'}
            </span>
          </div>
          <div className="text-white text-sm font-medium">
            {routing.action === 'delay'
              ? routing.retryAfterMinutes != null
                ? `${routing.retryAfterMinutes} min`
                : 'Pending'
              : (routing.policyAction ?? '—')}
          </div>
        </div>
      </div>

      {/* Decision replay link */}
      <a
        href={ecobeDashboardUrl(routing.decisionId)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-green-400 transition"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View decision replay in ECOBE dashboard
        <span className="text-slate-600 font-mono ml-auto">{routing.decisionId.slice(0, 12)}…</span>
      </a>
    </div>
  )
}
