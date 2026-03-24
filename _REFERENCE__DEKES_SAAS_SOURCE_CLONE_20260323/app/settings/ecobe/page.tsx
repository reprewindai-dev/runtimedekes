'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface EcobeSettings {
  enabled: boolean
  apiKey: string
  baseUrl: string
  webhookSecret: string
  autoHandoff: boolean
  minQualificationScore: number
}

export default function EcobeSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<EcobeSettings>({
    enabled: false,
    apiKey: '',
    baseUrl: 'https://ecobe-engineclaude-production.up.railway.app',
    webhookSecret: '',
    autoHandoff: true,
    minQualificationScore: 70,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Load current settings
    fetch('/api/settings/ecobe', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setSettings(data.settings)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings/ecobe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings/ecobe/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
        }),
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Connection test failed')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading settings...</div>
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
                  <div className="w-5 h-5 bg-white rounded-sm"></div>
                </div>
                <span className="text-xl font-bold text-white">ECOBE Settings</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <div className="text-sm text-slate-300 mt-1">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Success</span>
            </div>
            <div className="text-sm text-slate-300 mt-1">Settings saved successfully</div>
          </div>
        )}

        <div className="space-y-8">
          {/* Connection Settings */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">Connection Settings</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Enable ECOBE Integration</div>
                  <div className="text-sm text-slate-400">Allow sending qualified leads to ECOBE</div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enabled ? 'bg-cyan-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  ECOBE API Base URL
                </label>
                <input
                  type="url"
                  value={settings.baseUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  placeholder="https://ecobe-engineclaude-production.up.railway.app"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  placeholder="Enter your ECOBE API key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  value={settings.webhookSecret}
                  onChange={(e) => setSettings(prev => ({ ...prev, webhookSecret: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  placeholder="Webhook secret for status updates"
                />
              </div>

              <button
                onClick={handleTestConnection}
                disabled={!settings.apiKey || !settings.baseUrl}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ExternalLink className="w-4 h-4" />
                Test Connection
              </button>
            </div>
          </div>

          {/* Handoff Settings */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">Handoff Settings</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Auto Handoff</div>
                  <div className="text-sm text-slate-400">Automatically send qualified leads to ECOBE</div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, autoHandoff: !prev.autoHandoff }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoHandoff ? 'bg-cyan-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoHandoff ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Minimum Qualification Score
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.minQualificationScore}
                    onChange={(e) => setSettings(prev => ({ ...prev, minQualificationScore: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <div className="w-16 text-center">
                    <span className="text-lg font-medium text-white">{settings.minQualificationScore}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  Only leads with this score or higher will be considered for handoff
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
