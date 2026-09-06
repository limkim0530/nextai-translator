import type { ProviderConfig } from '../providers/types'

export interface WordLookupMeaning {
    partOfSpeech?: string
    definition: string
    example?: string
}

export interface WordLookupPreview {
    word: string
    phonetic?: string
    meanings: WordLookupMeaning[]
    sourceUrl?: string
    sourceName?: string
}

export type DictionaryProtocol = 'free-dictionary' | 'datamuse' | 'google' | 'microsoft' | 'youdao' | 'llm'

export interface DictionaryProviderConfig {
    id: string
    name: string
    protocol: DictionaryProtocol
    baseURL?: string
    apiKey?: string
    apiSecret?: string
    providerId?: string
    headers?: Record<string, string>
    enabled?: boolean
}

export interface DictionaryLookupOptions {
    targetLang?: string
    signal?: AbortSignal
    providers?: ProviderConfig[]
}

export interface DictionaryAdapter {
    lookup(
        word: string,
        config: DictionaryProviderConfig,
        options?: DictionaryLookupOptions
    ): Promise<WordLookupPreview | null>
}
