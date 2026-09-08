/* eslint-disable @typescript-eslint/no-explicit-any */
import { createParser } from 'eventsource-parser'
import { IBrowser, ISettings } from './types'
import { getUniversalFetch } from './universal-fetch'
import { electronBrowser } from './polyfills/electron'
import { tauriBrowser } from './polyfills/tauri'
import { userscriptBrowser } from './polyfills/userscript'
import { v4 as uuidv4 } from 'uuid'
import { listen, Event, emit } from '@tauri-apps/api/event'
import { parse as bestEffortJSONParse } from 'best-effort-json-parser'
import { commands } from '@/tauri/bindings'
import { BaseDirectory, writeTextFile } from '@tauri-apps/plugin-fs'
import { DEFAULT_DICTIONARY_PROVIDERS } from './dictionary/presets'

export const defaultAutoTranslate = false
export const defaultTargetLanguage = 'zh-Hans'
export const defaultWritingTargetLanguage = 'en'
export const defaultSelectInputElementsText = true
export const defaultReadSelectedWordsFromInputElementsText = false
export const defaulti18n = 'en'

// In order to let the type system remind you that all keys have been passed to browser.storage.sync.get(keys)
const settingKeys: Record<keyof ISettings, number> = {
    automaticCheckForUpdates: 1,
    providers: 1,
    defaultProviderId: 1,
    enableMica: 1,
    enableBackgroundBlur: 1,
    autoTranslate: 1,
    defaultTranslateMode: 1,
    defaultTargetLanguage: 1,
    alwaysShowIcons: 1,
    hotkey: 1,
    displayWindowHotkey: 1,
    ocrHotkey: 1,
    quickTranslatorHotkey: 1,
    writingTargetLanguage: 1,
    writingHotkey: 1,
    writingNewlineHotkey: 1,
    themeType: 1,
    i18n: 1,
    tts: 1,
    restorePreviousPosition: 1,
    runAtStartup: 1,
    selectInputElementsText: 1,
    readSelectedWordsFromInputElementsText: 1,
    allowUsingClipboardWhenSelectedTextNotAvailable: 1,
    pinned: 1,
    autoCollect: 1,
    hideTheIconInTheDock: 1,
    languageDetectionEngine: 1,
    autoHideWindowWhenOutOfFocus: 1,
    proxy: 1,
    fontSize: 1,
    uiFontSize: 1,
    iconSize: 1,
    useCompactLookup: 1,
    dictionary: 1,
}

export async function getSettings(): Promise<ISettings> {
    const browser = await getBrowser()
    const items = await browser.storage.sync.get(Object.keys(settingKeys))

    const settings = items as ISettings
    // `storage.sync` round-trips JSON, and the Tauri config file is hand-editable,
    // so a malformed value here would otherwise crash every caller downstream.
    if (!Array.isArray(settings.providers)) {
        settings.providers = []
    }
    if (settings.defaultProviderId && !settings.providers.some((p) => p.id === settings.defaultProviderId)) {
        settings.defaultProviderId = settings.providers[0]?.id
    }
    if (!settings.defaultProviderId) {
        settings.defaultProviderId = settings.providers[0]?.id
    }
    if (!settings.dictionary) {
        settings.dictionary = {
            enabled: true,
            defaultProviderId: DEFAULT_DICTIONARY_PROVIDERS[0]?.id,
            providers: DEFAULT_DICTIONARY_PROVIDERS,
        }
    } else {
        if (settings.dictionary.enabled === undefined || settings.dictionary.enabled === null) {
            settings.dictionary.enabled = true
        }
        if (!Array.isArray(settings.dictionary.providers) || settings.dictionary.providers.length === 0) {
            settings.dictionary.providers = DEFAULT_DICTIONARY_PROVIDERS
        }
        if (
            !settings.dictionary.defaultProviderId ||
            !settings.dictionary.providers.some((p) => p.id === settings.dictionary?.defaultProviderId)
        ) {
            settings.dictionary.defaultProviderId = settings.dictionary.providers[0]?.id
        }
    }
    if (settings.autoTranslate === undefined || settings.autoTranslate === null) {
        settings.autoTranslate = defaultAutoTranslate
    }
    if (!settings.defaultTranslateMode) {
        settings.defaultTranslateMode = 'translate'
    }
    if (!settings.defaultTargetLanguage) {
        settings.defaultTargetLanguage = defaultTargetLanguage
    }
    if (!settings.writingTargetLanguage) {
        settings.writingTargetLanguage = defaultWritingTargetLanguage
    }
    if (settings.alwaysShowIcons === undefined || settings.alwaysShowIcons === null) {
        settings.alwaysShowIcons = !isTauri()
    }
    if (!settings.i18n) {
        settings.i18n = defaulti18n
    }
    if (settings.selectInputElementsText === undefined || settings.selectInputElementsText === null) {
        settings.selectInputElementsText = defaultSelectInputElementsText
    }
    if (
        settings.readSelectedWordsFromInputElementsText === undefined ||
        settings.readSelectedWordsFromInputElementsText === null
    ) {
        settings.readSelectedWordsFromInputElementsText = defaultReadSelectedWordsFromInputElementsText
    }
    if (!settings.themeType) {
        settings.themeType = 'followTheSystem'
    }
    if (settings.tts?.provider === 'EdgeTTS') {
        // The Edge TTS public endpoint no longer works, so route users who
        // had selected it onto the local engine.
        settings.tts = { ...settings.tts, provider: 'LocalTTS' }
    }
    if (settings.automaticCheckForUpdates === undefined || settings.automaticCheckForUpdates === null) {
        settings.automaticCheckForUpdates = true
    }
    if (settings.enableBackgroundBlur === undefined || settings.enableBackgroundBlur === null) {
        if (settings.enableMica !== undefined && settings.enableMica !== null) {
            settings.enableBackgroundBlur = settings.enableMica
        } else {
            settings.enableBackgroundBlur = false
        }
    }
    if (!settings.languageDetectionEngine) {
        settings.languageDetectionEngine = 'baidu'
    }
    if (!settings.proxy) {
        settings.proxy = {
            enabled: false,
            protocol: 'HTTP',
            server: '127.0.0.1',
            port: '1080',
            basicAuth: {
                username: '',
                password: '',
            },
            noProxy: 'localhost,127.0.0.1',
        }
    }
    if (settings.fontSize === undefined || settings.fontSize === null) {
        settings.fontSize = 15
    }
    if (settings.uiFontSize === undefined || settings.uiFontSize === null) {
        settings.uiFontSize = 14
    }
    if (settings.iconSize === undefined || settings.iconSize === null) {
        settings.iconSize = 15
    }
    if (settings.hideTheIconInTheDock === undefined || settings.hideTheIconInTheDock === null) {
        settings.hideTheIconInTheDock = true
    }
    return settings
}

