import '../enable-dev-hmr'
import * as utils from '@/common/utils'
import React from 'react'
import icon from '@/common/assets/images/icon.png'
import { popupCardID, popupCardOffset, popupThumbID, zIndex } from './consts'
import { Translator } from '@/common/components/Translator'
import { InlineLookupContainer } from './InlineLookupContainer'
import { getContainer, queryPopupCardElement, queryPopupThumbElement } from './utils'
import { create } from 'jss'
import preset from 'jss-preset-default'
import { JssProvider, createGenerateId } from 'react-jss'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider } from 'baseui'
import { createRoot, Root } from 'react-dom/client'
import hotkeys from 'hotkeys-js'
import '@/common/i18n.js'
import { PREFIX } from '@/common/constants'
import { getCaretNodeType, getClientX, getClientY, getPageX, getPageY, UserEventType } from '@/common/user-event'
import { GlobalSuspense } from '@/common/components/GlobalSuspense'
import { type ReferenceElement } from '@floating-ui/dom'
import InnerContainer from './InnerContainer'
import TitleBar from './TitleBar'
import { addShadowStyleTarget } from './shadow-styles'
import { setExternalOriginalText } from '@/common/store'
import { useTheme } from '@/common/hooks/useTheme'

let root: Root | null = null
const generateId = createGenerateId()
const hidePopupThumbTimer: number | null = null

async function popupThumbClickHandler(event: UserEventType) {
    event.stopPropagation()
    event.preventDefault()
    const $popupThumb: HTMLDivElement | null = await queryPopupThumbElement()
    if (!$popupThumb) {
        return
    }
    showPopupCard($popupThumb, $popupThumb.dataset['text'] || '')
}

async function removeContainer() {
    const $container = await getContainer()
    $container.remove()
}

async function hidePopupThumb() {
    const $popupThumb: HTMLDivElement | null = await queryPopupThumbElement()
    if (!$popupThumb) {
        return
    }
    $popupThumb.style.visibility = 'hidden'
}

async function hidePopupCard() {
    const $popupCard: HTMLDivElement | null = await queryPopupCardElement()
    if (!$popupCard) {
        return
    }
    speechSynthesis.cancel()
    if (root) {
        root.unmount()
        root = null
    }
    removeContainer()
}

async function createPopupCard() {
    const $popupCard = document.createElement('div')
    $popupCard.id = popupCardID
    const $container = await getContainer()
    $container.shadowRoot?.querySelector('div')?.appendChild($popupCard)
    if ($container.shadowRoot) {
        await addShadowStyleTarget($container.shadowRoot)
    }
    return $popupCard
}

interface PopupCardAppProps {
    engine: Styletron
    jss: ReturnType<typeof create>
    reference: ReferenceElement
    isCompact: boolean
    text: string
    pinned?: boolean
    autoFocus?: boolean
    isUserscript: boolean
    onClose: () => void
}

function PopupCardApp({
    engine,
    jss,
    reference,
    isCompact,
    text,
    pinned,
    autoFocus,
    isUserscript,
    onClose,
}: PopupCardAppProps) {
    const { theme } = useTheme()

    return (
        <React.StrictMode>
            <GlobalSuspense>
                <JssProvider jss={jss} generateId={generateId} classNamePrefix='__yetone-nextai-translator-jss-'>
                    <StyletronProvider value={engine}>
                        <BaseProvider theme={theme} zIndex={parseInt(zIndex, 10)}>
                            <InnerContainer reference={reference} compact={isCompact}>
                                {isCompact ? (
                                    <InlineLookupContainer text={text} onClose={onClose} />
                                ) : (
                                    <>
                                        <TitleBar pinned={pinned} onClose={onClose} />
                                        <Translator
                                            engine={engine}
                                            autoFocus={autoFocus}
                                            showSettingsIcon
                                            defaultShowSettings={isUserscript}
                                            showLogo={false}
                                            openSource='content-script'
                                        />
                                    </>
                                )}
                            </InnerContainer>
                        </BaseProvider>
                    </StyletronProvider>
                </JssProvider>
            </GlobalSuspense>
        </React.StrictMode>
    )
}

