import { NextResponse } from 'next/server'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

export async function POST(request: Request) {
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
        return NextResponse.json({ error: 'API Key not configured' }, { status: 500 })
    }

    try {
        const body = await request.json()
        const { text, voiceId } = body

        if (!text || !voiceId) {
            return NextResponse.json({ error: 'Missing text or voiceId' }, { status: 400 })
        }

        const client = new ElevenLabsClient({ apiKey })

        // Using the Turbo v2 model for fastest generation with high quality
        // Or Multilingual v2 if needed. Let's stick to a robust default.
        // 'eleven_multilingual_v2' is detailed in the docs I saw.
        const audioStream = await client.textToSpeech.convert(voiceId, {
            text: text,
            modelId: "eleven_multilingual_v3",
            outputFormat: "mp3_44100_128",
        })

        // Convert stream to buffer
        const chunks: Uint8Array[] = []

        // @ts-ignore: Standard stream iteration
        for await (const chunk of audioStream) {
            chunks.push(chunk)
        }
        const audioBuffer = Buffer.concat(chunks)

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        })

    } catch (error) {
        console.error('Error generating audio:', error)
        return NextResponse.json({
            error: 'Failed to generate audio',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
