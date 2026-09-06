import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { snapshotService } from '../snapshot'
import { snapshotInternalService } from '../../internal-services/snapshot'
import { backgroundSnapshotService } from '../../background/services/snapshot'

describe('snapshotService dispatcher', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).chrome
    })

    it('delegates to snapshotInternalService when chrome.runtime.sendMessage is absent', async () => {
        const spy = vi.spyOn(snapshotInternalService, 'get').mockResolvedValue(undefined)
        await snapshotService.get('test-key')
        expect(spy).toHaveBeenCalledWith('test-key')
    })

    it('delegates to backgroundSnapshotService when chrome.runtime.sendMessage is present', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).chrome = {
            runtime: {
                sendMessage: vi.fn(),
            },
        }
        const spy = vi.spyOn(backgroundSnapshotService, 'get').mockResolvedValue(undefined)
        await snapshotService.get('test-key')
        expect(spy).toHaveBeenCalledWith('test-key')
    })

    it('delegates put to backgroundSnapshotService when in extension environment', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).chrome = {
            runtime: {
                sendMessage: vi.fn(),
            },
        }
        const item = { key: 'test-key', payload: '{}', updatedAt: 123 }
        const spy = vi.spyOn(backgroundSnapshotService, 'put').mockResolvedValue()
        await snapshotService.put(item)
        expect(spy).toHaveBeenCalledWith(item)
    })

    it('delegates delete to backgroundSnapshotService when in extension environment', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).chrome = {
            runtime: {
                sendMessage: vi.fn(),
            },
        }
        const spy = vi.spyOn(backgroundSnapshotService, 'delete').mockResolvedValue()
        await snapshotService.delete('test-key')
        expect(spy).toHaveBeenCalledWith('test-key')
    })
})
