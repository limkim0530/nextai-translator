import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Select } from './Select'

// @ts-expect-error React 18 testing flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
})

describe('Select label resolution', () => {
    it('displays option label instead of raw id when value only contains id', async () => {
        act(() => {
            root.render(
                <Select
                    options={[
                        { id: 'en', label: 'English' },
                        { id: 'zh-Hans', label: '简体中文' },
                    ]}
                    value={[{ id: 'zh-Hans' }]}
                />
            )
        })

        const selectEl = container.querySelector('[data-baseweb="select"]')
        expect(selectEl).toBeTruthy()
        expect(selectEl?.textContent).toContain('简体中文')
        expect(selectEl?.textContent).not.toContain('zh-Hans')
    })

    it('resolves action mode and detection engine labels correctly', async () => {
        act(() => {
            root.render(
                <Select
                    options={[
                        { id: 'nop', label: '无' },
                        { id: 'translate', label: '翻译' },
                    ]}
                    value={[{ id: 'translate' }]}
                />
            )
        })

        const selectEl = container.querySelector('[data-baseweb="select"]')
        expect(selectEl?.textContent).toContain('翻译')
        expect(selectEl?.textContent).not.toContain('translate')
    })

    it('resolves detection engine local label correctly', async () => {
        act(() => {
            root.render(
                <Select
                    options={[
                        { id: 'baidu', label: '百度' },
                        { id: 'google', label: '谷歌' },
                        { id: 'bing', label: '必应' },
                        { id: 'local', label: '本地' },
                    ]}
                    value={[{ id: 'local' }]}
                />
            )
        })

        const selectEl = container.querySelector('[data-baseweb="select"]')
        expect(selectEl?.textContent).toContain('本地')
        expect(selectEl?.textContent).not.toContain('local')
    })

    it('resolves labels in multi-select mode', async () => {
        act(() => {
            root.render(
                <Select
                    multi
                    options={[
                        { id: 'en', label: 'English' },
                        { id: 'zh-Hans', label: '简体中文' },
                        { id: 'ja', label: '日本語' },
                    ]}
                    value={[{ id: 'en' }, { id: 'ja' }]}
                />
            )
        })

        const selectEl = container.querySelector('[data-baseweb="select"]')
        expect(selectEl?.textContent).toContain('English')
        expect(selectEl?.textContent).toContain('日本語')
        expect(selectEl?.textContent).not.toContain('zh-Hans')
    })

    it('falls back to value id when option is not found (e.g. creatable / custom value)', async () => {
        act(() => {
            root.render(<Select options={[{ id: 'gpt-4o', label: 'GPT-4o' }]} value={[{ id: 'custom-model-xyz' }]} />)
        })

        const selectEl = container.querySelector('[data-baseweb="select"]')
        expect(selectEl?.textContent).toContain('custom-model-xyz')
    })

    it('works with custom valueKey and labelKey', async () => {
        act(() => {
            root.render(
                <Select
                    valueKey='code'
                    labelKey='name'
                    options={[
                        { code: 'fr', name: 'Français' },
                        { code: 'de', name: 'Deutsch' },
                    ]}
                    value={[{ code: 'fr' }]}
                />
            )
        })

        const selectEl = container.querySelector('[data-baseweb="select"]')
        expect(selectEl?.textContent).toContain('Français')
        expect(selectEl?.textContent).not.toContain('fr')
    })

    it('matches numeric id against string id seamlessly', async () => {
        act(() => {
            root.render(
                <Select
                    options={[
                        { id: 1, label: 'Action 1' },
                        { id: 2, label: 'Action 2' },
                    ]}
                    value={[{ id: '1' }]}
                />
            )
        })

        const selectEl = container.querySelector('[data-baseweb="select"]')
        expect(selectEl?.textContent).toContain('Action 1')
    })

    it('passes resolved option to getValueLabel', async () => {
        act(() => {
            root.render(
                <Select
                    options={[{ id: 'deepseek', label: 'DeepSeek AI' }]}
                    value={[{ id: 'deepseek' }]}
                    getValueLabel={({ option }) => <span>CustomPrefix: {option.label}</span>}
                />
            )
        })

        const selectEl = container.querySelector('[data-baseweb="select"]')
        expect(selectEl?.textContent).toContain('CustomPrefix: DeepSeek AI')
    })
})
