import type {
    DictionaryAdapter,
    DictionaryLookupOptions,
    DictionaryProviderConfig,
    WordLookupMeaning,
    WordLookupPreview,
} from '../types'
import { getUniversalFetch } from '../../universal-fetch'

const GOOGLE_POS_MAP: Record<string, string> = {
    noun: 'n.',
    verb: 'v.',
    adjective: 'adj.',
    adverb: 'adv.',
    pronoun: 'pron.',
    preposition: 'prep.',
    conjunction: 'conj.',
    interjection: 'interj.',
}

export function parseGoogleGtxResponse(
    payload: unknown,
    fallbackWord: string,
    targetLang?: string
): WordLookupPreview | null {
    if (!Array.isArray(payload)) {
        return null
    }

    const sentences = payload[0]
    const dict = payload[1]

    let phonetic: string | undefined
    if (Array.isArray(sentences)) {
        // Last element in sentences often has romanization/pronunciation
        for (const s of sentences) {
            if (Array.isArray(s) && typeof s[3] === 'string' && s[3]) {
                phonetic = s[3].startsWith('/') ? s[3] : `/${s[3]}/`
                break
            }
        }
    }

    const meanings: WordLookupMeaning[] = []

    if (Array.isArray(dict) && dict.length > 0) {
        for (const item of dict) {
            if (Array.isArray(item) && typeof item[0] === 'string' && Array.isArray(item[1])) {
                const pos = item[0].toLowerCase().trim()
                const translations = item[1].filter((t): t is string => typeof t === 'string').slice(0, 4)
                if (translations.length > 0) {
                    meanings.push({
                        partOfSpeech: GOOGLE_POS_MAP[pos] ?? `${pos}.`,
                        definition: translations.join('；'),
                    })
                }
            }
            if (meanings.length >= 4) {
                break
            }
        }
    }

    // Fallback to direct translation if dictionary is empty
    if (meanings.length === 0 && Array.isArray(sentences) && sentences.length > 0) {
        const firstSentence = sentences[0]
        if (Array.isArray(firstSentence) && typeof firstSentence[0] === 'string' && firstSentence[0]) {
            meanings.push({
                definition: firstSentence[0],
            })
        }
    }

    if (meanings.length === 0) {
        return null
    }

    return {
        word: fallbackWord,
        phonetic,
        meanings,
        sourceName: 'Google',
        sourceUrl: `https://translate.google.com/?sl=auto&tl=${encodeURIComponent(targetLang || 'zh-Hans')}&text=${encodeURIComponent(fallbackWord)}&op=translate`,
    }
}

export const googleAdapter: DictionaryAdapter = {
    async lookup(
        word: string,
        config: DictionaryProviderConfig,
        options?: DictionaryLookupOptions
    ): Promise<WordLookupPreview | null> {
        const targetLang = options?.targetLang || 'zh-Hans'
        const fetcher = getUniversalFetch()

        // If user provided a custom Google API key, use official cloud translate
        if (config.apiKey) {
            const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(config.apiKey)}`
            const response = await fetcher(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: word,
                    target: targetLang,
                    format: 'text',
                }),
                signal: options?.signal,
            })
            if (!response.ok) {
                throw new Error(`Google API lookup failed with status ${response.status}`)
            }
            const data = await response.json()
            const translatedText = data?.data?.translations?.[0]?.translatedText
            if (!translatedText) return null
            return {
                word,
                meanings: [{ definition: translatedText }],
                sourceName: 'Google Cloud Translate',
            }
        }

        // Default: Keyless Google GTX endpoint
        const baseUrl = config.baseURL?.trim() || 'https://translate.google.com/translate_a/single'
        const params = new URLSearchParams({
            client: 'gtx',
            sl: 'auto',
            tl: targetLang,
            hl: 'zh-CN',
            dt: 'bd',
            q: word,
        })
        // Add extra dt parameters for pronunciations and translations
        const url = `${baseUrl}?${params.toString()}&dt=at&dt=rm`

        const response = await fetcher(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: options?.signal,
        })

        if (!response.ok) {
            throw new Error(`Google dictionary lookup failed with status ${response.status}`)
        }

        const data = await response.json()
        return parseGoogleGtxResponse(data, word, targetLang)
    },
}
