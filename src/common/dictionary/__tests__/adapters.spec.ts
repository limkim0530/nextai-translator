import { describe, expect, it, vi } from 'vitest'
import * as universalFetch from '../../universal-fetch'
import { parseFreeDictionaryResponse } from '../adapters/freeDictionary'
import { parseDatamuseResponse } from '../adapters/datamuse'
import { parseGoogleGtxResponse } from '../adapters/google'
import { microsoftAdapter, parseMicrosoftResponse } from '../adapters/microsoft'
import { parseYoudaoResponse } from '../adapters/youdao'
import { parseLlmDictionaryResponse } from '../adapters/llm'

describe('Dictionary Adapters', () => {
    describe('Free Dictionary Adapter', () => {
        it('parses valid free dictionary response', () => {
            const raw = [
                {
                    word: 'apple',
                    phonetic: '/ˈæp.əl/',
                    meanings: [
                        {
                            partOfSpeech: 'noun',
                            definitions: [
                                {
                                    definition: 'A common, round fruit produced by the tree Malus domestica.',
                                    example: 'A bowl of apples.',
                                },
                            ],
                        },
                    ],
                    sourceUrls: ['https://en.wiktionary.org/wiki/apple'],
                },
            ]

            const result = parseFreeDictionaryResponse(raw, 'apple')
            expect(result).not.toBeNull()
            expect(result?.word).toBe('apple')
            expect(result?.phonetic).toBe('/ˈæp.əl/')
            expect(result?.meanings).toHaveLength(1)
            expect(result?.meanings[0].partOfSpeech).toBe('noun')
            expect(result?.meanings[0].definition).toContain('fruit')
            expect(result?.sourceName).toBe('Free Dictionary')
        })

        it('returns null on invalid or empty response', () => {
            expect(parseFreeDictionaryResponse([], 'apple')).toBeNull()
            expect(parseFreeDictionaryResponse(null, 'apple')).toBeNull()
        })
    })

    describe('Datamuse Adapter', () => {
        it('parses valid datamuse response with IPA and definitions', () => {
            const raw = [
                {
                    word: 'apple',
                    score: 1000,
                    defs: ['n\tThe round fruit of a tree of the rose family.', 'v\tTo gather or seek apples.'],
                    tags: ['ipa_pron:ˈæp.əl', 'f:12.34'],
                },
            ]

            const result = parseDatamuseResponse(raw, 'apple')
            expect(result).not.toBeNull()
            expect(result?.word).toBe('apple')
            expect(result?.phonetic).toBe('/ˈæp.əl/')
            expect(result?.meanings).toHaveLength(2)
            expect(result?.meanings[0].partOfSpeech).toBe('n.')
            expect(result?.meanings[0].definition).toBe('The round fruit of a tree of the rose family.')
            expect(result?.meanings[1].partOfSpeech).toBe('v.')
            expect(result?.sourceName).toBe('Datamuse')
        })

        it('returns null on empty datamuse response', () => {
            expect(parseDatamuseResponse([], 'apple')).toBeNull()
        })
    })

    describe('Google GTX Adapter', () => {
        it('parses valid google gtx response with dictionary array', () => {
            const raw = [
                [
                    ['苹果', 'apple', null, null, 1],
                    [null, null, 'píngguǒ', 'ˈapəl'],
                ],
                [
                    ['noun', ['苹果', '苹果树', '苹果公司']],
                    ['verb', ['采苹果']],
                ],
            ]

            const result = parseGoogleGtxResponse(raw, 'apple', 'zh-Hans')
            expect(result).not.toBeNull()
            expect(result?.word).toBe('apple')
            expect(result?.phonetic).toBe('/ˈapəl/')
            expect(result?.meanings).toHaveLength(2)
            expect(result?.meanings[0].partOfSpeech).toBe('n.')
            expect(result?.meanings[0].definition).toBe('苹果；苹果树；苹果公司')
            expect(result?.sourceName).toBe('Google')
        })

        it('falls back to single translation when dictionary is absent', () => {
            const raw = [[['你好', 'hello', null, null, 1]]]
            const result = parseGoogleGtxResponse(raw, 'hello', 'zh-Hans')
            expect(result).not.toBeNull()
            expect(result?.meanings[0].definition).toBe('你好')
        })
    })

    describe('Microsoft Azure Adapter', () => {
        it('parses valid microsoft response with grouped translations', () => {
            const raw = [
                {
                    normalizedSource: 'apple',
                    displaySource: 'apple',
                    translations: [
                        {
                            normalizedTarget: '苹果',
                            displayTarget: '苹果',
                            posTag: 'NOUN',
                            confidence: 0.85,
                        },
                        {
                            normalizedTarget: '苹果树',
                            displayTarget: '苹果树',
                            posTag: 'NOUN',
                            confidence: 0.1,
                        },
                    ],
                },
            ]

            const result = parseMicrosoftResponse(raw, 'apple')
            expect(result).not.toBeNull()
            expect(result?.word).toBe('apple')
            expect(result?.meanings).toHaveLength(1)
            expect(result?.meanings[0].partOfSpeech).toBe('n.')
            expect(result?.meanings[0].definition).toBe('苹果；苹果树')
            expect(result?.sourceName).toBe('Azure Translator')
        })

        it('throws error when apiKey is missing in lookup', async () => {
            await expect(
                microsoftAdapter.lookup('apple', {
                    id: 'ms-test',
                    name: 'Azure',
                    protocol: 'microsoft',
                })
            ).rejects.toThrow('Azure Translator requires an API Key')
        })

        it('sends correct API key and Region headers on lookup', async () => {
            let capturedUrl = ''
            let capturedHeaders: Record<string, string> = {}

            const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
                capturedUrl = url
                capturedHeaders = (init?.headers as Record<string, string>) || {}
                return {
                    ok: true,
                    status: 200,
                    json: async () => [
                        {
                            normalizedSource: 'apple',
                            displaySource: 'apple',
                            translations: [
                                {
                                    displayTarget: '苹果',
                                    posTag: 'NOUN',
                                },
                            ],
                        },
                    ],
                }
            })

            vi.spyOn(universalFetch, 'getUniversalFetch').mockReturnValue(mockFetch as unknown as typeof fetch)

            const result = await microsoftAdapter.lookup('apple', {
                id: 'ms-test',
                name: 'Azure',
                protocol: 'microsoft',
                apiKey: 'test-key-123',
                region: 'eastus',
            })

            expect(capturedUrl).toContain('api.cognitive.microsofttranslator.com/dictionary/lookup')
            expect(capturedHeaders['Ocp-Apim-Subscription-Key']).toBe('test-key-123')
            expect(capturedHeaders['Ocp-Apim-Subscription-Region']).toBe('eastus')
            expect(result?.meanings[0].definition).toBe('苹果')
        })

        it('falls back to /translate when dictionary/lookup has no match', async () => {
            const urlsCalled: string[] = []

            const mockFetch = vi.fn().mockImplementation(async (url: string) => {
                urlsCalled.push(url)
                if (url.includes('/dictionary/lookup')) {
                    // Empty dictionary lookup result
                    return {
                        ok: true,
                        status: 200,
                        json: async () => [],
                    }
                }
                // Translate endpoint fallback
                return {
                    ok: true,
                    status: 200,
                    json: async () => [
                        {
                            translations: [{ text: '机器学习' }],
                        },
                    ],
                }
            })

            vi.spyOn(universalFetch, 'getUniversalFetch').mockReturnValue(mockFetch as unknown as typeof fetch)

            const result = await microsoftAdapter.lookup('machine learning', {
                id: 'ms-test',
                name: 'Azure',
                protocol: 'microsoft',
                apiKey: 'test-key-123',
            })

            expect(urlsCalled.some((u) => u.includes('/dictionary/lookup'))).toBe(true)
            expect(urlsCalled.some((u) => u.includes('/translate'))).toBe(true)
            expect(result).not.toBeNull()
            expect(result?.meanings[0].definition).toBe('机器学习')
            expect(result?.sourceName).toBe('Azure Translator')
        })
    })

    describe('Youdao Adapter', () => {
        it('parses valid youdao response', () => {
            const raw = {
                errorCode: '0',
                query: 'apple',
                basic: {
                    'phonetic': 'ˈæpl',
                    'us-phonetic': 'ˈæpl',
                    'explains': ['n. 苹果，苹果树', 'n. 苹果公司'],
                },
            }

            const result = parseYoudaoResponse(raw, 'apple')
            expect(result).not.toBeNull()
            expect(result?.word).toBe('apple')
            expect(result?.phonetic).toBe('/ˈæpl/')
            expect(result?.meanings).toHaveLength(2)
            expect(result?.meanings[0].partOfSpeech).toBe('n.')
            expect(result?.meanings[0].definition).toBe('苹果，苹果树')
            expect(result?.sourceName).toBe('有道词典')
        })
    })

    describe('LLM Adapter Parser', () => {
        it('parses markdown-fenced json response from LLM', () => {
            const text = `\`\`\`json
{
  "word": "apple",
  "phonetic": "/ˈæp.əl/",
  "meanings": [
    {
      "partOfSpeech": "n.",
      "definition": "苹果 (一种常见水果)",
      "example": "She ate an apple."
    }
  ]
}
\`\`\``

            const result = parseLlmDictionaryResponse(text, 'apple')
            expect(result).not.toBeNull()
            expect(result?.word).toBe('apple')
            expect(result?.phonetic).toBe('/ˈæp.əl/')
            expect(result?.meanings[0].definition).toBe('苹果 (一种常见水果)')
            expect(result?.meanings[0].example).toBe('She ate an apple.')
            expect(result?.sourceName).toBe('AI Model')
        })
    })
})
