import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDictionaryCache, lookupWord } from '../index'
import * as adapters from '../adapters'
import type { DictionaryAdapter, WordLookupPreview } from '../types'
import type { ISettings } from '../../types'

describe('lookupWord', () => {
    beforeEach(() => {
        clearDictionaryCache()
        vi.restoreAllMocks()
    })

    it('returns null when dictionary is disabled in settings', async () => {
        const settings = {
            dictionary: {
                enabled: false,
                providers: [],
            },
        } as unknown as ISettings

        const result = await lookupWord('apple', settings)
        expect(result).toBeNull()
    })

    it('returns null for empty or whitespace word', async () => {
        const result = await lookupWord('   ')
        expect(result).toBeNull()
    })

    it('queries provider and caches result', async () => {
        const mockPreview: WordLookupPreview = {
            word: 'apple',
            meanings: [{ definition: 'A fruit' }],
            sourceName: 'Mock Dict',
        }

        const mockAdapter: DictionaryAdapter = {
            lookup: vi.fn().mockResolvedValue(mockPreview),
        }

        vi.spyOn(adapters, 'getDictionaryAdapter').mockReturnValue(mockAdapter)

        const result1 = await lookupWord('apple')
        expect(result1).toEqual(mockPreview)
        expect(mockAdapter.lookup).toHaveBeenCalledTimes(1)

        // Second call should hit cache and not invoke adapter again
        const result2 = await lookupWord('apple')
        expect(result2).toEqual(mockPreview)
        expect(mockAdapter.lookup).toHaveBeenCalledTimes(1)
    })

    it('propagates error without Datamuse fallback when provider lookup fails', async () => {
        const mockAdapter: DictionaryAdapter = {
            lookup: vi.fn().mockRejectedValue(new Error('Network connection failed')),
        }

        const getAdapterSpy = vi.spyOn(adapters, 'getDictionaryAdapter').mockReturnValue(mockAdapter)

        const settings = {
            dictionary: {
                enabled: true,
                providers: [
                    {
                        id: 'custom-google',
                        name: 'Google',
                        protocol: 'google',
                    },
                ],
            },
        } as unknown as ISettings

        await expect(lookupWord('apple', settings)).rejects.toThrow('Network connection failed')
        // Verify it was only called once and did not attempt Datamuse fallback
        expect(mockAdapter.lookup).toHaveBeenCalledTimes(1)
        expect(getAdapterSpy).toHaveBeenCalledTimes(1)
        expect(getAdapterSpy).toHaveBeenCalledWith('google')
    })
})
