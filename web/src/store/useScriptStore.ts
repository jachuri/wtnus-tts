import { create } from 'zustand'
import { ScriptLine } from '@/lib/parser'

export interface AudioVersion {
    id: string
    url: string // Blob URL
    createdAt: number
    isSelected: boolean
}

export interface LineState extends ScriptLine {
    audioVersions: AudioVersion[]
    isGenerating: boolean
    error?: string
    duration?: number // 오디오 길이 (초)
}

export interface Voice {
    voiceId: string
    name: string
    previewUrl?: string
}

interface ScriptStore {
    // Data
    lines: LineState[]
    originalLines: ScriptLine[] // 원본 라인 보존용
    characters: string[] // Unique list of characters
    voiceMapping: Record<string, string> // Character Name -> Voice ID
    availableVoices: Voice[]
    scriptName: string // 스크립트 파일명 (확장자 제외)

    // Actions
    setLines: (lines: ScriptLine[]) => void
    setOriginalLines: (lines: ScriptLine[]) => void
    setScriptName: (name: string) => void
    setAvailableVoices: (voices: Voice[]) => void
    setVoiceMapping: (character: string, voiceId: string) => void
    addAudioVersion: (lineId: string, audioUrl: string) => void
    selectAudioVersion: (lineId: string, versionId: string) => void
    setGenerating: (lineId: string, isGenerating: boolean) => void
    setError: (lineId: string, error: string) => void
    clearScript: () => void
    // 편집 및 duration 관련 액션
    updateLineText: (lineId: string, text: string) => void
    updateLineEmotion: (lineId: string, emotion: string) => void
    setLineDuration: (lineId: string, duration: number) => void
}

export const useScriptStore = create<ScriptStore>((set) => ({
    lines: [],
    originalLines: [],
    characters: [],
    voiceMapping: {},
    availableVoices: [],
    scriptName: '',

    setLines: (scriptLines) => {
        const uniqueChars = Array.from(new Set(scriptLines.map(l => l.character)))
        const linesWithState: LineState[] = scriptLines.map(l => ({
            ...l,
            audioVersions: [],
            isGenerating: false
        }))

        set({
            lines: linesWithState,
            characters: uniqueChars
        })
    },

    setOriginalLines: (lines) => set({ originalLines: lines }),

    setScriptName: (name) => set({ scriptName: name }),

    setAvailableVoices: (voices) => set({ availableVoices: voices }),

    setVoiceMapping: (character, voiceId) =>
        set((state) => ({
            voiceMapping: { ...state.voiceMapping, [character]: voiceId }
        })),

    addAudioVersion: (lineId, audioUrl) =>
        set((state) => ({
            lines: state.lines.map(line => {
                if (line.id !== lineId) return line

                // Deselect previous versions
                const prevVersions = line.audioVersions.map(v => ({ ...v, isSelected: false }))
                const newVersion: AudioVersion = {
                    id: `v-${Date.now()}`,
                    url: audioUrl,
                    createdAt: Date.now(),
                    isSelected: true // Auto select new version
                }

                return {
                    ...line,
                    audioVersions: [...prevVersions, newVersion]
                }
            })
        })),

    selectAudioVersion: (lineId, versionId) =>
        set((state) => ({
            lines: state.lines.map(line => {
                if (line.id !== lineId) return line
                return {
                    ...line,
                    audioVersions: line.audioVersions.map(v => ({
                        ...v,
                        isSelected: v.id === versionId
                    }))
                }
            })
        })),

    setGenerating: (lineId, isGenerating) =>
        set((state) => ({
            lines: state.lines.map(line =>
                line.id === lineId ? { ...line, isGenerating } : line
            )
        })),

    setError: (lineId, error) =>
        set((state) => ({
            lines: state.lines.map(line =>
                line.id === lineId ? { ...line, error } : line
            )
        })),

    clearScript: () => set({ lines: [], characters: [], voiceMapping: {}, scriptName: '' }),

    updateLineText: (lineId, text) =>
        set((state) => ({
            lines: state.lines.map(line =>
                line.id === lineId ? { ...line, text } : line
            )
        })),

    updateLineEmotion: (lineId, emotion) =>
        set((state) => ({
            lines: state.lines.map(line =>
                line.id === lineId ? { ...line, emotion } : line
            )
        })),

    setLineDuration: (lineId, duration) =>
        set((state) => ({
            lines: state.lines.map(line =>
                line.id === lineId ? { ...line, duration } : line
            )
        }))
}))
