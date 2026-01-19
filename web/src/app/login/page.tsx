'use client'

import { useActionState } from 'react'
import { login } from '../actions'
import { Lock } from 'lucide-react'

const initialState = {
    error: '',
}

export default function LoginPage() {
    const [state, formAction] = useActionState(login, initialState)

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/30 rounded-full blur-[120px]" />

            <div className="w-full max-w-md relative z-10">
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">WTN:US Audio Generator</h1>
                        <p className="text-zinc-400 mt-2 text-sm text-center">
                            접속하려면 비밀번호를 입력해주세요.
                        </p>
                    </div>

                    <form action={formAction} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                required
                                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                            />
                        </div>

                        {state?.error && (
                            <p className="text-red-400 text-sm text-center font-medium bg-red-900/20 py-2 rounded-lg border border-red-500/20">
                                ⚠️ {state.error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 active:scale-[0.98]"
                        >
                            Enter Dashboard
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-zinc-600">
                            Authorized Personnel Only (v1.0)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
