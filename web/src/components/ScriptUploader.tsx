'use client'

import { useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import { useScriptStore } from '@/store/useScriptStore'

interface Props {
    onLoaded: (content: string) => void
}

export function ScriptUploader({ onLoaded }: Props) {
    const [text, setText] = useState('')
    const { setScriptName } = useScriptStore()

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 파일명에서 확장자 제거하여 저장
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setScriptName(nameWithoutExt)

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            if (content) {
                setText(content)
                onLoaded(content)
            }
        }
        reader.readAsText(file)
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-bold text-white">Upload Script</h2>
                <p className="text-zinc-400">마크다운(.md) 대본 파일을 올리거나 내용을 직접 붙여넣으세요.</p>
            </div>

            <div className="grid gap-6">
                {/* File Drop Area */}
                <label className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-900/5 transition-all group">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl">
                        <Upload className="w-8 h-8 text-zinc-400 group-hover:text-purple-400" />
                    </div>
                    <span className="text-lg font-medium text-zinc-300 group-hover:text-white">Click to upload .md file</span>
                    <span className="text-sm text-zinc-500 mt-2">or drag and drop here</span>
                    <input type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} />
                </label>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-zinc-950 text-zinc-500">OR</span>
                    </div>
                </div>

                {/* Text Area */}
                <div className="space-y-3">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder=" Paste your script content here..."
                        className="w-full h-64 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y font-mono text-sm"
                    />
                    <button
                        onClick={() => onLoaded(text)}
                        disabled={!text.trim()}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/5 active:scale-[0.99]"
                    >
                        Start Project
                    </button>
                </div>
            </div>
        </div>
    )
}
