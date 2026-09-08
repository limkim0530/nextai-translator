/**
 * The popup card mounts inside a shadow root, which is exactly where a
 * react-draggable `bounds` *selector* stops working: since 4.5 the selector is
 * resolved against `node.getRootNode()`, and a shadow tree contains no `<html>`
 * for `bounds='html'` to find. The lookup throws out of every mousemove, so the
 * card silently refuses to move.
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InnerContainer from './InnerContainer'
import { popupCardInnerContainerId } from './consts'

// The card only measures itself from a ResizeObserver callback, which jsdom
// does not implement; never firing it keeps floating-ui out of this test.
class NoopResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

let host: HTMLDivElement
let shadow: ShadowRoot
let root: Root

function card(): HTMLElement {
    const el = shadow.getElementById(popupCardInnerContainerId)
    if (!el) {
        throw new Error('popup card did not render')
    }
    return el
}

function mouse(type: string, clientX: number, clientY: number): MouseEvent {
    return new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY })
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', NoopResizeObserver)
    host = document.createElement('div')
    document.body.appendChild(host)
    shadow = host.attachShadow({ mode: 'open' })
    const mount = document.createElement('div')
    shadow.appendChild(mount)
    root = createRoot(mount)
    act(() => {
        root.render(
            <InnerContainer reference={document.body}>
                <div data-tauri-drag-region>title bar</div>
            </InnerContainer>
        )
    })
})

afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
})

describe('popup card dragging', () => {
    it('moves when the title bar is dragged inside a shadow root', () => {
        const handle = shadow.querySelector('[data-tauri-drag-region]')
        expect(handle).toBeTruthy()

        act(() => {
            handle!.dispatchEvent(mouse('mousedown', 100, 100))
        })
        act(() => {
            document.dispatchEvent(mouse('mousemove', 160, 145))
        })
        act(() => {
            document.dispatchEvent(mouse('mouseup', 160, 145))
        })

        expect(card().style.transform).toBe('translate(60px,45px)')
    })

    it('does not move when the drag starts outside the title bar', () => {
        act(() => {
            card().dispatchEvent(mouse('mousedown', 100, 100))
        })
        act(() => {
            document.dispatchEvent(mouse('mousemove', 160, 145))
        })

        expect(card().style.transform).toBe('translate(0px,0px)')
    })

    it('sets width to max-content when showSettings is false and expands to popupCardMaxWidth in settings', async () => {
        const { useAppStore } = await import('../../common/store')
        const { popupCardMaxWidth } = await import('./consts')

        useAppStore.setState({ showSettings: false })
        expect(card().style.width).toBe('max-content')

        act(() => {
            useAppStore.setState({ showSettings: true })
            root.render(
                <InnerContainer reference={document.body}>
                    <div data-tauri-drag-region>title bar</div>
                </InnerContainer>
            )
        })

        expect(card().style.width).toBe(`${popupCardMaxWidth}px`)
    })

    it('shifts upward if dragged card overflows viewport bottom on resize', () => {
        let resizeCb: (() => void) | null = null
        class CaptureResizeObserver {
            constructor(cb: () => void) {
                resizeCb = cb
            }
            observe() {}
            unobserve() {}
            disconnect() {}
        }
        vi.stubGlobal('ResizeObserver', CaptureResizeObserver)

        act(() => {
            root.render(
                <InnerContainer reference={document.createElement('div')}>
                    <div data-tauri-drag-region>title bar</div>
                </InnerContainer>
            )
        })

        const handle = shadow.querySelector('[data-tauri-drag-region]')
        act(() => {
            handle!.dispatchEvent(mouse('mousedown', 100, 100))
        })
        act(() => {
            document.dispatchEvent(mouse('mousemove', 160, 200))
        })
        act(() => {
            document.dispatchEvent(mouse('mouseup', 160, 200))
        })

        expect(card().style.transform).toBe('translate(60px,100px)')

        const el = card()
        vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
            bottom: window.innerHeight + 40,
            top: 100,
            left: 60,
            right: 260,
            width: 200,
            height: window.innerHeight - 60,
            x: 60,
            y: 100,
            toJSON: () => {},
        })

        act(() => {
            resizeCb?.()
        })

        expect(card().style.transform).toBe('translate(60px,50px)')
    })
})
