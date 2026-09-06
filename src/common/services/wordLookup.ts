import type { ISettings } from '../types'
import { lookupWord as doLookupWord } from '../dictionary'
import type { WordLookupPreview } from '../dictionary/types'

export type { WordLookupMeaning, WordLookupPreview } from '../dictionary/types'
export { parseFreeDictionaryResponse as parseDictionaryResponse } from '../dictionary/adapters/freeDictionary'
export { lookupWord, clearDictionaryCache } from '../dictionary'

export async function lookupEnglishWord(
    word: string,
    signal?: AbortSignal,
    settings?: ISettings
): Promise<WordLookupPreview | null> {
    return doLookupWord(word, settings, signal)
}
