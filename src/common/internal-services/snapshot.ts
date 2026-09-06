import { CachedSnapshot, getLocalDB } from './db'

export interface ISnapshotInternalService {
    get(key: string): Promise<CachedSnapshot | undefined>
    put(item: CachedSnapshot): Promise<void>
    delete(key: string): Promise<void>
}

class SnapshotInternalService implements ISnapshotInternalService {
    private get db() {
        return getLocalDB()
    }

    public async get(key: string): Promise<CachedSnapshot | undefined> {
        return await this.db.snapshot.get(key)
    }

    public async put(item: CachedSnapshot): Promise<void> {
        await this.db.snapshot.put(item)
    }

    public async delete(key: string): Promise<void> {
        await this.db.snapshot.delete(key)
    }
}

export const snapshotInternalService = new SnapshotInternalService()
