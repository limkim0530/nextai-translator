import { CachedSnapshot } from '../../internal-services/db'
import { ISnapshotInternalService } from '../../internal-services/snapshot'
import { callMethod } from './base'

class BackgroundSnapshotService implements ISnapshotInternalService {
    async get(key: string): Promise<CachedSnapshot | undefined> {
        return await callMethod('snapshotService', 'get', [key])
    }

    async put(item: CachedSnapshot): Promise<void> {
        return await callMethod('snapshotService', 'put', [item])
    }

    async delete(key: string): Promise<void> {
        return await callMethod('snapshotService', 'delete', [key])
    }
}

export const backgroundSnapshotService = new BackgroundSnapshotService()
