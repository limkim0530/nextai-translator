import type {
    DictionaryAdapter,
    DictionaryLookupOptions,
    DictionaryProviderConfig,
    WordLookupMeaning,
    WordLookupPreview,
} from '../types'
import { getUniversalFetch } from '../../universal-fetch'

interface DictionaryDefinition {
    definition?: string
    example?: string
}

interface DictionaryMeaning {
    partOfSpeech?: string
    definitions?: DictionaryDefinition[]
}

interface DictionaryEntry {
    word?: string
    phonetic?: string
    phonetics?: Array<{ text?: string }>
    meanings?: DictionaryMeaning[]
    sourceUrls?: string[]
}

export function parseFreeDictionaryResponse(payload: unknown, fallbackWord: string): WordLookupPreview | null {
    if (!Array.isArray(payload) || payload.length === 0) {
        return null
    }

    const entry = payload[0] as DictionaryEntry
    const meanings: WordLookupMeaning[] = []

    for (const meaning of entry.meanings ?? []) {
        const definition = meaning.definitions?.find((item) => item.definition)
        if (!definition?.definition) {
            continue
        }
        meanings.push({
            partOfSpeech: meaning.partOfSpeech ?? '',
            definition: definition.definition,
            example: meaning.definitions?.find((item) => item.example)?.example,
        })
        if (meanings.length >= 3) {
            break
        }
    }

    if (meanings.length === 0) {
        return null
    }

    return {
        word: entry.word ?? fallbackWord,
        phonetic: entry.phonetic ?? entry.phonetics?.find((item) => item.text)?.text,
        meanings,
        sourceUrl: entry.sourceUrls?.[0],
        sourceName: 'Free Dictionary',
    }
}

export const freeDictionaryAdapter: DictionaryAdapter = {
    async lookup(
        word: string,
        config: DictionaryProviderConfig,
        options?: DictionaryLookupOptions
    ): Promise<WordLookupPreview | null> {
        const normalizedWord = word.toLocaleLowerCase('en-US')
        const baseUrl = config.baseURL?.trim() || 'https://api.dictionaryapi.dev/api/v2/entries/en/'
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
        const url = `${cleanBase}${encodeURIComponent(normalizedWord)}`

        const fetcher = getUniversalFetch()
        const response = await fetcher(url, {
            method: 'GET',
            signal: options?.signal,
        })

        if (response.status === 404) {
            return null
        }
        if (!response.ok) {
            throw new Error(`Free Dictionary lookup failed with status ${response.status}`)
        }

        const data = await response.json()
        return parseFreeDictionaryResponse(data, word)
    },
}
