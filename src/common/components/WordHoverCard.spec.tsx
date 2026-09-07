import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, Root } from 'react-dom/client'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))
vi.mock('../hooks/useTheme', async () => {
    const { LightTheme } = await import('baseui/themes')
    return { useTheme: () => ({ theme: LightTheme, themeType: 'light' }) }
})
const mockSettings = {
    tts: {},
    dictionary: { enabled: true },
}
vi.mock('../hooks/useSettings', () => ({
    useSettings: () => ({
        settings: mockSettings,
        isSettingsLoading: false,
    }),
}))
vi.mock('../services/wordLookup', () => ({
    lookupEnglishWord: vi.fn().mockResolvedValue({
        word: 'test',
        phonetic: '/test/',
        meanings: [{ partOfSpeech: 'noun', definition: 'a trial or experiment' }],
    }),
}))

import { WordHoverProvider, HoverableText } from './WordHoverCard'

// @ts-expect-error configure global IS_REACT_ACT_ENVIRONMENT
globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('WordHoverCard in normal DOM (popup style)', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        vi.useFakeTimers()
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
    })

    afterEach(() => {
        act(() => {
            root.unmount()
        })
        container.remove()
        vi.useRealTimers()
    })

    async function setupHoverCard() {
        await act(async () => {
            root.render(
                <WordHoverProvider enabled onOpenDetails={() => {}}>
                    <HoverableText>test word</HoverableText>
                </WordHoverProvider>
            )
        })

        const wordSpan = container.querySelector('span[role="link"]')
        expect(wordSpan).not.toBeNull()

        act(() => {
            wordSpan?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
            wordSpan?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
        })

        await act(async () => {
            await vi.advanceTimersByTimeAsync(300)
        })

        const dialog = document.body.querySelector('div[role="dialog"]')
        expect(dialog).not.toBeNull()
        return { wordSpan: wordSpan as HTMLElement, dialog: dialog as HTMLElement }
    }

    it('renders card into document.body on hover', async () => {
        const { dialog } = await setupHoverCard()
        expect(dialog).not.toBeNull()
    })

    it('keeps card open on window resize without destroying it', async () => {
        await setupHoverCard()
        act(() => {
            window.dispatchEvent(new Event('resize'))
        })
        const dialog = document.body.querySelector('div[role="dialog"]')
        expect(dialog).not.toBeNull()
    })

    it('keeps card open when scrolling inside the card', async () => {
        const { dialog } = await setupHoverCard()
        act(() => {
            dialog.dispatchEvent(new Event('scroll', { bubbles: true }))
        })
        const stillOpenDialog = document.body.querySelector('div[role="dialog"]')
        expect(stillOpenDialog).not.toBeNull()
    })

    it('closes card when pressing Escape', async () => {
        await setupHoverCard()
        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        })
        const dialog = document.body.querySelector('div[role="dialog"]')
        expect(dialog).toBeNull()
    })

    it('closes card when clicking outside', async () => {
        await setupHoverCard()
        const outsideElement = document.createElement('button')
        document.body.appendChild(outsideElement)
        act(() => {
            outsideElement.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
        })
        outsideElement.remove()
        const dialog = document.body.querySelector('div[role="dialog"]')
        expect(dialog).toBeNull()
    })

    it('closes card when anchor word is scrolled out of viewport', async () => {
        const { wordSpan } = await setupHoverCard()
        vi.spyOn(wordSpan, 'getBoundingClientRect').mockReturnValue({
            left: 50,
            right: 100,
            top: -20,
            bottom: -5,
            width: 50,
            height: 15,
            x: 50,
            y: -20,
            toJSON: () => {},
        })

        act(() => {
            window.dispatchEvent(new Event('scroll'))
        })

        const dialog = document.body.querySelector('div[role="dialog"]')
        expect(dialog).toBeNull()
    })
})
