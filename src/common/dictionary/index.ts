import type { ISettings } from '../types'
import type { DictionaryLookupOptions, DictionaryProviderConfig, WordLookupPreview } from './types'
import { getDictionaryAdapter } from './adapters'
import { DEFAULT_DICTIONARY_PROVIDERS } from './presets'

export * from './types'
export * from './presets'
export * from './adapters'

const lookupCache = new Map<string, WordLookupPreview | null>()

export function clearDictionaryCache(): void {
    lookupCache.clear()
}

export function resolveDictionaryProvider(settings?: ISettings): DictionaryProviderConfig {
    const providers = settings?.dictionary?.providers ?? []
    if (providers.length === 0) {
        return DEFAULT_DICTIONARY_PROVIDERS[0]
    }

    const defaultId = settings?.dictionary?.defaultProviderId
    if (defaultId) {
        const found = providers.find((p) => p.id === defaultId)
        if (found) {
            return found
        }
    }

    return providers[0]
}

export async function lookupWord(
    word: string,
    settings?: ISettings,
    signal?: AbortSignal
): Promise<WordLookupPreview | null> {
    if (settings?.dictionary?.enabled === false) {
        return null
    }

    const trimmedWord = word.trim()
    if (!trimmedWord) {
        return null
    }

    const provider = resolveDictionaryProvider(settings)
    const targetLang = settings?.defaultTargetLanguage || 'zh-Hans'
    const normalizedKey = `${provider.id}:${targetLang}:${trimmedWord.toLocaleLowerCase('en-US')}`

    if (lookupCache.has(normalizedKey)) {
        return lookupCache.get(normalizedKey) ?? null
    }

    const adapter = getDictionaryAdapter(provider.protocol)
    const options: DictionaryLookupOptions = {
        targetLang,
        signal,
        providers: settings?.providers,
    }

    try {
        const preview = await adapter.lookup(trimmedWord, provider, options)
        lookupCache.set(normalizedKey, preview)
        return preview
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            throw error
        }
        // Fallback to Free Dictionary or Datamuse if primary provider fails
        if (provider.protocol !== 'free-dictionary' && provider.protocol !== 'datamuse') {
            try {
                const fallbackAdapter = getDictionaryAdapter('datamuse')
                const fallbackPreview = await fallbackAdapter.lookup(
                    trimmedWord,
                    DEFAULT_DICTIONARY_PROVIDERS[1],
                    options
                )
                if (fallbackPreview) {
                    lookupCache.set(normalizedKey, fallbackPreview)
                    return fallbackPreview
                }
            } catch {
                // Ignore fallback error
            }
        }
        throw error
    }
}
