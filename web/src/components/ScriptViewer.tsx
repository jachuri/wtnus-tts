'use client'

import { useScriptStore, LineState } from '@/store/useScriptStore'
import { Play, RotateCcw, Download, Sparkles, Loader2, AlertCircle, PlayCircle, StopCircle, Pencil, Check, X } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import JSZip from 'jszip'

// 초를 MM:SS 형식으로 변환
function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ScriptViewer() {
    const { lines, voiceMapping, scriptName, setGenerating, addAudioVersion, selectAudioVersion, setError, updateLineText, updateLineEmotion, setLineDuration } = useScriptStore()
    const [globalGenerating, setGlobalGenerating] = useState(false)
    const [playingIndex, setPlayingIndex] = useState<number>(-1)

    // 총 재생 시간 계산
    const totalDuration = lines.reduce((sum, line) => sum + (line.duration || 0), 0)

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
                    <p className="text-zinc-400 text-sm">
                        {lines.length} lines in total
                        {totalDuration > 0 && <span className="ml-2">• Total: {formatDuration(totalDuration)}</span>}
                    </p>
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
                    <LineItem
                        key={line.id}
                        line={line}
                        index={index}
                        playingIndex={playingIndex}
                        onGenerate={() => generateAudio(line)}
                        onLineEnded={() => handleLineEnded(index)}
                        onSelectVersion={(versionId) => selectAudioVersion(line.id, versionId)}
                        onUpdateText={(text) => updateLineText(line.id, text)}
                        onUpdateEmotion={(emotion) => updateLineEmotion(line.id, emotion)}
                        onDurationChange={(duration) => setLineDuration(line.id, duration)}
                    />
                ))}
            </div>
        </div>
    )
}

// 라인 아이템 컴포넌트 (편집 기능 포함)
interface LineItemProps {
    line: LineState
    index: number
    playingIndex: number
    onGenerate: () => void
    onLineEnded: () => void
    onSelectVersion: (versionId: string) => void
    onUpdateText: (text: string) => void
    onUpdateEmotion: (emotion: string) => void
    onDurationChange: (duration: number) => void
}

