'use client'

import { useState, useEffect } from 'react'
import { logout } from './actions'
import { parseScript, bundleScriptLines } from '@/lib/parser'
import { useScriptStore } from '@/store/useScriptStore'
import { ScriptUploader } from '@/components/ScriptUploader'
import { VoiceMapper } from '@/components/VoiceMapper'
import { ScriptViewer } from '@/components/ScriptViewer'

export default function Home() {
  const { lines, originalLines, setLines, setOriginalLines, setAvailableVoices } = useScriptStore()
  const [tab, setTab] = useState<'upload' | 'mapping' | 'generate' | 'bundle'>('upload')

  // Load voices on mount
  useEffect(() => {
    fetch('/api/voices')
      .then(res => res.json())
      .then(data => {
        if (data.voices) setAvailableVoices(data.voices)
      })
      .catch(err => console.error(err))
  }, [setAvailableVoices])

  const handleScriptLoad = (content: string, options: { bundle: boolean }) => {
    const parsed = parseScript(content)

    // Always store original
    setOriginalLines(parsed)

    // Option from uploader (currently false)
    if (options.bundle) {
      const bundled = bundleScriptLines(parsed)
      setLines(bundled)
    } else {
      setLines(parsed)
    }

    if (parsed.length > 0) {
      setTab('mapping')
    }
  }

  const handleTabChange = (newTab: typeof tab) => {
    // Logic for switching modes
    let sourceLines = originalLines

    // Fallback: If originalLines is empty but we have lines (e.g. from before code update or first load),
    // treat current lines as original (assuming we are in 'generate' mode which is default)
    if (sourceLines.length === 0 && lines.length > 0) {
      sourceLines = lines
      setOriginalLines(lines)
    }

    if (newTab === 'generate') {
      // Restore original
      if (sourceLines.length > 0) {
        setLines(sourceLines)
      }
    } else if (newTab === 'bundle') {
      // Apply bundle
      if (sourceLines.length > 0) {
        const bundled = bundleScriptLines(sourceLines)
        setLines(bundled)
      }
    }
    setTab(newTab)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
      <div className="max-w-7xl mx-auto p-6">
        <header className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              WTN:US Audio Generator
            </h1>
          </div>
          <form action={logout}>
            <button className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors border border-white/5 rounded-lg hover:bg-white/5">
              Logout
            </button>
          </form>
        </header>

        {/* Steps Navigation */}
        {lines.length > 0 && (
          <nav className="flex gap-4 mb-8">
            {['upload', 'mapping', 'generate', 'bundle'].map((step) => (
              <button
                key={step}
                onClick={() => handleTabChange(step as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === step
                  ? 'bg-white text-black shadow-lg shadow-white/10'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                {step === 'bundle' ? 'Generate (Bundle)' : step.charAt(0).toUpperCase() + step.slice(1)}
              </button>
            ))}
          </nav>
        )}

        <main className="min-h-[600px] transition-all">
          {tab === 'upload' && (
            <div className="max-w-3xl mx-auto">
              <ScriptUploader onLoaded={handleScriptLoad} />
            </div>
          )}

          {tab === 'mapping' && (
            <div className="max-w-4xl mx-auto">
              <VoiceMapper onNext={() => setTab('generate')} />
            </div>
          )}

          {(tab === 'generate' || tab === 'bundle') && (
            <div className="w-full">
              <ScriptViewer />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