async function showPopupCard(reference: ReferenceElement, text: string, autoFocus: boolean | undefined = false) {
    const $popupThumb: HTMLDivElement | null = await queryPopupThumbElement()
    if ($popupThumb) {
        $popupThumb.style.visibility = 'hidden'
    }

    const settings = await utils.getSettings()
    let $popupCard = await queryPopupCardElement()
    if ($popupCard && settings.pinned) {
        setExternalOriginalText(text)
        return
    } else {
        $popupCard = await createPopupCard()
    }

    const engine = new Styletron({
        container: $popupCard.parentElement ?? undefined,
        prefix: `${PREFIX}-styletron-`,
    })
    const jss = create().setup({
        ...preset(),
        insertionPoint: $popupCard.parentElement ?? undefined,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__IS_OT_BROWSER_EXTENSION_CONTENT_SCRIPT__ = true
    const isUserscript = utils.isUserscript()
    root = createRoot($popupCard)
    const isCompact = settings.useCompactLookup ?? false
    root.render(
        <PopupCardApp
            engine={engine}
            jss={jss}
            reference={reference}
            isCompact={isCompact}
            text={text}
            pinned={settings.pinned}
            autoFocus={autoFocus}
            isUserscript={isUserscript}
            onClose={hidePopupCard}
        />
    )
    if (!isCompact) {
        setExternalOriginalText(text)
    }
}

async function showPopupThumb(text: string, x: number, y: number) {
    if (!text) {
        return
    }
    if (hidePopupThumbTimer) {
        clearTimeout(hidePopupThumbTimer)
    }
    const isDark = await utils.isDarkMode()
    let $popupThumb: HTMLDivElement | null = await queryPopupThumbElement()
    if (!$popupThumb) {
        $popupThumb = document.createElement('div')
        $popupThumb.id = popupThumbID
        $popupThumb.style.position = 'absolute'
        $popupThumb.style.zIndex = zIndex
        $popupThumb.style.background = isDark ? '#1f1f1f' : '#fff'
        $popupThumb.style.padding = '2px'
        $popupThumb.style.borderRadius = '4px'
        $popupThumb.style.boxShadow = '0 0 4px rgba(0,0,0,.2)'
        $popupThumb.style.cursor = 'pointer'
        $popupThumb.style.userSelect = 'none'
        $popupThumb.style.width = '20px'
        $popupThumb.style.height = '20px'
        $popupThumb.style.overflow = 'hidden'
        $popupThumb.addEventListener('click', popupThumbClickHandler)
        $popupThumb.addEventListener('touchend', popupThumbClickHandler)
        $popupThumb.addEventListener('mousemove', (event) => {
            event.stopPropagation()
        })
        $popupThumb.addEventListener('touchmove', (event) => {
            event.stopPropagation()
        })
        const $img = document.createElement('img')
        $img.src = utils.getAssetUrl(icon)
        $img.style.display = 'block'
        $img.style.width = '100%'
        $img.style.height = '100%'
        $popupThumb.appendChild($img)
        const $container = await getContainer()
        $container.shadowRoot?.querySelector('div')?.appendChild($popupThumb)
    }
    $popupThumb.dataset['text'] = text
    $popupThumb.style.visibility = 'visible'
    $popupThumb.style.opacity = '100'
    $popupThumb.style.left = `${x}px`
    $popupThumb.style.top = `${y}px`
}

async function main() {
    const browser = await utils.getBrowser()
    let mousedownTarget: EventTarget | null
    let lastMouseEvent: UserEventType | undefined

    const mouseUpHandler = async (event: UserEventType) => {
        lastMouseEvent = event
        const settings = await utils.getSettings()
        if (
            (mousedownTarget instanceof HTMLInputElement || mousedownTarget instanceof HTMLTextAreaElement) &&
            settings.selectInputElementsText === false
        ) {
            return
        }
        window.setTimeout(async () => {
            const sel = window.getSelection()
            let text = (sel?.toString() ?? '').trim()
            if (!text) {
                if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                    const elem = event.target
                    text = elem.value.substring(elem.selectionStart ?? 0, elem.selectionEnd ?? 0).trim()
                }
            } else {
                if (settings.autoTranslate === true) {
                    const x = getClientX(event)
                    const y = getClientY(event)
                    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
                    const rangeRect = range ? range.getBoundingClientRect() : null
                    const hasValidRangeRect = rangeRect && (rangeRect.width > 0 || rangeRect.height > 0)
                    const reference = hasValidRangeRect
                        ? { getBoundingClientRect: () => range.getBoundingClientRect() }
                        : { getBoundingClientRect: () => new DOMRect(x, y, popupCardOffset, popupCardOffset) }
                    showPopupCard(reference, text)
                } else if (settings.alwaysShowIcons === true && getCaretNodeType(event) === Node.TEXT_NODE) {
                    showPopupThumb(text, getPageX(event) + popupCardOffset, getPageY(event) + popupCardOffset)
                }
            }
        })
    }

    document.addEventListener('mouseup', mouseUpHandler)
    document.addEventListener('touchend', mouseUpHandler)

    browser.runtime.onMessage.addListener(function (request) {
        if (request.type === 'open-translator') {
            if (window !== window.top) return
            const text = request.info.selectionText ?? ''
            const sel = window.getSelection()
            const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
            const rangeRect = range ? range.getBoundingClientRect() : null
            const hasValidRangeRect = rangeRect && (rangeRect.width > 0 || rangeRect.height > 0)
            const x = lastMouseEvent ? getClientX(lastMouseEvent) : 0
            const y = lastMouseEvent ? getClientY(lastMouseEvent) : 0
            const reference = hasValidRangeRect
                ? { getBoundingClientRect: () => range.getBoundingClientRect() }
                : { getBoundingClientRect: () => new DOMRect(x, y, popupCardOffset, popupCardOffset) }
            showPopupCard(reference, text)
        }
    })

    const mouseDownHandler = async (event: UserEventType) => {
        mousedownTarget = event.target
        const settings = await utils.getSettings()
        hidePopupThumb()
        if (!settings.pinned) {
            hidePopupCard()
        }
    }
    document.addEventListener('mousedown', mouseDownHandler)
    document.addEventListener('touchstart', mouseDownHandler)

    const settings = await utils.getSettings()

    await bindHotKey(settings.hotkey)
}

export async function bindHotKey(hotkey_: string | undefined) {
    const hotkey = hotkey_?.trim().replace(/-/g, '+')

    if (!hotkey) {
        return
    }

    hotkeys(hotkey, (event) => {
        event.preventDefault()
        const sel = window.getSelection()
        let text = (sel?.toString() ?? '').trim()
        if (!text) {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                const elem = event.target
                text = elem.value.substring(elem.selectionStart ?? 0, elem.selectionEnd ?? 0)
            }
        }
        const selRange = sel?.getRangeAt(0)
        selRange && showPopupCard({ getBoundingClientRect: () => selRange.getBoundingClientRect() }, text)
    })
}

if (utils.isFirefox()) {
    // workaround for `"then" is read-only` error caused by dexie in firefox
    const nativeP = crypto.subtle.digest('SHA-512', new Uint8Array([0]))
    const originalThen = Promise.prototype.then
    Object.defineProperty(Object.getPrototypeOf(nativeP), 'then', {
        get: () => originalThen,
        set: () => {
            // do nothing
        },
    })
}

main()
