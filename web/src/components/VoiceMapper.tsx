'use client'

import { useScriptStore } from '@/store/useScriptStore'
import { ArrowRight, User, Check, Mic } from 'lucide-react'

interface Props {
    onNext: () => void
}

export function VoiceMapper({ onNext }: Props) {
    const { characters, availableVoices, voiceMapping, setVoiceMapping } = useScriptStore()

    const isAllMapped = characters.every(char => voiceMapping[char])
    console.log('VoiceMapper availableVoices:', availableVoices)
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold text-white">Voice Casting</h2>
                <p className="text-zinc-400">각 캐릭터에 어울리는 목소리를 선택해주세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.map((char) => (
                    <div key={char} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex items-center justify-between hover:border-purple-500/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                                <User size={20} />
                            </div>
                            <span className="font-medium text-lg text-white">{char}</span>
                        </div>

                        <div className="relative">
                            <select
                                value={voiceMapping[char] || ''}
                                onChange={(e) => setVoiceMapping(char, e.target.value)}
                                className="appearance-none bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-64 cursor-pointer hover:bg-zinc-900 transition-colors"
                            >
                                <option value="" disabled>Select a voice...</option>
                                {availableVoices.map((voice) => (
                                    <option key={voice.voiceId} value={voice.voiceId}>
                                        {voice.name}
                                    </option>
                                ))}
                            </select>
                            <Mic className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none w-4 h-4" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-8 border-t border-white/5 pt-8">
                <button
                    onClick={onNext}
                    disabled={!isAllMapped}
                    className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/5 active:scale-[0.98]"
                >
                    Start Production <ArrowRight size={18} />
                </button>
            </div>
        </div>
    )
}