export async function setSettings(settings: Partial<ISettings>) {
    const browser = await getBrowser()
    await browser.storage.sync.set(settings)
}

export async function getBrowser(): Promise<IBrowser> {
    if (isElectron()) {
        return electronBrowser
    }
    if (isTauri()) {
        return tauriBrowser
    }
    if (isUserscript()) {
        return userscriptBrowser
    }
    return (await import('webextension-polyfill')).default
}

export const isElectron = () => {
    return navigator.userAgent.indexOf('Electron') >= 0
}

export const isTauri = () => {
    if (typeof window === 'undefined') {
        return false
    }
    return window['__TAURI__' as any] !== undefined || (window as any).__TAURI_INTERNALS__ !== undefined
}

export const isBrowserExtensionOptions = () => {
    if (typeof window === 'undefined') {
        return false
    }
    return window['__IS_OT_BROWSER_EXTENSION_OPTIONS__' as any] !== undefined
}

export const isBrowserExtensionContentScript = () => {
    if (typeof window === 'undefined') {
        return false
    }
    return window['__IS_OT_BROWSER_EXTENSION_CONTENT_SCRIPT__' as any] !== undefined
}

export const isDesktopApp = () => {
    return isElectron() || isTauri()
}

export const isUserscript = () => {
    // eslint-disable-next-line camelcase
    return typeof GM_info !== 'undefined'
}

export const isDarkMode = async () => {
    const settings = await getSettings()
    if (settings.themeType === 'followTheSystem') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return settings.themeType === 'dark'
}

export const isFirefox = () => /firefox/i.test(navigator.userAgent)

