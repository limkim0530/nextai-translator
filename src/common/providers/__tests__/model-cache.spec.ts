import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getCachedModels, putCachedModels, dropCachedModels } from '../model-cache'
import { snapshotService } from '../../services/snapshot'
import type { ProviderConfig } from '../types'

vi.mock('../../services/snapshot', () => {
    const store = new Map<string, { key: string; payload: string; updatedAt: number }>()
    return {
        snapshotService: {
            get: vi.fn(async (key: string) => store.get(key)),
            put: vi.fn(async (item: { key: string; payload: string; updatedAt: number }) => {
                store.set(item.key, item)
            }),
            delete: vi.fn(async (key: string) => {
                store.delete(key)
            }),
            _store: store,
        },
    }
})

describe('model-cache', () => {
    const config: ProviderConfig = {
        id: 'test-prov-1',
        name: 'Test Provider',
        protocol: 'openai',
        apiKey: 'key-123',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4o',
    }

    beforeEach(() => {
        vi.clearAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(snapshotService as any)._store.clear()
    })

    it('returns empty array when cache is missing', async () => {
        const cached = await getCachedModels(config)
        expect(cached).toEqual([])
        expect(snapshotService.get).toHaveBeenCalledWith('provider-models:test-prov-1')
    })

    it('stores and retrieves cached models through snapshotService', async () => {
        const models = [
            { id: 'gpt-4o', reasoning: false },
            { id: 'o3-mini', reasoning: true },
        ]
        await putCachedModels(config, models)
        expect(snapshotService.put).toHaveBeenCalledTimes(1)

        const cached = await getCachedModels(config)
        expect(cached).toEqual(models)
    })

    it('invalidates cache when fingerprint changes (e.g. apiKey changes)', async () => {
        const models = [{ id: 'gpt-4o' }]
        await putCachedModels(config, models)

        const changedConfig = { ...config, apiKey: 'key-diff' }
        const cached = await getCachedModels(changedConfig)
        expect(cached).toEqual([])
    })

    it('drops cached models correctly through snapshotService', async () => {
        const models = [{ id: 'gpt-4o' }]
        await putCachedModels(config, models)
        expect(await getCachedModels(config)).toEqual(models)

        await dropCachedModels(config.id)
        expect(snapshotService.delete).toHaveBeenCalledWith('provider-models:test-prov-1')
        expect(await getCachedModels(config)).toEqual([])
    })
})
