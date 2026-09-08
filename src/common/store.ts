import { create } from 'zustand'
import { ThemeType } from './types'

interface IAppState {
    // 原 zustand 字段
    externalOriginalText?: string
    translatedText?: string
    isTranslating?: boolean
    // 原 react-hooks-global-state 字段
    collectedWordTotal: number
    themeType: ThemeType
    pinned: boolean
    // 原 jotai 字段
    showSettings: boolean

    // Actions
    setExternalOriginalText: (text: string) => void
    setStoreTranslatedText: (text: string) => void
    setStoreIsTranslating: (val: boolean) => void
    setCollectedWordTotal: (total: number | ((prev: number) => number)) => void
    setThemeType: (theme: ThemeType | ((prev: ThemeType) => ThemeType)) => void
    setPinned: (pinned: boolean | ((prev: boolean) => boolean)) => void
    setShowSettings: (show: boolean | ((prev: boolean) => boolean)) => void
}

export const useAppStore = create<IAppState>()((set) => ({
    externalOriginalText: undefined,
    translatedText: undefined,
    isTranslating: undefined,
    collectedWordTotal: 0,
    themeType: 'light',
    pinned: false,
    showSettings: false,

    setExternalOriginalText: (text) => set({ externalOriginalText: text }),
    setStoreTranslatedText: (text) => set({ translatedText: text }),
    setStoreIsTranslating: (isTranslating) => set({ isTranslating }),
    setCollectedWordTotal: (total) =>
        set((state) => ({
            collectedWordTotal: typeof total === 'function' ? total(state.collectedWordTotal) : total,
        })),
    setThemeType: (themeType) =>
        set((state) => ({
            themeType: typeof themeType === 'function' ? themeType(state.themeType) : themeType,
        })),
    setPinned: (pinned) =>
        set((state) => ({
            pinned: typeof pinned === 'function' ? pinned(state.pinned) : pinned,
        })),
    setShowSettings: (updater) =>
        set((state) => ({
            showSettings: typeof updater === 'function' ? updater(state.showSettings) : updater,
        })),
}))

export const useTranslatorStore = useAppStore
export const setExternalOriginalText = (text: string) => useAppStore.getState().setExternalOriginalText(text)
export const setStoreTranslatedText = (text: string) => useAppStore.getState().setStoreTranslatedText(text)
export const setStoreIsTranslating = (isTranslating: boolean) =>
    useAppStore.getState().setStoreIsTranslating(isTranslating)
