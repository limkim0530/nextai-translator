import { Theme } from './theme'
export type { Theme }
import { TranslateMode } from './translate'
import { TTSProvider } from './tts/types'
import { ProviderConfig } from './providers/types'
import { LangCode } from './lang'
import type { DictionaryProviderConfig } from './dictionary/types'

export type { DictionaryProviderConfig } from './dictionary/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ISync {
    get(keys: string[]): Promise<Record<string, any>>
    set(items: Record<string, any>): Promise<void>
}

interface IStorage {
    sync: ISync
}

interface IRuntimeOnMessage {
    addListener(callback: (message: any, sender: any, sendResponse: any) => void): void
    removeListener(callback: (message: any, sender: any, sendResponse: any) => void): void
}

interface IRuntime {
    onMessage: IRuntimeOnMessage
    sendMessage(message: any): void
    getURL(path: string): string
    /**
     * Only the browser-extension polyfill backs this; the Tauri, userscript and
     * Electron shims have no manifest, so callers must optional-chain it and
     * degrade rather than assume a manifest exists.
     */
    getManifest?(): Record<string, any>
}

interface II18n {
    detectLanguage(text: string): Promise<{ languages: { language: string; percentage: number }[] }>
}

export interface IBrowser {
    storage: IStorage
    runtime: IRuntime
    i18n: II18n
}

export type BaseThemeType = 'light' | 'dark'
export type ThemeType = BaseThemeType | 'followTheSystem'

export interface IThemedStyleProps {
    theme: Theme
    themeType: BaseThemeType
    isDesktopApp?: boolean
    showLogo?: boolean
}

export type LanguageDetectionEngine = 'google' | 'baidu' | 'bing' | 'local'

export type ProxyProtocol = 'HTTP' | 'HTTPS'

export interface ISettings {
    automaticCheckForUpdates: boolean
    /**
     * Every configured endpoint, in display order.
     *
     * Replaces the old fixed `Provider` enum and its ~40 flat settings keys:
     * a provider is now data, so reaching a new vendor is a row in this list
     * rather than a new engine class and a new set of keys.
     */
    providers: ProviderConfig[]
    /** `id` of the provider used when an action specifies none. */
    defaultProviderId?: string
    autoTranslate: boolean
    defaultTranslateMode: Exclude<TranslateMode, 'big-bang'> | 'nop'
    defaultTargetLanguage: string
    alwaysShowIcons: boolean
    enableBackgroundBlur: boolean
    enableMica: boolean // deprecated, please use enableBackgroundBlur
    hotkey?: string
    displayWindowHotkey?: string
    ocrHotkey?: string
    quickTranslatorHotkey?: string
    writingTargetLanguage: string
    writingHotkey?: string
    writingNewlineHotkey?: string
    themeType?: ThemeType
    i18n?: string
    tts?: {
        voices?: {
            lang: LangCode
            voice: string
        }[]
        provider?: TTSProvider
        volume?: number
        rate?: number
    }
    restorePreviousPosition?: boolean
    selectInputElementsText?: boolean
    readSelectedWordsFromInputElementsText?: boolean
    runAtStartup?: boolean
    allowUsingClipboardWhenSelectedTextNotAvailable?: boolean
    pinned?: boolean
    autoCollect?: boolean
    hideTheIconInTheDock?: boolean
    languageDetectionEngine?: LanguageDetectionEngine
    autoHideWindowWhenOutOfFocus?: boolean
    proxy?: {
        enabled?: boolean
        protocol?: ProxyProtocol
        server?: string
        port?: string
        basicAuth?: {
            username?: string
            password?: string
        }
        noProxy?: string
    }
    fontSize: number
    uiFontSize: number
    iconSize: number
    useCompactLookup?: boolean
    dictionary?: {
        enabled?: boolean
        defaultProviderId?: string
        providers?: DictionaryProviderConfig[]
    }
}
