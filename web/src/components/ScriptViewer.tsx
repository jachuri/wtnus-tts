'use client'

import { useScriptStore, LineState } from '@/store/useScriptStore'
import { Play, RotateCcw, Download, Sparkles, Loader2, AlertCircle, PlayCircle, StopCircle } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import JSZip from 'jszip'

export function ScriptViewer() {
    const { lines, voiceMapping, scriptName, setGenerating, addAudioVersion, selectAudioVersion, setError } = useScriptStore()
    const [globalGenerating, setGlobalGenerating] = useState(false)
    const [playingIndex, setPlayingIndex] = useState<number>(-1)

    const handlePlayView = () => {
        if (playingIndex !== -1) {
            setPlayingIndex(-1)
            return
        }

        // Find first line with audio
        const firstIndex = lines.findIndex(l => l.audioVersions.length > 0)
        if (firstIndex !== -1) setPlayingIndex(firstIndex)
    }

    const handleLineEnded = (currentIndex: number) => {
        if (playingIndex === -1) return

        // Find next line with audio
        let nextIndex = -1
        for (let i = currentIndex + 1; i < lines.length; i++) {
            if (lines[i].audioVersions.length > 0) {
                nextIndex = i
                break
            }
        }

        setPlayingIndex(nextIndex)
    }

    const generateAudio = async (line: LineState) => {
        const voiceId = voiceMapping[line.character]
        if (!voiceId) return

        setGenerating(line.id, true)

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: line.text,
                    voiceId: voiceId,
                    // We can add emotion prompting logic here later if using V3
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.details || errorData.error || 'Generation failed')
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            addAudioVersion(line.id, url)
            setError(line.id, '')
        } catch (err) {
            setError(line.id, err instanceof Error ? err.message : 'Failed to generate')
        } finally {
            setGenerating(line.id, false)
        }
    }

    const handleGenerateAll = async () => {
        setGlobalGenerating(true)
        // Sequential generation to avoid rate limits (safe approach)
        // Could be parallelized with a queue queue later
        for (const line of lines) {
            if (line.audioVersions.length === 0) {
                await generateAudio(line)
            }
        }
        setGlobalGenerating(false)
    }

    const handleDownloadZip = async () => {
        const zip = new JSZip()
        let count = 0

        // Only include lines that have a selected audio version
        // Sort by original index (since lines is already in order)
        lines.forEach((line, index) => {
            const selectedVersion = line.audioVersions.find(v => v.isSelected)
            if (selectedVersion) {
                count++
                // Format: 001_Character_Emotion.mp3
                const seq = count.toString().padStart(3, '0')
                // Sanitize filename
                const safeChar = line.character.replace(/[^a-z0-9가-힣]/gi, '_')
                const safeEmo = line.emotion.replace(/[^a-z0-9가-힣]/gi, '_')
                const filename = `${seq}_${safeChar}_${safeEmo}.mp3`

                // We need to fetch the blob from the blob URL to add to zip
                // Since we created it with URL.createObjectURL, we can fetch it locally
                const promise = fetch(selectedVersion.url)
                    .then(r => r.blob())
                    .then(blob => {
                        zip.file(filename, blob)
                    })
            }
        })

        if (count === 0) {
            alert("No audio generated yet.")
            return
        }

        // Wait for all fetches (implicitly handled by loop above? No, we need logic)
        // Actually, fetch on blob URL is sync-ish or very fast, but let's be safe.
        // Better pattern:
        const promises = lines
            .map((line, index) => {
                const selectedVersion = line.audioVersions.find(v => v.isSelected)
                if (!selectedVersion) return null

                return fetch(selectedVersion.url)
                    .then(r => r.blob())
                    .then(blob => {
                        const seq = (index + 1).toString().padStart(3, '0')
                        const safeChar = line.character.replace(/[^a-z0-9가-힣]/gi, '_')
                        const safeEmo = line.emotion.replace(/[^a-z0-9가-힣]/gi, '_')
                        const filename = `${seq}_${safeChar}_${safeEmo}.mp3`
                        return { filename, blob }
                    })
            })
            .filter(Boolean) as Promise<{ filename: string, blob: Blob }>[]

        const files = await Promise.all(promises)
        files.forEach(f => zip.file(f.filename, f.blob))

        const content = await zip.generateAsync({ type: "blob" })
        const url = URL.createObjectURL(content)
        const a = document.createElement("a")
        a.href = url

        // 파일명 생성: {스크립트이름}_{날짜시간}.zip
        const now = new Date()
        const timestamp = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') + '_' +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0')
        const baseName = scriptName || 'TTS_Export'
        a.download = `${baseName}_${timestamp}.zip`

        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md sticky top-0 z-20 shadow-2xl">
                <div>
                    <h2 className="text-2xl font-bold text-white">Production Studio</h2>
                    <p className="text-zinc-400 text-sm">{lines.length} lines in total</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePlayView}
                        disabled={lines.filter(l => l.audioVersions.length > 0).length === 0}
                        className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-lg transition-all shadow-lg active:scale-[0.98] ${playingIndex !== -1
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-zinc-800 text-white hover:bg-zinc-700'
                            }`}
                    >
                        {playingIndex !== -1 ? <StopCircle size={18} /> : <PlayCircle size={18} />}
                        {playingIndex !== -1 ? 'Stop Playing' : 'Play All'}
                    </button>
                    <button
                        onClick={handleGenerateAll}
                        disabled={globalGenerating}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
                    >
                        {globalGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                        Generate Missing
                    </button>
                    <button
                        onClick={handleDownloadZip}
                        className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors shadow-lg active:scale-[0.98]"
                    >
                        <Download size={18} />
                        Download Zip
                    </button>
                </div>
            </div>

            <div className="space-y-4 pb-20">
                {lines.map((line, index) => (
                    <div key={line.id} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 hover:bg-zinc-900/50 transition-colors group">
                        <div className="flex gap-6">
                            {/* Character Info */}
                            <div className="w-32 flex-shrink-0 pt-1">
                                <div className="font-bold text-purple-400 mb-1">{line.character}</div>
                                <div className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400 inline-block">
                                    {line.emotion}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-4">
                                <div className="text-lg text-zinc-200 leading-relaxed font-medium">
                                    "{line.text}"
                                </div>

                                {/* Audio Controls */}
                                <div className="flex items-center gap-4 min-h-[40px]">
                                    {line.isGenerating ? (
                                        <div className="flex items-center gap-2 text-purple-400 text-sm animate-pulse">
                                            <Loader2 className="animate-spin w-4 h-4" /> Generating audio...
                                        </div>
                                    ) : line.error ? (
                                        <div className="flex items-center gap-2 text-red-400 text-sm">
                                            <AlertCircle className="w-4 h-4" /> {line.error}
                                            <button onClick={() => generateAudio(line)} className="underline hover:text-red-300">Retry</button>
                                        </div>
                                    ) : line.audioVersions.length > 0 ? (
                                        <AudioPlayer
                                            url={line.audioVersions.find(v => v.isSelected)?.url || ''}
                                            autoPlay={index === playingIndex}
                                            onEnded={() => handleLineEnded(index)}
                                        />
                                    ) : (
                                        <button
                                            onClick={() => generateAudio(line)}
                                            className="text-sm font-medium text-zinc-500 hover:text-white flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                                        >
                                            <Play size={14} className="fill-current" /> Generate Line
                                        </button>
                                    )}

                                    {/* Version Selector */}
                                    {line.audioVersions.length > 1 && (
                                        <div className="relative">
                                            <select
                                                value={line.audioVersions.find(v => v.isSelected)?.id}
                                                onChange={(e) => selectAudioVersion(line.id, e.target.value)}
                                                className="appearance-none bg-zinc-800 text-xs text-zinc-400 pl-3 pr-8 py-1.5 rounded-lg border border-transparent hover:border-zinc-700 hover:text-zinc-200 focus:outline-none cursor-pointer transition-colors"
                                            >
                                                {line.audioVersions.map((v, idx) => (
                                                    <option key={v.id} value={v.id}>
                                                        Take {idx + 1}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Re-generate button (only if has audio) */}
                                    {line.audioVersions.length > 0 && !line.isGenerating && (
                                        <button
                                            onClick={() => generateAudio(line)}
                                            className="text-zinc-600 hover:text-purple-400 transition-colors p-2"
                                            title="Generate another version"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AudioPlayer({ url, autoPlay, onEnded }: { url: string, autoPlay?: boolean, onEnded?: () => void }) {
    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        if (audioRef.current && autoPlay) {
            audioRef.current.play().catch(() => { })
        }
    }, [autoPlay, url])

    if (!url) return null;

    return (
        <audio
            ref={audioRef}
            controls
            className="h-8 w-full max-w-md opacity-80 hover:opacity-100 transition-opacity"
            src={url}
            onEnded={onEnded}
        >
            Your browser does not support the audio element.
        </audio>
    )
}
