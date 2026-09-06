import type { DictionaryAdapter, DictionaryProtocol } from '../types'
import { freeDictionaryAdapter } from './freeDictionary'
import { datamuseAdapter } from './datamuse'
import { googleAdapter } from './google'
import { microsoftAdapter } from './microsoft'
import { youdaoAdapter } from './youdao'
import { llmAdapter } from './llm'

export const ADAPTERS: Record<DictionaryProtocol, DictionaryAdapter> = {
    'free-dictionary': freeDictionaryAdapter,
    'datamuse': datamuseAdapter,
    'google': googleAdapter,
    'microsoft': microsoftAdapter,
    'youdao': youdaoAdapter,
    'llm': llmAdapter,
}

export function getDictionaryAdapter(protocol: DictionaryProtocol): DictionaryAdapter {
    const adapter = ADAPTERS[protocol]
    if (!adapter) {
        throw new Error(`Unsupported dictionary protocol: ${protocol}`)
    }
    return adapter
}
