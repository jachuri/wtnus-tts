import { NextResponse } from 'next/server'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

export async function GET() {
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
        return NextResponse.json({ error: 'API Key not configured' }, { status: 500 })
    }

    try {
        const client = new ElevenLabsClient({ apiKey })
        const response = await client.voices.getAll()

        // Simplify response for frontend
        const voices = response.voices.map(v => ({
            voiceId: v.voiceId,
            name: v.name,
            previewUrl: v.previewUrl
        }))

        return NextResponse.json({ voices })
    } catch (error) {
        console.error('Error fetching voices:', error)
        return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 })
    }
}