// js to csv
export async function exportToCsv<T extends Record<string, string | number>>(filename: string, rows: T[]) {
    if (!rows.length) return
    filename += '.csv'
    const columns = Object.keys(rows[0])
    let csvFile = ''
    for (const key of columns) {
        csvFile += key + ','
    }
    csvFile += '\r\n'
    const processRow = function (row: T) {
        let s = ''
        for (const key of columns) {
            if (key === 'updatedAt') {
                s += '\t' + `${row[key]}` + ','
            } else {
                s += '"' + `${row[key]}` + '"' + ','
            }
        }
        return s + '\r\n'
    }

    for (let i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i])
    }

    if (isDesktopApp()) {
        try {
            return await writeTextFile(filename, csvFile, { baseDir: BaseDirectory.Desktop })
        } catch (e) {
            console.error(e)
        }
    } else {
        const link = document.createElement('a')
        if (link.download !== undefined) {
            link.setAttribute('href', 'data:text/csv;charset=utf-8,ufeff' + encodeURIComponent(csvFile))
            link.setAttribute('download', filename)
            // link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }
}

interface FetchSSEOptions extends RequestInit {
    onMessage(data: string): Promise<void>
    onError(error: any): void
    onStatusCode?: (statusCode: number) => void
    fetcher?: (input: string, options: RequestInit) => Promise<Response>
    usePartialArrayJSONParser?: boolean
    isJSONStream?: boolean
}

export async function fetchSSE(input: string, options: FetchSSEOptions) {
    const {
        onMessage,
        onError,
        onStatusCode,
        usePartialArrayJSONParser = false,
        isJSONStream = false,
        fetcher = getUniversalFetch(),
        ...fetchOptions
    } = options

    let prevArrayJSONPartial = ''
    let prevArrayJSONPartialIndex = 0
    const partialArrayJSONParser = async ({ value, done }: { value: string; done: boolean }) => {
        if (done && !value) {
            return
        }

        try {
            const parsedResponse = bestEffortJSONParse(prevArrayJSONPartial + value)
            prevArrayJSONPartial += value
            parsedResponse.slice(prevArrayJSONPartialIndex).forEach((data: string) => {
                onMessage(JSON.stringify(data))
            })
            prevArrayJSONPartialIndex = parsedResponse.length
        } catch (e) {
            console.error('streaming json parser error', e)
            console.error('streaming json parser value', value)
            return
        }
    }

    let prevJSONPartial = ''
    const partialJSONParser = async ({ value, done }: { value: string; done: boolean }) => {
        if (done && !value) {
            return
        }

        try {
            const parsedResponse = JSON.parse(prevJSONPartial + value)
            prevJSONPartial = ''
            onMessage(JSON.stringify(parsedResponse))
        } catch {
            prevJSONPartial += value
            return
        }
    }

    const sseParser = createParser({
        onEvent: async (event) => {
            await onMessage(event.data)
        },
    })

    if (isTauri()) {
        const id = uuidv4()
        const unlistens: Array<() => void> = []
        let cleanedUp = false
        const unlisten = () => {
            cleanedUp = true
            unlistens.forEach((cb) => cb())
            unlistens.length = 0
        }
        // listen() registrations resolve asynchronously and can land AFTER
        // cleanup already ran (fast failures, aborts) - such listeners used
        // to leak forever, and every leaked listener is iterated on every
        // stream chunk of every later request, grinding the whole app down
        // the longer the session runs.
        const track = (cb: () => void) => {
            if (cleanedUp) {
                cb()
                return
            }
            unlistens.push(cb)
        }
        return await new Promise<void>((resolve, reject) => {
            let isAborted = false
            options.signal?.addEventListener('abort', () => {
                isAborted = true
                unlisten?.()
                reject()
                emit('abort-fetch-stream', { id })
            })
            listen('fetch-stream-status-code', (event: Event<{ id: string; status: number }>) => {
                if (isAborted) {
                    return
                }
                if (event.payload.id === id) {
                    onStatusCode?.(event.payload.status)
                }
            })
                .then(track)
                .catch((e) => reject(e))
            listen(
                'fetch-stream-chunk',
                (event: Event<{ id: string; data: string; done: boolean; status: number }>) => {
                    if (isAborted) {
                        return
                    }
                    const payload = event.payload
                    if (payload.id !== id) {
                        return
                    }
                    if (payload.done) {
                        return
                    }
                    if (payload.status !== 200) {
                        try {
                            const data = JSON.parse(payload.data)
                            onError(data)
                        } catch {
                            onError(payload.data)
                        }
                        return
                    }
                    if (isJSONStream) {
                        partialJSONParser({ value: payload.data, done: payload.done })
                        return
                    }
                    if (usePartialArrayJSONParser) {
                        partialArrayJSONParser({ value: payload.data, done: payload.done })
                    } else {
                        sseParser.feed(payload.data)
                    }
                }
            )
                .then(track)
                .catch((e) => {
                    reject(e)
                })

            commands
                .fetchStream(id, input, JSON.stringify(fetchOptions))
                .catch((e) => {
                    reject(e)
                })
                .finally(() => {
                    // Aborted requests must clean up their listeners too.
                    unlisten()
                    if (!isAborted) {
                        resolve()
                    }
                })
        })
    }

    const resp = await fetcher(input, fetchOptions)
    onStatusCode?.(resp.status)
    if (resp.status !== 200) {
        onError(await resp.json())
        return
    }
    const reader = resp.body!.getReader()
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) {
                break
            }
            const str = new TextDecoder().decode(value)
            if (isJSONStream) {
                partialJSONParser({ value: str, done })
            } else {
                if (usePartialArrayJSONParser) {
                    partialArrayJSONParser({ value: str, done })
                } else {
                    sseParser.feed(str)
                }
            }
        }
    } finally {
        reader.releaseLock()
    }
}

export function getAssetUrl(asset: string) {
    if (isUserscript()) {
        return asset
    }
    return new URL(asset, import.meta.url).href
}
export const isMacOS = navigator.userAgent.includes('Mac OS X')
export const isWindows = navigator.userAgent.includes('Windows')

export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    wait = 250
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const debounced = (...args: Parameters<T>) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => {
            timeoutId = null
            fn(...args)
        }, wait)
    }
    debounced.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId)
            timeoutId = null
        }
    }
    return debounced
}

export function isEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
    if (Array.isArray(a) !== Array.isArray(b)) return false

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        for (let i = 0; i < a.length; i++) {
            if (!isEqual(a[i], b[i])) return false
        }
        return true
    }

    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const keysA = Object.keys(aObj)
    const keysB = Object.keys(bObj)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(bObj, key) || !isEqual(aObj[key], bObj[key])) {
            return false
        }
    }
    return true
}
