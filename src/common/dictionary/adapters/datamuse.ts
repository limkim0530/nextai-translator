import type {
    DictionaryAdapter,
    DictionaryLookupOptions,
    DictionaryProviderConfig,
    WordLookupMeaning,
    WordLookupPreview,
} from '../types'
import { getUniversalFetch } from '../../universal-fetch'

interface DatamuseEntry {
    word?: string
    score?: number
    defs?: string[]
    tags?: string[]
}

const POS_MAP: Record<string, string> = {
    n: 'n.',
    v: 'v.',
    adj: 'adj.',
    adv: 'adv.',
    u: '',
}

export function parseDatamuseResponse(payload: unknown, fallbackWord: string): WordLookupPreview | null {
    if (!Array.isArray(payload) || payload.length === 0) {
        return null
    }

    const entry = payload[0] as DatamuseEntry
    if (!entry || !entry.word) {
        return null
    }

    let phonetic: string | undefined
    if (Array.isArray(entry.tags)) {
        const ipaTag = entry.tags.find((t) => typeof t === 'string' && t.startsWith('ipa_pron:'))
        if (ipaTag) {
            const rawIpa = ipaTag.slice('ipa_pron:'.length).trim()
            if (rawIpa) {
                phonetic = rawIpa.startsWith('/') ? rawIpa : `/${rawIpa}/`
            }
        }
    }

    const meanings: WordLookupMeaning[] = []
    if (Array.isArray(entry.defs)) {
        for (const defStr of entry.defs) {
            if (typeof defStr !== 'string') continue
            const tabIdx = defStr.indexOf('\t')
            if (tabIdx !== -1) {
                const posRaw = defStr.slice(0, tabIdx).trim().toLowerCase()
                const defText = defStr.slice(tabIdx + 1).trim()
                if (defText) {
                    meanings.push({
                        partOfSpeech: POS_MAP[posRaw] ?? (posRaw ? `${posRaw}.` : ''),
                        definition: defText,
                    })
                }
            } else if (defStr.trim()) {
                meanings.push({
                    definition: defStr.trim(),
                })
            }
            if (meanings.length >= 3) {
                break
            }
        }
    }

    if (meanings.length === 0) {
        return null
    }

    return {
        word: entry.word || fallbackWord,
        phonetic,
        meanings,
        sourceName: 'Datamuse',
        sourceUrl: `https://www.datamuse.com/api/`,
    }
}

export const datamuseAdapter: DictionaryAdapter = {
    async lookup(
        word: string,
        config: DictionaryProviderConfig,
        options?: DictionaryLookupOptions
    ): Promise<WordLookupPreview | null> {
        const normalizedWord = word.trim().toLocaleLowerCase('en-US')
        const baseUrl = config.baseURL?.trim() || 'https://api.datamuse.com/words'
        const url = `${baseUrl}?sp=${encodeURIComponent(normalizedWord)}&md=dr&max=1`

        const fetcher = getUniversalFetch()
        const response = await fetcher(url, {
            method: 'GET',
            signal: options?.signal,
        })

        if (!response.ok) {
            throw new Error(`Datamuse lookup failed with status ${response.status}`)
        }

        const data = await response.json()
        return parseDatamuseResponse(data, word)
    },
}
