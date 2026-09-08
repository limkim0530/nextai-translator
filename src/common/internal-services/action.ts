import { builtinActionModes } from '../constants'
import type { TranslateMode } from '../translate'
import { Action, ActionOutputRenderingFormat, getLocalDB } from './db'

export const getDefaultBuiltinActions = (): Action[] => {
    const now = '0'
    return builtinActionModes.map((m, idx) => ({
        id: idx + 1,
        idx,
        name: m.name,
        mode: m.mode,
        icon: m.icon,
        createdAt: now,
        updatedAt: now,
    }))
}

export interface ICreateActionOption {
    name: string
    mode?: TranslateMode
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    /** `ProviderConfig.id` to use instead of the default provider. */
    providerId?: string
    apiModel?: string
}

export interface IUpdateActionOption {
    idx?: number
    name?: string
    mode?: TranslateMode
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    providerId?: string
    apiModel?: string
    clearFields?: (keyof Action)[]
}

export interface IActionInternalService {
    create(opt: ICreateActionOption): Promise<Action>
    update(action: Action, opt: IUpdateActionOption): Promise<Action>
    bulkPut(actions: Action[]): Promise<void>
    get(id: number): Promise<Action | undefined>
    getByMode(mode: string): Promise<Action | undefined>
    delete(id: number): Promise<void>
    list(): Promise<Action[]>
    count(): Promise<number>
}

class ActionInternalService implements IActionInternalService {
    private get db() {
        return getLocalDB()
    }

    private initPromise: Promise<void> | null = null

    async ensureBuiltins(): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = (async () => {
                const existing = await this.db.action.toArray()
                const existingModes = new Set(existing.map((a) => a.mode).filter(Boolean))
                const missing = builtinActionModes.filter((m) => !existingModes.has(m.mode))
                const now = new Date().valueOf().toString()
                if (missing.length > 0) {
                    let count = existing.length
                    const newActions: Action[] = missing.map((m) => ({
                        idx: count++,
                        name: m.name,
                        mode: m.mode,
                        icon: m.icon,
                        createdAt: now,
                        updatedAt: now,
                    }))
                    await this.db.action.bulkAdd(newActions)
                }
                const zeroCreated = existing.filter((a) => a.createdAt === '0')
                if (zeroCreated.length > 0) {
                    await this.db.action.bulkPut(
                        zeroCreated.map((a) => ({
                            ...a,
                            createdAt: now,
                            updatedAt: now,
                        }))
                    )
                }
            })().catch((err) => {
                this.initPromise = null
                console.error('Failed to ensure builtin actions:', err)
            })
        }
        return this.initPromise
    }

    async create(opt: ICreateActionOption): Promise<Action> {
        if (!opt.name) {
            throw new Error('name is required')
        }
        await this.ensureBuiltins()
        const now = new Date().valueOf().toString()
        const action: Action = {
            idx: await this.db.action.count(),
            name: opt.name,
            createdAt: now,
            updatedAt: now,
        }
        if (opt.mode) action.mode = opt.mode
        if (opt.icon) action.icon = opt.icon
        if (opt.rolePrompt !== undefined && opt.rolePrompt !== '') action.rolePrompt = opt.rolePrompt
        if (opt.commandPrompt !== undefined && opt.commandPrompt !== '') action.commandPrompt = opt.commandPrompt
        if (opt.outputRenderingFormat) action.outputRenderingFormat = opt.outputRenderingFormat
        if (opt.providerId) action.providerId = opt.providerId
        if (opt.apiModel) action.apiModel = opt.apiModel

        const id = await this.db.action.add(action)
        action.id = id as number
        return action
    }

    async update(action: Action, opt: IUpdateActionOption): Promise<Action> {
        return this.db.transaction('rw', this.db.action, async () => {
            if (opt.idx !== undefined) {
                let actions: Action[]
                if (action.idx < opt.idx) {
                    actions = await this.db.action.where('idx').between(action.idx, opt.idx).toArray()
                    actions.forEach((a) => a.idx--)
                } else {
                    actions = await this.db.action.where('idx').between(opt.idx, action.idx).toArray()
                    actions.forEach((a) => a.idx++)
                }
                await this.db.action.bulkPut(actions)
            }
            const now = new Date().valueOf().toString()
            const newAction = {
                ...action,
                ...opt,
                updatedAt: now,
            }
            if (opt.clearFields) {
                opt.clearFields.forEach((field) => {
                    delete newAction[field]
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (newAction as any).clearFields
            }
            // Use put() instead of update() so that undefined values properly
            // clear fields (Dexie's update() silently ignores undefined properties)
            await this.db.action.put(newAction)
            return newAction
        })
    }

    async bulkPut(actions: Action[]): Promise<void> {
        await this.ensureBuiltins()
        await this.db.action.bulkPut(actions)
    }

    async get(id: number): Promise<Action | undefined> {
        try {
            await this.ensureBuiltins()
            const action = await this.db.action.get(id)
            if (action) {
                return action
            }
        } catch (err) {
            console.error('Failed to get action from db:', err)
        }
        return getDefaultBuiltinActions().find((a) => a.id === id)
    }

    async getByMode(mode: string): Promise<Action | undefined> {
        try {
            await this.ensureBuiltins()
            const action = await this.db.action.where('mode').equals(mode).first()
            if (action) {
                return action
            }
        } catch (err) {
            console.error('Failed to get action by mode from db:', err)
        }
        return getDefaultBuiltinActions().find((a) => a.mode === mode)
    }

    async delete(id: number): Promise<void> {
        return this.db.transaction('rw', this.db.action, async () => {
            const action = await this.db.action.get(id)
            if (!action) {
                return
            }
            if (action.mode) {
                return
            }
            const actions = await this.db.action.where('idx').above(action.idx).toArray()
            actions.forEach((a) => a.idx--)
            await this.db.action.bulkPut(actions)
            return await this.db.action.delete(id)
        })
    }

    async list(): Promise<Action[]> {
        try {
            await this.ensureBuiltins()
            const actions = await this.db.action.toArray()
            if (actions.length > 0) {
                return actions.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0))
            }
        } catch (err) {
            console.error('Failed to list actions from db:', err)
        }
        return getDefaultBuiltinActions()
    }

    async count(): Promise<number> {
        try {
            await this.ensureBuiltins()
            const cnt = await this.db.action.count()
            if (cnt > 0) {
                return cnt
            }
        } catch (err) {
            console.error('Failed to count actions from db:', err)
        }
        return getDefaultBuiltinActions().length
    }
}

export const actionInternalService = new ActionInternalService()
