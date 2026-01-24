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

export function bundleScriptLines(lines: ScriptLine[]): ScriptLine[] {
    if (lines.length === 0) return []

    // 1. Group lines by character
    const characterGroups: Record<string, ScriptLine[]> = {}
    const characterOrder: string[] = [] // To preserve order of appearance (roughly) or mapped order

    lines.forEach(line => {
        if (!characterGroups[line.character]) {
            characterGroups[line.character] = []
            characterOrder.push(line.character)
        }
        characterGroups[line.character].push(line)
    })

    // 2. Merge lines for each character
    const bundledResult: ScriptLine[] = []

    characterOrder.forEach((char, index) => {
        const charLines = characterGroups[char]
        if (charLines.length === 0) return

        // Base line info from the first occurrence
        const firstLine = charLines[0]

        // Accumulate text
        let mergedText = firstLine.text
        if (firstLine.emotion !== 'Neutral') {
            mergedText = `[${firstLine.emotion}] ${firstLine.text}`
        }

        let mergedOriginalText = firstLine.originalText
        let currentEmotion = firstLine.emotion

        // Start from second line
        for (let i = 1; i < charLines.length; i++) {
            const nextLine = charLines[i]

            let nextTextToAdd = nextLine.text

            // Insert emotion tag if changed
            if (nextLine.emotion !== currentEmotion && nextLine.emotion !== 'Neutral') {
                nextTextToAdd = `[${nextLine.emotion}] ${nextLine.text}`
                currentEmotion = nextLine.emotion
            }

            // Separator
            mergedText = `${mergedText} ... ${nextTextToAdd}`
            mergedOriginalText = `${mergedOriginalText}\n${nextLine.originalText}`
        }

        bundledResult.push({
            id: `bundle-${char}-${Date.now()}`,
            character: char,
            emotion: 'Mixed', // Since it contains multiple emotions
            text: mergedText,
            originalText: mergedOriginalText
        })
    })

    return bundledResult
}
