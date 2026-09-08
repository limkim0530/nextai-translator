import { IActionInternalService, ICreateActionOption, IUpdateActionOption } from '../../internal-services/action'
import { Action } from '../../internal-services/db'
import { getDefaultBuiltinActions } from '../../hooks/useActions'
import { callMethod } from './base'

class BackgroundActionService implements IActionInternalService {
    create(opt: ICreateActionOption): Promise<Action> {
        return callMethod('actionService', 'create', [opt])
    }
    update(action: Action, opt: IUpdateActionOption): Promise<Action> {
        return callMethod('actionService', 'update', [action, opt])
    }
    bulkPut(actions: Action[]): Promise<void> {
        return callMethod('actionService', 'bulkPut', [actions])
    }
    async get(id: number): Promise<Action | undefined> {
        try {
            const res = await callMethod('actionService', 'get', [id])
            if (res) return res
        } catch (err) {
            console.error('backgroundActionService.get failed:', err)
        }
        return getDefaultBuiltinActions().find((a) => a.id === id)
    }
    async getByMode(mode: string): Promise<Action | undefined> {
        try {
            const res = await callMethod('actionService', 'getByMode', [mode])
            if (res) return res
        } catch (err) {
            console.error('backgroundActionService.getByMode failed:', err)
        }
        return getDefaultBuiltinActions().find((a) => a.mode === mode)
    }
    delete(id: number): Promise<void> {
        return callMethod('actionService', 'delete', [id])
    }
    async list(): Promise<Action[]> {
        try {
            const res = await callMethod('actionService', 'list', [])
            if (Array.isArray(res) && res.length > 0) {
                return res
            }
        } catch (err) {
            console.error('backgroundActionService.list failed:', err)
        }
        return getDefaultBuiltinActions()
    }
    count(): Promise<number> {
        return callMethod('actionService', 'count', [])
    }
}

export const backgroundActionService = new BackgroundActionService()
