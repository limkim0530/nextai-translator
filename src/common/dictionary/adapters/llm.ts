import { generateText } from 'ai'
import { parse as bestEffortJSONParse } from 'best-effort-json-parser'
import type {
    DictionaryAdapter,
    DictionaryLookupOptions,
    DictionaryProviderConfig,
    WordLookupMeaning,
    WordLookupPreview,
} from '../types'
import { createLanguageModel } from '../../providers/registry'
import type { ProviderConfig } from '../../providers/types'
import { getLangName } from '../../lang'

function stripMarkdownCodeFence(content: string): string {
    const trimmed = content.trim()
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
    if (fenceMatch) {
        return fenceMatch[1].trim()
    }
    return trimmed
}

export function parseLlmDictionaryResponse(raw: string, fallbackWord: string): WordLookupPreview | null {
    try {
        const cleaned = stripMarkdownCodeFence(raw)
        const parsed = bestEffortJSONParse(cleaned) as Record<string, unknown>
        if (!parsed || typeof parsed !== 'object') {
            return null
        }

        const word = typeof parsed.word === 'string' ? parsed.word : fallbackWord
        const phonetic = typeof parsed.phonetic === 'string' ? parsed.phonetic : undefined
        const meanings: WordLookupMeaning[] = []

        if (Array.isArray(parsed.meanings)) {
            for (const item of parsed.meanings) {
                if (!item || typeof item !== 'object') continue
                const m = item as Record<string, unknown>
                if (typeof m.definition === 'string' && m.definition.trim()) {
                    meanings.push({
                        partOfSpeech: typeof m.partOfSpeech === 'string' ? m.partOfSpeech : undefined,
                        definition: m.definition.trim(),
                        example: typeof m.example === 'string' ? m.example : undefined,
                    })
                }
            }
        } else if (typeof parsed.definition === 'string' && parsed.definition.trim()) {
            meanings.push({ definition: parsed.definition.trim() })
        }

        if (meanings.length === 0) {
            return null
        }

        return {
            word,
            phonetic,
            meanings,
            sourceName: 'AI Model',
        }
    } catch {
        return null
    }
}

export const llmAdapter: DictionaryAdapter = {
    async lookup(
        word: string,
        config: DictionaryProviderConfig,
        options?: DictionaryLookupOptions
    ): Promise<WordLookupPreview | null> {
        const providers = options?.providers || []
        let selectedLlmProvider: ProviderConfig | undefined

        if (config.providerId) {
            selectedLlmProvider = providers.find((p) => p.id === config.providerId)
        }
        if (!selectedLlmProvider && providers.length > 0) {
            selectedLlmProvider = providers[0]
        }

        if (!selectedLlmProvider) {
            throw new Error('No AI provider configured to perform LLM word lookup')
        }

        const model = createLanguageModel(selectedLlmProvider)
        const targetLang = options?.targetLang || 'zh-Hans'
        const targetLangName = getLangName(targetLang) || targetLang

        const prompt = `Define the word or term: "${word}".
Explain it in target language: ${targetLangName} (${targetLang}).
Return ONLY a valid JSON object matching this schema:
{
  "word": "${word}",
  "phonetic": "/.../",
  "meanings": [
    {
      "partOfSpeech": "n.",
      "definition": "...",
      "example": "..."
    }
  ]
}`

        const result = await generateText({
            model,
            system: 'You are a concise bilingual dictionary. Return strictly valid JSON only. Do not wrap in markdown fences or include explanations.',
            prompt,
            abortSignal: options?.signal,
        })

        return parseLlmDictionaryResponse(result.text, word)
    },
}
