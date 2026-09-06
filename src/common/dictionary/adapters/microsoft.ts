import type {
    DictionaryAdapter,
    DictionaryLookupOptions,
    DictionaryProviderConfig,
    WordLookupMeaning,
    WordLookupPreview,
} from '../types'
import { getUniversalFetch } from '../../universal-fetch'

const MS_POS_MAP: Record<string, string> = {
    noun: 'n.',
    verb: 'v.',
    adj: 'adj.',
    adjective: 'adj.',
    adv: 'adv.',
    adverb: 'adv.',
    pron: 'pron.',
    prep: 'prep.',
    conj: 'conj.',
}

interface MicrosoftTranslateItem {
    translations?: Array<{
        text?: string
        to?: string
    }>
}

interface MicrosoftTranslationItem {
    normalizedTarget?: string
    displayTarget?: string
    posTag?: string
    confidence?: number
    prefixWord?: string
    backTranslations?: Array<{ displayText?: string }>
}

interface MicrosoftLookupResult {
    normalizedSource?: string
    displaySource?: string
    translations?: MicrosoftTranslationItem[]
}

export function parseMicrosoftResponse(payload: unknown, fallbackWord: string): WordLookupPreview | null {
    if (!Array.isArray(payload) || payload.length === 0) {
        return null
    }

    const result = payload[0] as MicrosoftLookupResult
    if (!result || !Array.isArray(result.translations) || result.translations.length === 0) {
        return null
    }

    // Group translations by part of speech
    const posGroups = new Map<string, string[]>()
    for (const item of result.translations) {
        if (!item.displayTarget) continue
        const rawPos = (item.posTag || '').toLowerCase().trim()
        const pos = MS_POS_MAP[rawPos] ?? (rawPos ? `${rawPos}.` : '')
        if (!posGroups.has(pos)) {
            posGroups.set(pos, [])
        }
        const list = posGroups.get(pos)!
        if (!list.includes(item.displayTarget) && list.length < 4) {
            list.push(item.displayTarget)
        }
    }

    const meanings: WordLookupMeaning[] = []
    for (const [pos, defs] of posGroups.entries()) {
        meanings.push({
            partOfSpeech: pos,
            definition: defs.join('；'),
        })
        if (meanings.length >= 3) break
    }

    if (meanings.length === 0) {
        return null
    }

    return {
        word: result.displaySource || fallbackWord,
        meanings,
        sourceName: 'Azure Translator',
    }
}

export const microsoftAdapter: DictionaryAdapter = {
    async lookup(
        word: string,
        config: DictionaryProviderConfig,
        options?: DictionaryLookupOptions
    ): Promise<WordLookupPreview | null> {
        const apiKey = config.apiKey?.trim()
        if (!apiKey) {
            throw new Error('Azure Translator requires an API Key. Please configure your Subscription Key in Settings.')
        }

        const targetLang = options?.targetLang || 'zh-Hans'
        const fetcher = getUniversalFetch()
        const baseUrl = config.baseURL?.trim().replace(/\/+$/, '') || 'https://api.cognitive.microsofttranslator.com'

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey,
            ...(config.headers || {}),
        }

        if (config.region?.trim()) {
            headers['Ocp-Apim-Subscription-Region'] = config.region.trim()
        }

        // 1. First try dictionary/lookup
        const lookupUrl = `${baseUrl}/dictionary/lookup?api-version=3.0&from=en&to=${encodeURIComponent(targetLang)}`
        try {
            const response = await fetcher(lookupUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify([{ Text: word }]),
                signal: options?.signal,
            })

            if (response.ok) {
                const data = await response.json()
                const preview = parseMicrosoftResponse(data, word)
                if (preview) {
                    return preview
                }
            } else if (response.status === 401) {
                throw new Error('Azure Translator authentication failed (401). Please verify your API Key and Region.')
            } else if (response.status !== 400 && response.status !== 404) {
                throw new Error(`Azure Translator error (status ${response.status})`)
            }
        } catch (err) {
            if (err instanceof Error && (err.message.includes('401') || err.message.includes('API Key'))) {
                throw err
            }
            // For other lookup failures, attempt fallback to /translate below
        }

        // 2. Fallback to /translate for phrases or words without dictionary definitions
        const translateUrl = `${baseUrl}/translate?api-version=3.0&to=${encodeURIComponent(targetLang)}`
        const transResponse = await fetcher(translateUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify([{ Text: word }]),
            signal: options?.signal,
        })

        if (!transResponse.ok) {
            if (transResponse.status === 401) {
                throw new Error('Azure Translator authentication failed (401). Please verify your API Key and Region.')
            }
            throw new Error(`Azure Translator request failed with status ${transResponse.status}`)
        }

        const transData = (await transResponse.json()) as MicrosoftTranslateItem[]
        if (Array.isArray(transData) && transData[0]?.translations?.length) {
            const transText = transData[0].translations[0].text
            if (transText) {
                return {
                    word,
                    meanings: [
                        {
                            definition: transText,
                        },
                    ],
                    sourceName: 'Azure Translator',
                }
            }
        }

        return null
    },
}
