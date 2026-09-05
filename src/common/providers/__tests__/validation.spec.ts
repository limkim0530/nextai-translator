import { describe, expect, it } from 'vitest'
import { validateProvider, validateProviders, type ProviderConfig } from '../index'

describe('validateProvider', () => {
    it('returns no errors for a valid OpenAI provider', () => {
        const config: ProviderConfig = {
            id: 'test-1',
            name: 'OpenAI',
            protocol: 'openai',
            apiKey: 'sk-123',
            model: 'gpt-5.1',
        }
        expect(validateProvider(config)).toEqual([])
    })

    it('flags missing name, model, and required apiKey', () => {
        const config: ProviderConfig = {
            id: 'test-2',
            name: '  ',
            protocol: 'openai',
            model: '',
        }
        const errors = validateProvider(config)
        expect(errors.map((e) => e.field)).toEqual(['name', 'apiKey', 'model'])
    })

    it('requires baseURL for openai-compatible but not apiKey for keyless', () => {
        const ollamaConfig: ProviderConfig = {
            id: 'test-3',
            name: 'Ollama',
            protocol: 'ollama',
            baseURL: 'http://127.0.0.1:11434',
            model: 'llama3',
        }
        expect(validateProvider(ollamaConfig)).toEqual([])

        const customConfig: ProviderConfig = {
            id: 'test-4',
            name: 'Custom',
            protocol: 'openai-compatible',
            apiKey: 'sk-123',
            model: 'gpt-4o',
        }
        const customErrors = validateProvider(customConfig)
        expect(customErrors.map((e) => e.field)).toEqual(['baseURL'])
    })
})

describe('validateProviders', () => {
    it('aggregates errors across providers with provider info', () => {
        const providers: ProviderConfig[] = [
            {
                id: 'p-1',
                name: 'Valid',
                protocol: 'openai',
                apiKey: 'sk-1',
                model: 'gpt-5.1',
            },
            {
                id: 'p-2',
                name: 'Invalid Custom',
                protocol: 'openai-compatible',
                model: '',
            },
        ]
        const errors = validateProviders(providers)
        expect(errors.length).toBe(3) // baseURL, apiKey, model
        expect(errors.every((e) => e.providerId === 'p-2')).toBe(true)
        expect(errors.every((e) => e.providerName === 'Invalid Custom')).toBe(true)
    })
})
