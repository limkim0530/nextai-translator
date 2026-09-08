import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Select } from '@/common/components/ui'

let host: HTMLDivElement
let shadow: ShadowRoot
let root: Root

function click(target: EventTarget) {
    act(() => {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, button: 0 }))
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true, button: 0 }))
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, button: 0 }))
    })
}

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
            <Select
                options={[
                    { id: 'en', label: 'English' },
                    { id: 'zh', label: 'Chinese' },
                ]}
                labelKey='label'
                valueKey='id'
                onChange={() => {}}
            />
        )
    })
})

afterEach(() => {
    act(() => root.unmount())
    host.remove()
})

describe('Select inside a shadow root', () => {
    it('opens when clicking the select control and keeps the menu open when clicking inside dropdown', async () => {
        const control = shadow.querySelector('[data-baseweb="select"] > div')
        expect(control).toBeTruthy()

        click(control!)
        await flushTimers()
        expect(options().length).toBe(2)

        const listbox = shadow.querySelector('[role="listbox"]')
        expect(listbox).toBeTruthy()
        click(listbox!)

        expect(options().length).toBe(2)
    })

    it('opens when clicking a non-searchable select', async () => {
        const mount = document.createElement('div')
        shadow.appendChild(mount)
        const customRoot = createRoot(mount)
        act(() => {
            customRoot.render(
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
            )
        })

        const selects = shadow.querySelectorAll('[data-baseweb="select"]')
        const nonSearchable = selects[selects.length - 1]
        click(nonSearchable.querySelector('div')!)
        await flushTimers()
        expect(shadow.querySelectorAll('[role="option"]').length).toBe(2)

        act(() => customRoot.unmount())
    })

    it('opens and renders dropdown correctly inside card', async () => {
        const mount = document.createElement('div')
        shadow.appendChild(mount)
        const customRoot = createRoot(mount)
        act(() => {
            customRoot.render(
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
            )
        })

        const card = shadow.querySelector('#popup-card-inner-container')
        expect(card).toBeTruthy()
        const select = card!.querySelector('[data-baseweb="select"]')
        expect(select).toBeTruthy()

        click(select!.querySelector('div')!)
        await flushTimers()

        const dropdownOptions = shadow.querySelectorAll('[role="option"]')
        expect(dropdownOptions.length).toBe(2)

        act(() => customRoot.unmount())
    })
})
