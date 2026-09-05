import { describe, expect, it } from 'vitest'
import {
    baseURLCandidates,
    defaultPathFor,
    isBaseURLRequired,
    normalizeBaseURL,
    PROTOCOL_PLACEHOLDER_API_KEY,
    PROTOCOL_PLACEHOLDER_BASE_URL,
} from '../endpoints'

describe('normalizeBaseURL', () => {
    it('fills in a missing scheme, https for a public host', () => {
        expect(normalizeBaseURL('api.example.com/v1')).toBe('https://api.example.com/v1')
    })

    it('assumes http for a loopback address, where https is never what is meant', () => {
        expect(normalizeBaseURL('127.0.0.1:1234/v1')).toBe('http://127.0.0.1:1234/v1')
        expect(normalizeBaseURL('localhost:11434')).toBe('http://localhost:11434')
    })

    it('drops trailing slashes', () => {
        expect(normalizeBaseURL('https://api.example.com/v1///')).toBe('https://api.example.com/v1')
    })

    it('strips an operation path pasted out of a curl example', () => {
        expect(normalizeBaseURL('https://api.example.com/v1/chat/completions')).toBe('https://api.example.com/v1')
        expect(normalizeBaseURL('https://api.example.com/v1/messages')).toBe('https://api.example.com/v1')
        expect(normalizeBaseURL('https://api.example.com/v1/models')).toBe('https://api.example.com/v1')
    })

    it('leaves a path that only looks like an operation alone', () => {
        expect(normalizeBaseURL('https://api.example.com/completions/v1')).toBe(
            'https://api.example.com/completions/v1'
        )
    })

    it('reduces an Ollama base to the origin its client expects', () => {
        // The client appends `/api/chat` itself; an older preset stored `/api`,
        // which resolved to `/api/api/chat`.
        expect(normalizeBaseURL('http://127.0.0.1:11434/api', 'ollama')).toBe('http://127.0.0.1:11434')
        expect(normalizeBaseURL('http://127.0.0.1:11434/api', 'openai-compatible')).toBe('http://127.0.0.1:11434/api')
    })

    it('rejects what cannot be a URL at all', () => {
        expect(normalizeBaseURL('   ')).toBeUndefined()
        expect(normalizeBaseURL(undefined)).toBeUndefined()
    })
})

describe('defaultPathFor', () => {
    it('reads the prefix off the protocol’s own default endpoint', () => {
        expect(defaultPathFor('openai')).toBe('/v1')
        expect(defaultPathFor('google')).toBe('/v1beta')
        expect(defaultPathFor('groq')).toBe('/openai/v1')
        expect(defaultPathFor('cohere')).toBe('/v2')
    })

    it('has none for protocols served at their root', () => {
        // DeepSeek answers `/chat/completions` directly, so nothing should be
        // appended to a host the user typed.
        expect(defaultPathFor('deepseek')).toBeUndefined()
        expect(defaultPathFor('perplexity')).toBeUndefined()
        expect(defaultPathFor('ollama')).toBeUndefined()
    })

    it('falls back to the OpenAI convention where the host is unknown', () => {
        expect(defaultPathFor('openai-compatible')).toBe('/v1')
        expect(defaultPathFor('open-responses')).toBe('/v1')
    })
})

describe('baseURLCandidates', () => {
    it('offers the version-prefixed variant when the user typed a bare host', () => {
        expect(baseURLCandidates({ protocol: 'openai-compatible', baseURL: 'https://gw.example.com' })).toEqual([
            'https://gw.example.com',
            'https://gw.example.com/v1',
        ])
    })

    it('uses the protocol’s own prefix, not a generic /v1', () => {
        expect(baseURLCandidates({ protocol: 'google', baseURL: 'https://gw.example.com' })).toEqual([
            'https://gw.example.com',
            'https://gw.example.com/v1beta',
        ])
    })

    it('offers the stripped variant when the user added a prefix that may not belong', () => {
        expect(baseURLCandidates({ protocol: 'openai-compatible', baseURL: 'https://gw.example.com/v1' })).toEqual([
            'https://gw.example.com/v1',
            'https://gw.example.com',
        ])
    })

    it('never strips down to something without a host', () => {
        expect(baseURLCandidates({ protocol: 'openai-compatible', baseURL: 'https://gw.example.com/api/v1' })).toEqual([
            'https://gw.example.com/api/v1',
            'https://gw.example.com/api',
        ])
    })

    it('falls back to the protocol default without guessing when no base URL is set', () => {
        expect(baseURLCandidates({ protocol: 'openai' })).toEqual(['https://api.openai.com/v1'])
    })

    it('offers a single candidate for a protocol with no prefix to add or remove', () => {
        expect(baseURLCandidates({ protocol: 'deepseek', baseURL: 'https://api.deepseek.com' })).toEqual([
            'https://api.deepseek.com',
        ])
    })

    it('has nothing to offer for protocols whose endpoint is assembled elsewhere', () => {
        expect(baseURLCandidates({ protocol: 'azure' })).toEqual([])
        expect(baseURLCandidates({ protocol: 'bedrock' })).toEqual([])
    })
})

describe('isBaseURLRequired', () => {
    it('returns true for protocols without a fixed official host', () => {
        expect(isBaseURLRequired('openai-compatible')).toBe(true)
        expect(isBaseURLRequired('open-responses')).toBe(true)
        expect(isBaseURLRequired('azure')).toBe(true)
    })

    it('returns false for protocols with default endpoints', () => {
        expect(isBaseURLRequired('google')).toBe(false)
        expect(isBaseURLRequired('openai')).toBe(false)
        expect(isBaseURLRequired('anthropic')).toBe(false)
        expect(isBaseURLRequired('deepseek')).toBe(false)
        expect(isBaseURLRequired('ollama')).toBe(false)
    })
})

describe('PROTOCOL_PLACEHOLDER_BASE_URL', () => {
    it('defines expected placeholders for protocols requiring custom hosts', () => {
        expect(PROTOCOL_PLACEHOLDER_BASE_URL.azure).toBe('https://<your-resource>.openai.azure.com')
        expect(PROTOCOL_PLACEHOLDER_BASE_URL['openai-compatible']).toBe('https://api.example.com/v1')
        expect(PROTOCOL_PLACEHOLDER_BASE_URL['open-responses']).toBe('https://api.example.com/v1')
    })
})

describe('PROTOCOL_PLACEHOLDER_API_KEY', () => {
    it('defines expected API key prefix placeholders for protocols', () => {
        expect(PROTOCOL_PLACEHOLDER_API_KEY.openai).toBe('sk-...')
        expect(PROTOCOL_PLACEHOLDER_API_KEY['openai-compatible']).toBe('sk-...')
        expect(PROTOCOL_PLACEHOLDER_API_KEY.anthropic).toBe('sk-ant-...')
        expect(PROTOCOL_PLACEHOLDER_API_KEY.google).toBe('AIza...')
        expect(PROTOCOL_PLACEHOLDER_API_KEY.deepseek).toBe('sk-...')
        expect(PROTOCOL_PLACEHOLDER_API_KEY.groq).toBe('gsk_...')
    })
})
