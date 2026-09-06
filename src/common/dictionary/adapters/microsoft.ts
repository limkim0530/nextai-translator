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

let cachedEdgeToken: { token: string; expiresAt: number } | null = null

async function getEdgeToken(signal?: AbortSignal): Promise<string> {
    const now = Date.now()
    if (cachedEdgeToken && cachedEdgeToken.expiresAt > now) {
        return cachedEdgeToken.token
    }

    const fetcher = getUniversalFetch()
    const resp = await fetcher('https://edge.microsoft.com/translate/auth', {
        method: 'GET',
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        },
        signal,
    })

    if (!resp.ok) {
        throw new Error(`Failed to fetch Microsoft Edge token: status ${resp.status}`)
    }

    const token = await resp.text()
    // Edge token is valid for 10 minutes, cache for 8 minutes
    cachedEdgeToken = {
        token,
        expiresAt: now + 8 * 60 * 1000,
    }
    return token
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
        sourceName: 'Microsoft Edge',
    }
}

export const microsoftAdapter: DictionaryAdapter = {
    async lookup(
        word: string,
        config: DictionaryProviderConfig,
        options?: DictionaryLookupOptions
    ): Promise<WordLookupPreview | null> {
        const targetLang = options?.targetLang || 'zh-Hans'
        const fetcher = getUniversalFetch()

        let url =
            config.baseURL?.trim() ||
            `https://api-edge.cognitive.microsofttranslator.com/dictionary/lookup?api-version=3.0&from=en&to=${encodeURIComponent(targetLang)}`
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(config.headers || {}),
        }

        if (config.apiKey) {
            // Azure Translator subscription key
            if (!config.baseURL) {
                url = `https://api.cognitive.microsofttranslator.com/dictionary/lookup?api-version=3.0&from=en&to=${encodeURIComponent(targetLang)}`
            }
            headers['Ocp-Apim-Subscription-Key'] = config.apiKey
        } else {
            // Free Edge cognitive token
            const token = await getEdgeToken(options?.signal)
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetcher(url, {
            method: 'POST',
            headers,
            body: JSON.stringify([{ Text: word }]),
            signal: options?.signal,
        })

        if (!response.ok) {
            throw new Error(`Microsoft dictionary lookup failed with status ${response.status}`)
        }

        const data = await response.json()
        return parseMicrosoftResponse(data, word)
    },
}
