import { backgroundSnapshotService } from '../background/services/snapshot'
import { ISnapshotInternalService, snapshotInternalService } from '../internal-services/snapshot'
import { isDesktopApp, isUserscript } from '../utils'

const canUseBackgroundService = (): boolean => {
    if (isDesktopApp() || isUserscript()) {
        return false
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof chrome !== 'undefined' && Boolean((chrome as any)?.runtime?.sendMessage)
}

export const snapshotService: ISnapshotInternalService = {
    get(key: string) {
        return (canUseBackgroundService() ? backgroundSnapshotService : snapshotInternalService).get(key)
    },
    put(item) {
        return (canUseBackgroundService() ? backgroundSnapshotService : snapshotInternalService).put(item)
    },
    delete(key: string) {
        return (canUseBackgroundService() ? backgroundSnapshotService : snapshotInternalService).delete(key)
    },
}
