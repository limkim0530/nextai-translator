/**
 * baseui's Select closes its menu from a `document`-level click listener, and
 * inside the popup card's shadow root every such event has already been
 * retargeted to the shadow host: `containsNode(dropdown, event.target)` and
 * `containsNode(anchor, event.target)` both report false, so the first click
 * anywhere in the open menu is treated as a click outside and dismisses it.
 *
 * `patches/baseui@18.2.0.patch` reads `composedPath()[0]` instead, which still
 * carries the real inner target. That patch is the only thing the old
 * `baseui-sd` fork added over upstream, so this test is what stops a plain
 * `pnpm update` from silently taking it away again.
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BaseProvider, LightTheme } from 'baseui'
import { Select } from 'baseui/select'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'

let host: HTMLDivElement
let shadow: ShadowRoot
let root: Root

function click(target: EventTarget) {
    // `composed` is what lets the event cross the shadow boundary at all — the
    // same flag real user clicks carry.
    act(() => {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, button: 0 }))
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true, button: 0 }))
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, button: 0 }))
    })
}

// The document-level listener is attached from a `setTimeout(..., 0)` after the
// control takes focus, so the outside-click path does not exist until the
// macrotask queue drains.
async function flushTimers() {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
    })
}

function options() {
    return shadow.querySelectorAll('[role="option"]')
}

beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    shadow = host.attachShadow({ mode: 'open' })
    const mount = document.createElement('div')
    shadow.appendChild(mount)
    root = createRoot(mount)
    act(() => {
        root.render(
            <StyletronProvider value={new Styletron()}>
                <BaseProvider theme={LightTheme} overrides={{ AppContainer: { style: { display: 'contents' } } }}>
                    <Select
                        options={[
                            { id: 'en', label: 'English' },
                            { id: 'zh', label: 'Chinese' },
                        ]}
                        labelKey='label'
                        valueKey='id'
                        onChange={() => {}}
                    />
                </BaseProvider>
            </StyletronProvider>
        )
    })
})

afterEach(() => {
    act(() => root.unmount())
    host.remove()
})

describe('baseui Select inside a shadow root', () => {
    it('keeps the menu open when the click lands inside the dropdown', async () => {
        const input = shadow.querySelector('input')
        expect(input).toBeTruthy()

        click(input!)
        await flushTimers()
        expect(options().length).toBe(2)

        // Not an option — a click on the list itself, which the unpatched
        // build mistakes for a click outside because the target it sees is the
        // shadow host.
        const listbox = shadow.querySelector('[role="listbox"]')
        expect(listbox).toBeTruthy()
        click(listbox!)

        expect(options().length).toBe(2)
    })

    it('opens when clicking the select control (not the input)', async () => {
        const control = shadow.querySelector('[data-baseweb="select"] > div')
        expect(control).toBeTruthy()

        click(control!)
        await flushTimers()
        expect(options().length).toBe(2)
    })

    it('opens when clicking a non-searchable select', async () => {
        const mount = document.createElement('div')
        shadow.appendChild(mount)
        const customRoot = createRoot(mount)
        act(() => {
            customRoot.render(
                <StyletronProvider value={new Styletron()}>
                    <BaseProvider theme={LightTheme}>
                        <Select
                            searchable={false}
                            options={[
                                { id: 'en', label: 'English' },
                                { id: 'zh', label: 'Chinese' },
                            ]}
                            labelKey='label'
                            valueKey='id'
                            onChange={() => {}}
                        />
                    </BaseProvider>
                </StyletronProvider>
            )
        })

        const selects = shadow.querySelectorAll('[data-baseweb="select"]')
        const nonSearchable = selects[selects.length - 1]
        click(nonSearchable.querySelector('div')!)
        await flushTimers()
        expect(shadow.querySelectorAll('[role="option"]').length).toBe(2)

        act(() => customRoot.unmount())
    })

    it('opens and renders dropdown correctly when BaseProvider wraps the card', async () => {
        const mount = document.createElement('div')
        shadow.appendChild(mount)
        const customRoot = createRoot(mount)
        act(() => {
            customRoot.render(
                <StyletronProvider value={new Styletron()}>
                    <BaseProvider theme={LightTheme}>
                        <div
                            id='popup-card-inner-container'
                            style={{
                                position: 'fixed',
                                top: '100px',
                                left: '200px',
                                width: '400px',
                                height: '400px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{ height: '35px' }}>TitleBar</div>
                            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
                                <Select
                                    searchable={false}
                                    options={[
                                        { id: 'gpt-4o', label: 'GPT-4o' },
                                        { id: 'claude-3', label: 'Claude 3' },
                                    ]}
                                    labelKey='label'
                                    valueKey='id'
                                    onChange={() => {}}
                                />
                            </div>
                        </div>
                    </BaseProvider>
                </StyletronProvider>
            )
        })

        const card = shadow.querySelector('#popup-card-inner-container')
        expect(card).toBeTruthy()
        const select = card!.querySelector('[data-baseweb="select"]')
        expect(select).toBeTruthy()

        click(select!.querySelector('div')!)
        await flushTimers()

        // The dropdown menu options are rendered!
        const dropdownOptions = shadow.querySelectorAll('[role="option"]')
        expect(dropdownOptions.length).toBe(2)

        // AND verify where the dropdown is rendered in the DOM:
        // It is rendered in LayersContainer, which is OUTSIDE the card!
        const popper = shadow.querySelector('[data-baseweb="popover"]')
        expect(popper).toBeTruthy()
        expect(card!.contains(popper)).toBe(false) // Not clipped by card's overflow: hidden!

        act(() => customRoot.unmount())
    })
})
