import { backgroundActionService } from '../background/services/action'
import { IActionInternalService, actionInternalService } from '../internal-services/action'
import { isDesktopApp, isUserscript, isBrowserExtensionOptions } from '../utils'
import { refreshActionsGlobally } from '../hooks/useActions'
import { Action } from '../internal-services/db'

const canUseBackgroundService = (): boolean => {
    if (isDesktopApp() || isUserscript()) {
        return false
    }
    // Extension pages (options, popup) have direct access to IndexedDB, so they must use actionInternalService directly
    if (isBrowserExtensionOptions()) {
        return false
    }
    if (
        typeof window !== 'undefined' &&
        (window.location?.protocol === 'chrome-extension:' || window.location?.protocol === 'moz-extension:')
    ) {
        return false
    }
    // Content script runs in webpage origin, so it must use background service
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof chrome !== 'undefined' && Boolean((chrome as any)?.runtime?.sendMessage)
}

const getService = (): IActionInternalService =>
    canUseBackgroundService() ? backgroundActionService : actionInternalService

export const actionService: IActionInternalService = {
    async create(opt) {
        let res: Action
        try {
            res = await getService().create(opt)
        } catch (err) {
            console.warn('Action create via primary service failed, falling back to local service:', err)
            res = await actionInternalService.create(opt)
        }
        void refreshActionsGlobally()
        return res
    },
    async update(action, opt) {
        let res: Action
        try {
            res = await getService().update(action, opt)
        } catch (err) {
            console.warn('Action update via primary service failed, falling back to local service:', err)
            res = await actionInternalService.update(action, opt)
        }
        void refreshActionsGlobally()
        return res
    },
    async bulkPut(actions) {
        try {
            await getService().bulkPut(actions)
        } catch (err) {
            console.warn('Action bulkPut via primary service failed, falling back to local service:', err)
            await actionInternalService.bulkPut(actions)
        }
        void refreshActionsGlobally()
    },
    async get(id) {
        try {
            return await getService().get(id)
        } catch {
            return await actionInternalService.get(id)
        }
    },
    async getByMode(mode) {
        try {
            return await getService().getByMode(mode)
        } catch {
            return await actionInternalService.getByMode(mode)
        }
    },
    async delete(id) {
        try {
            await getService().delete(id)
        } catch (err) {
            console.warn('Action delete via primary service failed, falling back to local service:', err)
            await actionInternalService.delete(id)
        }
        void refreshActionsGlobally()
    },
    async list() {
        try {
            const list = await getService().list()
            if (Array.isArray(list) && list.length > 0) {
                return list
            }
        } catch (err) {
            console.warn('Action list via primary service failed, falling back to local service:', err)
        }
        return await actionInternalService.list()
    },
    async count() {
        try {
            return await getService().count()
        } catch {
            return await actionInternalService.count()
        }
    },
}
