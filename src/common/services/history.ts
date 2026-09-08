import {
    CreateHistoryItem,
    HistoryQueryOptions,
    IHistoryInternalService,
    UpdateHistoryPayload,
    historyInternalService,
} from '../internal-services/history'
import { HistoryItem } from '../internal-services/db'
import { isDesktopApp, isUserscript } from '../utils'
import { backgroundHistoryService } from '../background/services/history'

const canUseBackgroundService = (): boolean => {
    if (isDesktopApp() || isUserscript()) {
        return false
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof chrome !== 'undefined' && Boolean((chrome as any)?.runtime?.sendMessage)
}

const getService = (): IHistoryInternalService =>
    canUseBackgroundService() ? backgroundHistoryService : historyInternalService

export const historyService = {
    create(item: CreateHistoryItem): Promise<HistoryItem> {
        return getService().create(item)
    },
    update(id: number, payload: UpdateHistoryPayload): Promise<void> {
        return getService().update(id, payload)
    },
    updateFavorite(id: number, favorite: boolean): Promise<void> {
        return getService().updateFavorite(id, favorite)
    },
    touch(id: number): Promise<void> {
        return getService().touch(id)
    },
    delete(id: number): Promise<void> {
        return getService().delete(id)
    },
    clear(): Promise<void> {
        return getService().clear()
    },
    list(options?: HistoryQueryOptions): Promise<HistoryItem[]> {
        return getService().list(options)
    },
    get(id: number): Promise<HistoryItem | undefined> {
        return getService().get(id)
    },
}
