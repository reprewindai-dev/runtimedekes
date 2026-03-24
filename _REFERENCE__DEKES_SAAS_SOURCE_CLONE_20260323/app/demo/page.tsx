"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'

type DemoStage = 'idle' | 'running' | 'complete'

const sampleSignals = [
  {
    title: 'Signal Stack',
    value: 'Security leadership expansion + RFP issued',
    detail: 'Validated via hiring feed + dark funnel chatter'
  },
  {
    title: 'Champion Contact',
    value: 'Jordan Patel – VP Security',
    detail: 'Email, LinkedIn, buying role, urgency score 94'
  },
  {
    title: 'Recommended Action',
    value: 'Trigger 4-touch outbound + LinkedIn voice drop',
    detail: 'Auto-sync to Salesforce Intent Queue'
  }
]

const sampleDeliverables = [
  { label: 'Qualified buyers', value: '12 accounts' },
  { label: 'Intent accuracy', value: '91%' },
  { label: 'Pipeline lift projection', value: '3.1x in 60 days' },
  { label: 'Compliance packet', value: 'SOC2 + audit log ready' }
]

export default function DemoPage() {
  const [stage, setStage] = useState<DemoStage>('idle')
  const [elapsed, setElapsed] = useState(0)

  const loadingCopy = useMemo(() => {
    if (elapsed < 2) return 'Calibrating signal capture grid…'
    if (elapsed < 4) return 'Validating multi-signal intent packets…'
    return 'Routing prioritized buyers into your outbound motion…'
  }, [elapsed])

  function launchDemo() {
    setStage('running')
    setElapsed(0)
    const steps = [500, 1300, 800]
    let idx = 0

    const advance = () => {
      setElapsed((prev) => prev + 1)
      if (idx < steps.length) {
        const current = idx
        idx += 1
        setTimeout(() => {
          if (current === steps.length - 1) {
            setStage('complete')
          } else {
            advance()
          }
        }, steps[current])
      }
    }

    advance()
  }

  return (
    <div className="min-h-screen bg-[#030712] text-[#E6EDF7]">
      <header className="border-b border-[#101A2E] bg-[#050A16]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-wide">DEKES</Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-[#9FB3C8] hover:text-white transition">
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-[#00D1C7] text-[#041022] rounded-xl font-semibold text-sm"
            >
              Start Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <section className="text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-[#00D1C7]">Live sandbox</p>
          <h1 className="text-4xl md:text-5xl font-bold">Launch a lead intelligence run without logging in.</h1>
          <p className="text-lg text-[#9FB3C8] max-w-3xl mx-auto">
            This production-grade sandbox mirrors the exact workflow revenue teams use. We anonymized the data but
            kept the scoring, routing, and governance layers intact so you can see how DEKES performs in under 60
            seconds.
          </p>
        </section>

        <section className="grid lg:grid-cols-2 gap-8">
          <div className="p-6 rounded-3xl border border-[#1F2A3D] bg-[#050A16]/80 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#9FB3C8] mb-2">Ideal buyer narrative</label>
              <textarea
                defaultValue="Security orgs rolling out zero-trust across US+EU with public announcements in last 30 days"
                className="w-full rounded-2xl bg-[#0B1424] border border-[#1F2A3D] text-white p-4"
                readOnly
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#9FB3C8] mb-2">Projected leads</label>
                <input value="120" readOnly className="w-full rounded-xl bg-[#0B1424] border border-[#1F2A3D] text-white px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9FB3C8] mb-2">Carbon budget</label>
                <input value="10,000 gCO₂" readOnly className="w-full rounded-xl bg-[#0B1424] border border-[#1F2A3D] text-white px-4 py-3" />
              </div>
            </div>
            <button
              onClick={launchDemo}
              disabled={stage === 'running'}
              className="w-full py-4 rounded-2xl font-semibold text-lg transition flex items-center justify-center gap-2
              bg-[#00D1C7] text-[#041022] disabled:bg-[#1F2A3D] disabled:text-[#9FB3C8]"
            >
              {stage === 'running' ? 'Running live sandbox…' : 'Launch live demo run'}
            </button>
            {stage === 'running' && (
              <div className="text-sm text-[#9FB3C8] text-center italic">{loadingCopy}</div>
            )}
          </div>

          <div className="p-6 rounded-3xl border border-[#1F2A3D] bg-[#090F1E]/80 space-y-6 min-h-[360px]">
            {stage === 'idle' && (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#9FB3C8] space-y-3">
                <p>Trigger the sandbox to see qualified buyers, proof packets, and routing recommendations.</p>
                <p className="text-sm">No install. No forms. Real infrastructure.</p>
              </div>
            )}

            {stage !== 'idle' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {sampleDeliverables.map((metric) => (
                    <div key={metric.label} className="flex-1 min-w-[140px] p-4 rounded-2xl bg-[#0B1424] border border-[#1F2A3D]">
                      <div className="text-xs text-[#72819A] uppercase tracking-wide">{metric.label}</div>
                      <div className="text-xl font-semibold mt-1">{metric.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {sampleSignals.map((signal) => (
                    <div key={signal.title} className="p-4 rounded-2xl bg-[#050A16] border border-[#1F2A3D]">
                      <div className="text-sm text-[#72819A] uppercase tracking-wide">{signal.title}</div>
                      <div className="text-lg font-semibold text-white mt-1">{signal.value}</div>
                      <div className="text-sm text-[#9FB3C8]">{signal.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {stage === 'complete' && (
          <section className="p-8 rounded-3xl border border-[#1F2A3D] bg-gradient-to-br from-[#050B17] to-[#030712] text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to unlock the real pipeline?</h2>
            <p className="text-lg text-[#9FB3C8]">
              Create your account to run unlimited searches, invite your team, and sync buyers directly into Salesforce,
              HubSpot, or webhooks with governance controls.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <Link href="/auth/signup" className="px-8 py-4 bg-[#00D1C7] text-[#041022] rounded-2xl text-lg font-semibold">
                Start 14-day trial
              </Link>
              <Link href="/runs/new" className="px-8 py-4 border border-[#1F6BFF] text-white rounded-2xl text-lg font-semibold">
                Log in & deploy
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
