import { v4 as uuidv4 } from 'uuid'
import type { DictionaryProviderConfig } from './types'

export interface DictionaryPreset {
    id: string
    name: string
    protocol: DictionaryProviderConfig['protocol']
    keyless?: boolean
    docsURL?: string
    baseURL?: string
    description?: string
}

export const DICTIONARY_PRESETS: DictionaryPreset[] = [
    {
        id: 'free-dictionary',
        name: 'Free Dictionary API',
        protocol: 'free-dictionary',
        keyless: true,
        docsURL: 'https://dictionaryapi.dev/',
        baseURL: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
        description: 'English-English dictionary with definitions, phonetics, and examples.',
    },
    {
        id: 'datamuse',
        name: 'Datamuse API',
        protocol: 'datamuse',
        keyless: true,
        docsURL: 'https://www.datamuse.com/api/',
        baseURL: 'https://api.datamuse.com/words',
        description: 'Fast public lexical API providing IPA pronunciations and part-of-speech definitions.',
    },
    {
        id: 'google',
        name: 'Google Dictionary',
        protocol: 'google',
        keyless: true,
        docsURL: 'https://translate.google.com/',
        description: 'Bilingual dictionary and translation into target language.',
    },
    {
        id: 'microsoft',
        name: 'Microsoft Edge Dictionary',
        protocol: 'microsoft',
        keyless: true,
        docsURL: 'https://www.microsoft.com/translator/',
        description: 'Microsoft Edge cognitive lookup with POS tags, definitions, and back-translations.',
    },
    {
        id: 'youdao',
        name: 'Youdao (有道智云)',
        protocol: 'youdao',
        keyless: false,
        docsURL: 'https://ai.youdao.com/',
        baseURL: 'https://openapi.youdao.com/api',
        description: 'Comprehensive Chinese-English bilingual dictionary with phonetic and Collins ratings.',
    },
    {
        id: 'llm',
        name: 'AI Model (LLM)',
        protocol: 'llm',
        keyless: true,
        description: 'Reuse configured AI models (OpenAI, DeepSeek, Gemini, etc.) to lookup definitions.',
    },
]

export function findDictionaryPreset(id: string): DictionaryPreset | undefined {
    return DICTIONARY_PRESETS.find((preset) => preset.id === id)
}

export function createDictionaryProviderFromPreset(
    presetId: string,
    overrides: Partial<DictionaryProviderConfig> = {}
): DictionaryProviderConfig {
    const preset = findDictionaryPreset(presetId)
    if (!preset) {
        return {
            id: uuidv4(),
            name: 'Free Dictionary API',
            protocol: 'free-dictionary',
            baseURL: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
            ...overrides,
        }
    }
    return {
        id: uuidv4(),
        name: preset.name,
        protocol: preset.protocol,
        baseURL: preset.baseURL,
        ...overrides,
    }
}

export const DEFAULT_DICTIONARY_PROVIDERS: DictionaryProviderConfig[] = [
    {
        id: 'default-free-dictionary',
        name: 'Free Dictionary API',
        protocol: 'free-dictionary',
        baseURL: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
    },
    {
        id: 'default-datamuse',
        name: 'Datamuse API',
        protocol: 'datamuse',
        baseURL: 'https://api.datamuse.com/words',
    },
    {
        id: 'default-google',
        name: 'Google Dictionary',
        protocol: 'google',
    },
    {
        id: 'default-microsoft',
        name: 'Microsoft Edge Dictionary',
        protocol: 'microsoft',
    },
    {
        id: 'default-llm',
        name: 'AI Model (LLM)',
        protocol: 'llm',
    },
]
