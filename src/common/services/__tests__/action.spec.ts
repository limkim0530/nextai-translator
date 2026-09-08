import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { actionService } from '../action'
import { actionInternalService } from '../../internal-services/action'
import { backgroundActionService } from '../../background/services/action'

describe('actionService dispatcher', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).chrome
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).__TAURI__
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).__TAURI_INTERNALS__
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).GM_info
    })

    it('delegates list to actionInternalService when chrome.runtime.sendMessage is absent', async () => {
        const spy = vi.spyOn(actionInternalService, 'list').mockResolvedValue([])
        const result = await actionService.list()
        expect(spy).toHaveBeenCalled()
        expect(result).toEqual([])
    })

    it('delegates list to backgroundActionService when chrome.runtime.sendMessage is present', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).chrome = {
            runtime: {
                sendMessage: vi.fn(),
            },
        }
        const mockActions = [{ id: 1, name: 'Translate', idx: 0, createdAt: '0', updatedAt: '0' }]
        const spy = vi.spyOn(backgroundActionService, 'list').mockResolvedValue(mockActions)
        const result = await actionService.list()
        expect(spy).toHaveBeenCalled()
        expect(result).toEqual(mockActions)
    })

    it('delegates to actionInternalService when in desktop environment even if chrome is present', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).chrome = {
            runtime: {
                sendMessage: vi.fn(),
            },
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).__TAURI_INTERNALS__ = {}

        const spy = vi.spyOn(actionInternalService, 'list').mockResolvedValue([])
        await actionService.list()
        expect(spy).toHaveBeenCalled()
    })

    it('delegates get and getByMode to appropriate service', async () => {
        const getSpy = vi.spyOn(actionInternalService, 'get').mockResolvedValue(undefined)
        const getByModeSpy = vi.spyOn(actionInternalService, 'getByMode').mockResolvedValue(undefined)

        await actionService.get(1)
        expect(getSpy).toHaveBeenCalledWith(1)

        await actionService.getByMode('translate')
        expect(getByModeSpy).toHaveBeenCalledWith('translate')
    })

    it('delegates create, update, delete, count to appropriate service', async () => {
        const createSpy = vi.spyOn(actionInternalService, 'create').mockResolvedValue({
            id: 2,
            name: 'Polish',
            idx: 1,
            createdAt: '0',
            updatedAt: '0',
        })
        const updateSpy = vi.spyOn(actionInternalService, 'update').mockResolvedValue({
            id: 2,
            name: 'Polish Updated',
            idx: 1,
            createdAt: '0',
            updatedAt: '1',
        })
        const deleteSpy = vi.spyOn(actionInternalService, 'delete').mockResolvedValue()
        const countSpy = vi.spyOn(actionInternalService, 'count').mockResolvedValue(5)

        await actionService.create({ name: 'Polish' })
        expect(createSpy).toHaveBeenCalledWith({ name: 'Polish' })

        const action = { id: 2, name: 'Polish', idx: 1, createdAt: '0', updatedAt: '0' }
        await actionService.update(action, { name: 'Polish Updated' })
        expect(updateSpy).toHaveBeenCalledWith(action, { name: 'Polish Updated' })

        await actionService.delete(2)
        expect(deleteSpy).toHaveBeenCalledWith(2)

        const count = await actionService.count()
        expect(countSpy).toHaveBeenCalled()
        expect(count).toBe(5)
    })
})
