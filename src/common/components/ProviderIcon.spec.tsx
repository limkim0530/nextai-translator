import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { ProviderIcon, getProviderIconComponent } from './ProviderIcon'
import { OpenRouterIcon } from './icons/OpenRouterIcon'
import { DeepSeekIcon } from './icons/DeepSeekIcon'
import { RiOpenaiFill } from 'react-icons/ri'

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

describe('ProviderIcon', () => {
    it('resolves OpenRouter when protocol is openai', () => {
        const iconComp = getProviderIconComponent({
            name: 'OpenRouter',
            protocol: 'openai',
            baseURL: 'https://openrouter.ai/api/v1',
        })
        expect(iconComp).toBe(OpenRouterIcon)
    })

    it('resolves DeepSeek when protocol is openai', () => {
        const iconComp = getProviderIconComponent({
            name: 'DeepSeek',
            protocol: 'openai',
            baseURL: 'https://api.deepseek.com',
        })
        expect(iconComp).toBe(DeepSeekIcon)
    })

    it('resolves OpenAI for pure OpenAI provider', () => {
        const iconComp = getProviderIconComponent({
            name: 'OpenAI',
            protocol: 'openai',
            baseURL: 'https://api.openai.com/v1',
        })
        expect(iconComp).toBe(RiOpenaiFill)
    })

    it('resolves Gemini to SiGooglegemini', () => {
        const iconComp = getProviderIconComponent({
            name: 'Google Gemini',
            protocol: 'google',
            catalogKey: 'google',
        })
        expect(iconComp).toBeTruthy()
    })

    it('resolves Cerebras to CerebrasIcon', () => {
        const iconComp = getProviderIconComponent({
            name: 'Cerebras',
            protocol: 'cerebras',
            catalogKey: 'cerebras',
        })
        expect(iconComp).toBeTruthy()
    })

    it('resolves Mistral and Perplexity', () => {
        expect(getProviderIconComponent({ name: 'Mistral', protocol: 'mistral' })).toBeTruthy()
        expect(getProviderIconComponent({ name: 'Perplexity', protocol: 'perplexity' })).toBeTruthy()
    })

    it('renders with inline-flex and lineHeight 1 wrapper', () => {
        act(() => {
            root.render(
                <ProviderIcon
                    provider={{
                        name: 'OpenAI',
                        protocol: 'openai',
                        baseURL: 'https://api.openai.com/v1',
                    }}
                    size={16}
                />
            )
        })
        const wrapper = container.querySelector('span')
        expect(wrapper).toBeTruthy()
        expect(wrapper?.style.display).toBe('inline-flex')
        expect(wrapper?.style.verticalAlign).toBe('middle')
        expect(wrapper?.style.lineHeight).toBe('1')
    })
})