function LineItem({
    line,
    index,
    playingIndex,
    onGenerate,
    onLineEnded,
    onSelectVersion,
    onUpdateText,
    onUpdateEmotion,
    onDurationChange
}: LineItemProps) {
    const [isEditingText, setIsEditingText] = useState(false)
    const [isEditingEmotion, setIsEditingEmotion] = useState(false)
    const [editText, setEditText] = useState(line.text)
    const [editEmotion, setEditEmotion] = useState(line.emotion)
    const textInputRef = useRef<HTMLTextAreaElement>(null)
    const emotionInputRef = useRef<HTMLInputElement>(null)

    // 편집 모드 진입 시 input에 포커스
    useEffect(() => {
        if (isEditingText && textInputRef.current) {
            textInputRef.current.focus()
            textInputRef.current.select()
        }
    }, [isEditingText])

    useEffect(() => {
        if (isEditingEmotion && emotionInputRef.current) {
            emotionInputRef.current.focus()
            emotionInputRef.current.select()
        }
    }, [isEditingEmotion])

    // 대사 저장
    const saveText = () => {
        if (editText.trim() && editText !== line.text) {
            onUpdateText(editText.trim())
        } else {
            setEditText(line.text)
        }
        setIsEditingText(false)
    }

    // 감정 저장
    const saveEmotion = () => {
        if (editEmotion.trim() && editEmotion !== line.emotion) {
            onUpdateEmotion(editEmotion.trim())
        } else {
            setEditEmotion(line.emotion)
        }
        setIsEditingEmotion(false)
    }

    // 취소
    const cancelTextEdit = () => {
        setEditText(line.text)
        setIsEditingText(false)
    }

    const cancelEmotionEdit = () => {
        setEditEmotion(line.emotion)
        setIsEditingEmotion(false)
    }

    // 키보드 핸들링
    const handleTextKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            saveText()
        } else if (e.key === 'Escape') {
            cancelTextEdit()
        }
    }

    const handleEmotionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            saveEmotion()
        } else if (e.key === 'Escape') {
            cancelEmotionEdit()
        }
    }

    return (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 hover:bg-zinc-900/50 transition-colors group">
            <div className="flex gap-6">
                {/* Character Info */}
                <div className="w-32 flex-shrink-0 pt-1">
                    <div className="font-bold text-purple-400 mb-1">{line.character}</div>

                    {/* 감정 편집 */}
                    {isEditingEmotion ? (
                        <div className="flex items-center gap-1">
                            <input
                                ref={emotionInputRef}
                                type="text"
                                value={editEmotion}
                                onChange={(e) => setEditEmotion(e.target.value)}
                                onKeyDown={handleEmotionKeyDown}
                                onBlur={saveEmotion}
                                className="text-xs px-2 py-1 bg-zinc-700 border border-purple-500 rounded text-white w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                    ) : (
                        <div
                            onClick={() => {
                                setEditEmotion(line.emotion)
                                setIsEditingEmotion(true)
                            }}
                            className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400 inline-block cursor-pointer hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                            title="클릭하여 감정 편집"
                        >
                            {line.emotion}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                    {/* 대사 편집 */}
                    {isEditingText ? (
                        <div className="space-y-2">
                            <textarea
                                ref={textInputRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={handleTextKeyDown}
                                rows={3}
                                className="w-full text-lg text-zinc-200 leading-relaxed font-medium bg-zinc-800 border border-purple-500 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={saveText}
                                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                                >
                                    <Check size={14} /> 저장
                                </button>
                                <button
                                    onClick={cancelTextEdit}
                                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
                                >
                                    <X size={14} /> 취소
                                </button>
                                <span className="text-xs text-zinc-500">Enter: 저장, Esc: 취소</span>
                            </div>
                        </div>
                    ) : (
                        <div
                            onDoubleClick={() => {
                                setEditText(line.text)
                                setIsEditingText(true)
                            }}
                            className="text-lg text-zinc-200 leading-relaxed font-medium cursor-pointer hover:bg-zinc-800/50 rounded-lg p-2 -m-2 transition-colors group/text"
                            title="더블클릭하여 대사 편집"
                        >
                            "{line.text}"
                            <Pencil size={14} className="inline ml-2 opacity-0 group-hover/text:opacity-50 transition-opacity" />
                        </div>
                    )}

                    {/* Audio Controls */}
                    <div className="flex items-center gap-4 min-h-[40px]">
                        {line.isGenerating ? (
                            <div className="flex items-center gap-2 text-purple-400 text-sm animate-pulse">
                                <Loader2 className="animate-spin w-4 h-4" /> Generating audio...
                            </div>
                        ) : line.error ? (
                            <div className="flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" /> {line.error}
                                <button onClick={onGenerate} className="underline hover:text-red-300">Retry</button>
                            </div>
                        ) : line.audioVersions.length > 0 ? (
                            <AudioPlayer
                                url={line.audioVersions.find(v => v.isSelected)?.url || ''}
                                autoPlay={index === playingIndex}
                                onEnded={onLineEnded}
                                onDurationChange={onDurationChange}
                            />
                        ) : (
                            <button
                                onClick={onGenerate}
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
                                    onChange={(e) => onSelectVersion(e.target.value)}
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
                                onClick={onGenerate}
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
    )
}

function AudioPlayer({ url, autoPlay, onEnded, onDurationChange }: { url: string, autoPlay?: boolean, onEnded?: () => void, onDurationChange?: (duration: number) => void }) {
    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        if (audioRef.current && autoPlay) {
            audioRef.current.play().catch(() => { })
        }
    }, [autoPlay, url])

    const handleLoadedMetadata = () => {
        if (audioRef.current && onDurationChange) {
            onDurationChange(audioRef.current.duration)
        }
    }

    if (!url) return null;

    return (
        <audio
            ref={audioRef}
            controls
            className="h-8 w-full max-w-md opacity-80 hover:opacity-100 transition-opacity"
            src={url}
            onEnded={onEnded}
            onLoadedMetadata={handleLoadedMetadata}
        >
            Your browser does not support the audio element.
        </audio>
    )
}
