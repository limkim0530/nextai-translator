import { describe, expect, it } from 'vitest'
import { findPreset, getPreset, isApiKeyRequired, type ProviderConfig } from '../index'

describe('catalog and findPreset', () => {
    it('retrieves a preset by id', () => {
        const openai = getPreset('openai')
        expect(openai).toBeDefined()
        expect(openai?.protocol).toBe('openai')
        expect(openai?.docsURL).toBe('https://platform.openai.com/api-keys')
    })

    it('resolves preset by matching protocol and undefined baseURL', () => {
        const config: ProviderConfig = {
            id: 'test-1',
            name: 'My OpenAI',
            protocol: 'openai',
            model: 'gpt-5.1',
        }
        const preset = findPreset(config)
        expect(preset?.id).toBe('openai')
        expect(preset?.docsURL).toBe('https://platform.openai.com/api-keys')
    })

    it('resolves preset by catalogKey', () => {
        const config: ProviderConfig = {
            id: 'test-2',
            name: 'Custom Gemini',
            protocol: 'google',
            catalogKey: 'google',
            model: 'gemini-2.5-flash',
        }
        const preset = findPreset(config)
        expect(preset?.id).toBe('google')
        expect(preset?.docsURL).toBe('https://aistudio.google.com/apikey')
    })

    it('resolves openai-compatible preset with explicit baseURL', () => {
        const config: ProviderConfig = {
            id: 'test-3',
            name: 'LiteLLM',
            protocol: 'openai-compatible',
            baseURL: 'http://localhost:4000/v1',
            model: 'gpt-4o',
        }
        const preset = findPreset(config)
        expect(preset?.id).toBe('litellm')
        expect(preset?.docsURL).toBe('https://docs.litellm.ai')
    })

    it('identifies keyless endpoints correctly', () => {
        const ollamaConfig: ProviderConfig = {
            id: 'test-4',
            name: 'Ollama',
            protocol: 'ollama',
            baseURL: 'http://127.0.0.1:11434',
            model: 'llama3',
        }
        expect(isApiKeyRequired(ollamaConfig)).toBe(false)

        const openaiConfig: ProviderConfig = {
            id: 'test-5',
            name: 'OpenAI',
            protocol: 'openai',
            model: 'gpt-5.1',
        }
        expect(isApiKeyRequired(openaiConfig)).toBe(true)
    })

    it('exposes apiKeyPlaceholder on specific presets', () => {
        expect(getPreset('openrouter')?.apiKeyPlaceholder).toBe('sk-or-...')
        expect(getPreset('custom-openai')?.apiKeyPlaceholder).toBe('sk-...')
    })
})
