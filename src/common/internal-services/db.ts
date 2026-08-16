import Dexie, { Table } from 'dexie'
import { TranslateMode } from '../translate'
import { LangCode } from '../lang'

export interface VocabularyItem {
    word: string
    reviewCount: number
    description: string
    updatedAt: string
    createdAt: string
    [prop: string]: string | number
}

export type ActionOutputRenderingFormat = 'text' | 'markdown' | 'latex'

export interface Action {
    id?: number
    idx: number
    mode?: TranslateMode
    name: string
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    /**
     * `ProviderConfig.id` this action pins, if any. An id rather than a vendor
     * name, so an action can target one of several instances of the same
     * vendor (different key, endpoint or reasoning setting).
     */
    providerId?: string
    apiModel?: string
    updatedAt: string
    createdAt: string
}

export interface HistoryItem {
    id?: number
    text: string
    translatedText: string
    sourceLang: LangCode
    targetLang: LangCode
    actionId?: number
    actionName?: string
    actionMode?: TranslateMode
    provider?: string
    engineModel?: string
    favorite: boolean
    wordMode?: boolean
    tokenCount?: number
    createdAt: number
    updatedAt: number
}

/**
 * A cached upstream snapshot, keyed by a well-known name. Lives in IndexedDB
 * rather than `storage.sync` because the model capability catalog is ~250KB and
 * `storage.sync` caps out at 100KB total / 8KB per item.
 */
export interface CachedSnapshot {
    key: string
    /** Serialized payload. Kept as a string so Dexie stores one opaque blob. */
    payload: string
    updatedAt: number
}

export class LocalDB extends Dexie {
    vocabulary!: Table<VocabularyItem>
    action!: Table<Action>
    history!: Table<HistoryItem>
    snapshot!: Table<CachedSnapshot>

    constructor() {
        super('openai-translator')
        this.version(4).stores({
            vocabulary: 'word, reviewCount, description, updatedAt, createdAt',
            action: '++id, idx, mode, name, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
        })
        this.version(5).stores({
            vocabulary: 'word, reviewCount, description, updatedAt, createdAt',
            action: '++id, idx, mode, name, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
            history:
                '++id, createdAt, updatedAt, text, translatedText, sourceLang, targetLang, actionId, actionMode, favorite',
        })
        this.version(6).stores({
            vocabulary: 'word, reviewCount, description, updatedAt, createdAt',
            action: '++id, idx, mode, name, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
            history:
                '++id, createdAt, updatedAt, text, translatedText, sourceLang, targetLang, actionId, actionMode, favorite',
            snapshot: 'key, updatedAt',
        })
    }
}

let localDB: LocalDB

export const getLocalDB = () => {
    if (!localDB) {
        localDB = new LocalDB()
    }
    return localDB
}
