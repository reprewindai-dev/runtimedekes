"use client"

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Brain,
  Sparkles,
  PlayCircle,
  ShieldCheck,
  BarChart3,
  LineChart,
  Globe,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export default function LandingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [persona, setPersona] = useState<'revenue' | 'sales' | 'marketing'>('revenue')

  const pricingPlans = useMemo(() => {
    const starterMonthly = 49
    const growthMonthly = 99
    const proMonthly = 199

    const annualMultiplier = 0.8
    const starterAnnual = Math.round(starterMonthly * 12 * annualMultiplier)
    const growthAnnual = Math.round(growthMonthly * 12 * annualMultiplier)
    const proAnnual = Math.round(proMonthly * 12 * annualMultiplier)

    return [
      {
        name: 'Starter',
        priceLabel: billing === 'monthly' ? `$${starterMonthly}` : `$${starterAnnual}`,
        priceMeta: billing === 'monthly' ? '/month' : '/year',
        popular: false,
        highlight: 'Perfect for testing the waters.',
        features: [
          '100 qualified leads/month',
          '5 active scans',
          'Basic scoring',
          'Email support',
        ],
      },
      {
        name: 'Growth',
        priceLabel: billing === 'monthly' ? `$${growthMonthly}` : `$${growthAnnual}`,
        priceMeta: billing === 'monthly' ? '/month' : '/year',
        popular: true,
        highlight: 'Close one deal and this pays for itself.',
        features: [
          '500 qualified leads/month',
          '20 active scans',
          'Advanced scoring',
          'Contact enrichment',
          'Priority support',
        ],
      },
      {
        name: 'Pro',
        priceLabel: billing === 'monthly' ? `$${proMonthly}` : `$${proAnnual}`,
        priceMeta: billing === 'monthly' ? '/month' : '/year',
        popular: false,
        highlight: 'For teams that need scale and SLAs.',
        features: [
          '2,000 qualified leads/month',
          'Unlimited scans',
          'Custom scoring weights',
          'API access',
          'Dedicated success manager',
          'SLA guarantee',
        ],
      },
    ]
  }, [billing])

  const activePersona = personaDemo[persona]

  return (
    <div className="min-h-screen bg-[#030712] text-[#E6EDF7]">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-3/4 rounded-full bg-[#1F6BFF]/30 blur-[120px]" />
        <div className="absolute top-64 right-1/2 h-96 w-96 translate-x-1/3 rounded-full bg-[#00D1C7]/20 blur-[160px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#050A16]/80 backdrop-blur-2xl border-b border-[#1F2A3D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#121A2B] border border-[#1F2A3D] rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-[#00D1C7]" />
              </div>
              <span className="text-xl font-bold text-[#E6EDF7]">DEKES</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#problem" className="text-[#9FB3C8] hover:text-[#E6EDF7] transition">Problem</Link>
              <Link href="#how-it-works" className="text-[#9FB3C8] hover:text-[#E6EDF7] transition">How it works</Link>
              <Link href="#live-demo" className="text-[#9FB3C8] hover:text-[#E6EDF7] transition">Live demo</Link>
              <Link href="#pricing" className="text-[#9FB3C8] hover:text-[#E6EDF7] transition">Pricing</Link>
              <Link href="/auth/login" className="text-[#9FB3C8] hover:text-[#E6EDF7] transition">Login</Link>
              <Link href="/demo" className="px-4 py-2 bg-[#00D1C7] hover:bg-[#00B5AC] text-[#050A16] rounded-lg transition font-medium">
                See Live Demo
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#0C1424]/70 border border-[#1F2A3D] rounded-full mb-8">
              <Zap className="w-4 h-4 text-[#00D1C7]" />
              <span className="text-sm text-[#B0C6E3] font-medium">Timing Intelligence for Revenue Teams</span>
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold text-[#F5F8FF] mb-6 leading-tight tracking-tight">
              Stop Wasting SDR Time on Accounts That Were
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D1C7] via-[#1F6BFF] to-[#7B61FF]">Never Going to Buy.</span>
            </h1>

            <p className="text-xl text-[#9FB3C8] max-w-2xl mb-10 leading-relaxed">
              DEKES identifies companies already in active buying cycles, verifies real intent, and delivers sales-ready accounts&mdash;so your team spends less time prospecting and more time closing.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
              <Link
                href="/demo"
                className="px-8 py-4 bg-[#00D1C7] hover:bg-[#00B5AC] text-[#041022] rounded-2xl font-semibold text-lg transition flex items-center space-x-2 group shadow-[0_10px_30px_rgba(0,209,199,0.35)]"
              >
                <span>See Live Demo</span>
                <PlayCircle className="w-5 h-5 group-hover:scale-110 transition" />
              </Link>
              <Link
                href="/auth/signup"
                className="px-8 py-4 bg-[#101A2E]/80 hover:bg-[#101A2E] border border-[#1F2A3D] text-[#E6EDF7] rounded-2xl font-semibold text-lg transition flex items-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="mt-10 text-sm text-[#9FB3C8] flex flex-col sm:flex-row gap-2 sm:items-center">
              <span>No credit card required</span>
              <span className="hidden sm:inline text-[#1F6BFF]">&bull;</span>
              <span>Cancel anytime</span>
              <span className="hidden sm:inline text-[#1F6BFF]">&bull;</span>
              <span>See results in 24 hours</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-[#11203D] to-[#091120] blur-2xl opacity-70" aria-hidden />
            <div className="relative p-8 rounded-[32px] border border-[#1F2A3D] bg-[#050A16]/90 backdrop-blur-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-[#9FB3C8]">Buying signal detected</p>
                  <p className="text-2xl font-bold text-white">Mid-Market Fintech &mdash; Security Eval</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#00D1C7]/15 text-[#00D1C7]">LIVE SIGNAL</span>
              </div>
              <div className="space-y-4">
                {heroSignals.map((signal) => (
                  <div key={signal.label} className="p-4 rounded-2xl border border-[#1F2A3D] bg-[#0B1424]">
                    <div className="text-sm text-[#9FB3C8] flex items-center gap-2">
                      <signal.icon className="w-4 h-4 text-[#1F6BFF]" />
                      {signal.label}
                    </div>
                    <p className="text-lg font-semibold text-white mt-1">{signal.value}</p>
                    <p className="text-sm text-[#72819A]">{signal.meta}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-[#071021] border border-[#1F6BFF]/30">
                <p className="text-sm text-[#9FB3C8]">Confidence</p>
                <p className="text-lg font-semibold text-white">94% &mdash; Outreach recommended within 48h</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Positioning Strip */}
      <section className="py-16 px-4 border-y border-[#101A2E] bg-[#060B17]/70">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-2xl md:text-3xl font-semibold text-white leading-relaxed">
            Most tools give you <span className="text-[#9FB3C8]">leads</span>.
            <br />
            DEKES gives you <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D1C7] to-[#1F6BFF]">timing</span>.
          </p>
          <p className="mt-4 text-lg text-[#72819A]">
            And timing is what determines whether a deal happens&mdash;or doesn&apos;t.
          </p>
        </div>
      </section>

      {/* Pain Section */}
      <section id="problem" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#E6EDF7] mb-6 tracking-tight">
              Outbound isn&apos;t broken because of targeting.
              <br />
              <span className="text-[#9FB3C8]">It&apos;s broken because of timing.</span>
            </h2>
          </div>

          <div className="max-w-3xl mx-auto mb-16">
            <p className="text-lg text-[#9FB3C8] leading-relaxed text-center">
              Your team reaches out:
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="p-6 bg-[#121A2B] border border-[#1F2A3D] rounded-2xl text-center">
                <Clock className="w-8 h-8 text-[#9FB3C8] mx-auto mb-3" />
                <p className="text-lg font-semibold text-white mb-2">Too early</p>
                <p className="text-[#72819A]">Ignored. They&apos;re not even thinking about solutions yet.</p>
              </div>
              <div className="p-6 bg-[#121A2B] border border-[#1F2A3D] rounded-2xl text-center">
                <AlertTriangle className="w-8 h-8 text-[#9FB3C8] mx-auto mb-3" />
                <p className="text-lg font-semibold text-white mb-2">Too late</p>
                <p className="text-[#72819A]">Competitor already engaged. Deal is half done without you.</p>
              </div>
              <div className="p-6 bg-[#121A2B] border border-[#1F2A3D] rounded-2xl text-center">
                <XCircle className="w-8 h-8 text-[#9FB3C8] mx-auto mb-3" />
                <p className="text-lg font-semibold text-white mb-2">Burned hours</p>
                <p className="text-[#72819A]">SDRs waste time on accounts that were never going to convert.</p>
              </div>
            </div>
            <p className="text-lg text-[#9FB3C8] leading-relaxed text-center mt-10">
              Meanwhile, real buyers are already moving&mdash;you just don&apos;t see them.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-4 bg-[#050B17] border-y border-[#0E172B]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#E6EDF7] mb-6 tracking-tight">
              DEKES finds buying behavior
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D1C7] to-[#1F6BFF]">while it&apos;s happening.</span> Not after.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {solutionPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-4 p-6 bg-[#121A2B] border border-[#1F2A3D] rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-[#00D1C7] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-white mb-1">{point.title}</p>
                  <p className="text-[#9FB3C8]">{point.description}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-12 text-xl font-semibold text-[#E6EDF7]">
            You don&apos;t generate demand. <span className="text-[#00D1C7]">You intercept it.</span>
          </p>
        </div>
      </section>

      {/* Differentiation */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#00D1C7] uppercase tracking-[0.3em]">Why DEKES is different</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold text-white">
              We filter signals <span className="text-[#9FB3C8]">before</span> they reach you.
            </h2>
            <p className="mt-4 text-lg text-[#9FB3C8] max-w-2xl mx-auto">
              Most intent tools dump signals into your pipeline. DEKES filters them before they ever reach you.
            </p>
          </div>

          <div className="space-y-4">
            {differentiators.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-5 bg-[#0B1220]/70 border border-[#1F2A3D] rounded-2xl">
                <ShieldCheck className="w-6 h-6 text-[#1F6BFF] flex-shrink-0 mt-1" />
                <p className="text-[#E6EDF7] text-lg">{item}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-lg text-[#9FB3C8]">
            No inflated &ldquo;intent data.&rdquo; No guessing.<br />
            <span className="text-white font-semibold">Only accounts that are actually in-market.</span>
          </p>
        </div>
      </section>

      {/* Mechanism: How it Works */}
      <section id="how-it-works" className="py-24 px-4 bg-[#050B17] border-y border-[#0E172B]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#E6EDF7] mb-6 tracking-tight">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {mechanism.map((step) => (
              <div key={step.title} className="p-8 bg-[#121A2B] border border-[#1F2A3D] rounded-2xl">
                <div className="w-14 h-14 bg-[#0B1220] border border-[#1F2A3D] rounded-xl flex items-center justify-center mb-5">
                  <step.icon className="w-7 h-7 text-[#00D1C7]" />
                </div>
                <div className="text-sm font-semibold text-[#00D1C7] mb-3">Step {step.step}</div>
                <h3 className="text-2xl font-bold text-[#E6EDF7] mb-3">{step.title}</h3>
                <p className="text-[#9FB3C8] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Output: What You Actually Get */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#E6EDF7] mb-6 tracking-tight">
              What You Actually Get
            </h2>
            <p className="text-xl text-[#9FB3C8] max-w-3xl mx-auto">
              Each account comes with everything you need to start a conversation&mdash;and win it.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {outputItems.map((item, idx) => (
              <div key={idx} className="p-6 bg-[#121A2B] border border-[#1F2A3D] rounded-2xl">
                <item.icon className="w-8 h-8 text-[#1F6BFF] mb-4" />
                <h3 className="text-lg font-semibold text-[#E6EDF7] mb-2">{item.title}</h3>
                <p className="text-[#9FB3C8] text-sm">{item.description}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-lg text-[#9FB3C8]">
            Not just data. <span className="text-white font-semibold">A reason to reach out&mdash;and a way to win the conversation.</span>
          </p>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-24 px-4 bg-[#050B17] border-y border-[#0E172B]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl border border-[#1F2A3D] bg-[#0B1220]/70">
            <p className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-6">Without DEKES</p>
            <ul className="space-y-4">
              {withoutDekes.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-[#9FB3C8]">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8 rounded-2xl border border-[#00D1C7]/30 bg-[#0B1220]/70">
            <p className="text-sm font-semibold text-[#00D1C7] uppercase tracking-wide mb-6">With DEKES</p>
            <ul className="space-y-4">
              {withDekes.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-[#E6EDF7]">
                  <CheckCircle2 className="w-5 h-5 text-[#00D1C7] flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Real Scenario */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-[#00D1C7] uppercase tracking-[0.3em]">Real scenario</p>
          </div>
          <div className="p-8 rounded-2xl border border-[#1F2A3D] bg-[#121A2B]">
            <p className="text-xl text-[#E6EDF7] leading-relaxed mb-6">
              A mid-market fintech company begins evaluating new security vendors.
            </p>
            <div className="mb-6">
              <p className="text-sm font-semibold text-[#9FB3C8] uppercase tracking-wide mb-3">Signals detected:</p>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 rounded-full border border-[#1F2A3D] text-[#E6EDF7] text-sm">Active product comparisons</span>
                <span className="px-4 py-2 rounded-full border border-[#1F2A3D] text-[#E6EDF7] text-sm">Hiring for security roles</span>
                <span className="px-4 py-2 rounded-full border border-[#1F2A3D] text-[#E6EDF7] text-sm">Increased research activity</span>
              </div>
            </div>
            <p className="text-lg text-[#9FB3C8] leading-relaxed">
              DEKES verifies the pattern and flags the account. Sales reaches out with context &rarr; gets a reply &rarr; enters pipeline <span className="text-[#00D1C7] font-semibold">before competitors</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <section id="live-demo" className="py-24 px-4 bg-[#050B17] border-y border-[#0E172B]">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold text-[#00D1C7] uppercase tracking-[0.3em]">Try before you buy</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold text-white">See it work on real data.</h2>
            <p className="mt-4 text-lg text-[#9FB3C8]">
              Spin up a live run on real buyer signals without touching your CRM. Select your team profile and see how DEKES prioritizes accounts, enriches contacts, and delivers them to your reps.
            </p>
            <ul className="mt-8 space-y-4 text-[#9FB3C8]">
              {demoBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00D1C7] mt-0.5" />
                  {benefit}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/demo" className="px-6 py-3 rounded-2xl bg-[#00D1C7] text-[#041022] font-semibold flex items-center gap-2">
                See Live Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/auth/signup" className="px-6 py-3 rounded-2xl border border-[#1F6BFF] text-[#E6EDF7] font-semibold">
                Create Account
              </Link>
            </div>
          </div>
          <div className="p-8 rounded-3xl border border-[#1F2A3D] bg-[#090F1E]/80 backdrop-blur-xl">
            <div className="flex gap-2 mb-6">
              {personaOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPersona(option.key)}
                  className={`flex-1 px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                    persona === option.key ? 'bg-[#1F6BFF] text-white' : 'bg-[#0E172B] text-[#9FB3C8] border border-[#1F2A3D]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#0B1424] border border-[#1F2A3D]">
                <p className="text-sm text-[#72819A]">Objective</p>
                <p className="text-xl font-semibold text-white mt-1">{activePersona.objective}</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#0B1424] border border-[#1F2A3D]">
                <p className="text-sm text-[#72819A]">Sample output</p>
                <p className="text-[#E6EDF7] text-base leading-relaxed">{activePersona.output}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activePersona.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs border border-[#1F2A3D] text-[#9FB3C8]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#0B1424] border border-[#1F2A3D]">
                <p className="text-sm text-[#72819A]">What happens next</p>
                <p className="text-[#E6EDF7] text-base">{activePersona.next}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Truth */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            You don&apos;t lose deals because of bad leads.
          </h2>
          <p className="text-2xl text-[#9FB3C8] mb-4">
            You lose deals because you showed up at the wrong time.
          </p>
          <p className="text-2xl font-semibold text-[#00D1C7]">
            DEKES fixes timing. And timing is what closes deals.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-[#030712]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#E6EDF7] mb-6 tracking-tight">
              Pricing
            </h2>
            <p className="text-xl text-[#9FB3C8]">
              Close one deal and this pays for itself.
            </p>
          </div>

          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex items-center gap-2 p-1 bg-[#121A2B] border border-[#1F2A3D] rounded-xl">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${billing === 'monthly' ? 'bg-[#1F6BFF] text-white' : 'text-[#9FB3C8] hover:text-[#E6EDF7]'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${billing === 'annual' ? 'bg-[#1F6BFF] text-white' : 'text-[#9FB3C8] hover:text-[#E6EDF7]'}`}
              >
                Annual
              </button>
              <div className="px-3 py-1 text-xs font-semibold text-[#00D1C7]">Save 20%</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-2xl border ${plan.popular ? 'bg-[#121A2B] border-[#1F6BFF] md:scale-105' : 'bg-[#121A2B] border-[#1F2A3D]'}`}
              >
                {plan.popular && (
                  <div className="inline-block px-3 py-1 bg-[#1F6BFF] text-white text-xs font-semibold rounded-full mb-4">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold text-[#E6EDF7] mb-2">{plan.name}</h3>
                <div className="flex items-baseline mb-2">
                  <span className="text-5xl font-bold text-[#E6EDF7]">{plan.priceLabel}</span>
                  <span className="text-[#9FB3C8] ml-2">{plan.priceMeta}</span>
                </div>
                <div className="text-sm text-[#9FB3C8] mb-6">{plan.highlight}</div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-[#00D1C7] flex-shrink-0 mt-0.5" />
                      <span className="text-[#E6EDF7]">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className={`block w-full py-3 rounded-xl font-semibold text-center transition ${plan.popular ? 'bg-[#1F6BFF] hover:bg-[#1F6BFF]/90 text-white' : 'bg-[#0B1220] hover:bg-[#0B1220]/80 border border-[#1F2A3D] text-[#E6EDF7]'}`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[#E6EDF7] mb-6 tracking-tight">
            Stop chasing cold accounts.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D1C7] to-[#1F6BFF]">Start closing buyers who are already in motion.</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link href="/demo" className="inline-flex items-center space-x-2 px-8 py-4 bg-[#00D1C7] hover:bg-[#00B5AC] text-[#041022] rounded-xl font-semibold text-lg transition group">
              <span>See Live Demo</span>
              <PlayCircle className="w-5 h-5" />
            </Link>
            <Link href="/auth/signup" className="inline-flex items-center space-x-2 px-8 py-4 border border-[#1F6BFF] text-white rounded-xl font-semibold text-lg transition group">
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-[#1F2A3D]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-[#121A2B] border border-[#1F2A3D] rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-[#00D1C7]" />
              </div>
              <span className="text-lg font-bold text-[#E6EDF7]">DEKES</span>
            </div>
            <div className="text-sm text-[#9FB3C8]">
              &copy; 2026 DEKES. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─── Data ─────────────────────────────────────────────────────────────────── */

type PersonaKey = 'revenue' | 'sales' | 'marketing'

type PersonaDemo = {
  objective: string
  output: string
  tags: string[]
  next: string
}

type HeroSignal = {
  icon: LucideIcon
  label: string
  value: string
  meta: string
}

const heroSignals: HeroSignal[] = [
  {
    icon: Search,
    label: 'Trigger: Active product evaluation',
    value: 'Comparing security vendors across 3 review sites',
    meta: 'Confidence 94% · First detected 36h ago',
  },
  {
    icon: Users,
    label: 'Signal: Hiring pattern',
    value: 'Posted 2 security engineering roles this week',
    meta: 'Correlates with vendor evaluation in 78% of cases',
  },
  {
    icon: TrendingUp,
    label: 'Signal: Research spike',
    value: '4x increase in security content consumption',
    meta: 'Cross-validated across multiple sources',
  },
]

const solutionPoints = [
  {
    title: 'Companies actively evaluating solutions',
    description: 'Not cold accounts. Companies that are already researching, comparing, and building internal buy-cases.',
  },
  {
    title: 'Verified signals, not scraped noise',
    description: 'Every signal is cross-checked against multiple sources before it ever reaches your pipeline.',
  },
  {
    title: 'Context on why they\'re buying',
    description: 'Trigger events, hiring patterns, and research activity that tell you exactly what\'s driving the purchase.',
  },
  {
    title: 'The right moment to reach out',
    description: 'Timing scores and urgency windows so your team connects when buyers are most receptive.',
  },
]

const differentiators = [
  'Every account is validated across multiple sources before delivery',
  'Signals are checked for real buying patterns, not just website visits',
  'Each account is scored for timing and relevance to your ICP',
  'False positives are eliminated before they waste your reps\' time',
]

const mechanism: Array<{ icon: LucideIcon; step: string; title: string; description: string }> = [
  {
    icon: Search,
    step: '1',
    title: 'Detect',
    description: 'We monitor real-time activity across the web to identify buying behavior. Product comparisons, hiring signals, research spikes, and vendor evaluations.',
  },
  {
    icon: Filter,
    step: '2',
    title: 'Validate',
    description: 'Signals are cross-checked to eliminate false positives and noise. Multi-source verification ensures only real buying patterns make it through.',
  },
  {
    icon: Send,
    step: '3',
    title: 'Deliver',
    description: 'You receive accounts with context, timing, and outreach direction\u2014ready to act immediately. No research required by your reps.',
  },
]

const outputItems: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Users,
    title: 'Company + decision-maker context',
    description: 'Who the company is, who to reach, and their role in the buying process.',
  },
  {
    icon: Zap,
    title: 'Trigger event',
    description: 'What they did that signals active buying behavior right now.',
  },
  {
    icon: Brain,
    title: 'Why they\'re likely buying',
    description: 'The business context and urgency behind their evaluation.',
  },
  {
    icon: Target,
    title: 'Suggested outreach angle',
    description: 'A recommended approach based on their specific buying signals.',
  },
  {
    icon: BarChart3,
    title: 'Confidence score',
    description: 'A clear signal strength rating so you know which accounts to prioritize.',
  },
]

const withoutDekes = [
  'Cold lists with no buying context',
  'Low reply rates from bad timing',
  'Random outreach with no signal validation',
  'Wasted SDR hours on accounts that never convert',
]

const withDekes = [
  'Verified buying signals with source proof',
  'Better-timed outreach that gets replies',
  'Higher-quality conversations from day one',
  'Pipeline that actually converts to revenue',
]

const demoBenefits = [
  'See real buyer signals streaming live',
  'Switch personas to preview revenue, sales, or marketing use cases',
  'Understand scoring logic and validation proof',
  'Export enriched leads into your outbound motion instantly',
]

const personaOptions: Array<{ key: PersonaKey; label: string }> = [
  { key: 'revenue', label: 'Revenue Ops' },
  { key: 'sales', label: 'Sales Leadership' },
  { key: 'marketing', label: 'Growth Marketing' },
]

const personaDemo: Record<PersonaKey, PersonaDemo> = {
  revenue: {
    objective: 'Build a governed intent feed that finance will approve.',
    output:
      '12 accounts prioritized for Q2 expansion with proof artifacts attached. Accounts synced to Salesforce "Intent - Tier 1" queue.',
    tags: ['Governance', 'Salesforce', 'Audit Trail'],
    next: 'Auto-send compliance summary to CRO + RevOps inbox.',
  },
  sales: {
    objective: 'Fill rep pipelines with net-new, sales-ready buyers.',
    output:
      '8 verified buyers flagged with urgency score >92, mapped to owning reps, enriched with champion contact info.',
    tags: ['Rep Routing', 'Urgency Score', 'Contact Enrichment'],
    next: 'Notify responsible reps in Slack with recommended outreach sequence.',
  },
  marketing: {
    objective: 'Fuel ABM plays with live-intent cohorts.',
    output:
      'Marketing list of 25 accounts showing active replatform research, bundled with messaging angles + creative brief.',
    tags: ['ABM', 'Creative Brief', 'Campaign Ready'],
    next: 'Sync cohort to HubSpot, trigger paid media exclusion/inclusion rules.',
  },
}
