export interface ScriptLine {
    id: string
    character: string
    emotion: string
    text: string
    originalText: string // For reference or fallback
}

export function parseScript(markdown: string): ScriptLine[] {
    const lines = markdown.split('\n')
    const scriptData: ScriptLine[] = []

    let currentCharacter = ''

    // Regex patterns
    // Matches: **[CharacterName]** (Optional Instruction)
    const characterRegex = /^\*\*\[(.*?)\]\*\*/

    // Matches: "[Emotion] Dialogue" OR "Dialogue"
    const dialogueRegex = /^"(\[(.*?)\]\s)?(.*)"/

    lines.forEach((line, index) => {
        const trimmedLine = line.trim()
        if (!trimmedLine) return

        // 1. Check for Character
        const charMatch = trimmedLine.match(characterRegex)
        if (charMatch) {
            currentCharacter = charMatch[1].trim()
            return // Go to next line
        }

        // 2. Check for Dialogue (only if we have a current character)
        if (currentCharacter) {
            const dialogueMatch = trimmedLine.match(dialogueRegex)
            if (dialogueMatch) {
                // dialogueMatch indices:
                // 0: full match
                // 1: "[Emotion] " (undefined if no emotion)
                // 2: "Emotion" (content inside brackets)
                // 3: "Dialogue text"

                const emotion = dialogueMatch[2] ? dialogueMatch[2].trim() : 'Neutral'
                const text = dialogueMatch[3] ? dialogueMatch[3].trim() : '' // Fallback if group 3 is empty but matched

                if (text) {
                    scriptData.push({
                        id: `line-${Date.now()}-${index}`, // Simple unique ID
                        character: currentCharacter,
                        emotion: emotion,
                        text: text,
                        originalText: trimmedLine
                    })
                }
            }
        }
    })

    return scriptData
}
