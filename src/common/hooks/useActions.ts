import useSWR, { mutate } from 'swr'
import { actionService } from '../services/action'
import { Action } from '../internal-services/db'
import { isDesktopApp } from '../utils'
import { useEffect } from 'react'
import { getDefaultBuiltinActions } from '../internal-services/action'

export { getDefaultBuiltinActions }
export const ACTIONS_SWR_KEY = 'actions'

export function refreshActionsGlobally() {
    return mutate(ACTIONS_SWR_KEY)
}

export function useActions(refreshFlag?: number): Action[] {
    const { data: actions, mutate: revalidate } = useSWR<Action[]>(
        ACTIONS_SWR_KEY,
        async () => {
            try {
                const list = await actionService.list()
                if (Array.isArray(list) && list.length > 0) {
                    return list
                }
                return getDefaultBuiltinActions()
            } catch (err) {
                console.error('Failed to fetch actions in useActions:', err)
                return getDefaultBuiltinActions()
            }
        },
        {
            fallbackData: getDefaultBuiltinActions(),
            revalidateOnFocus: false,
        }
    )

    useEffect(() => {
        if (refreshFlag !== undefined) {
            void revalidate()
        }
    }, [refreshFlag, revalidate])

    useEffect(() => {
        if (!isDesktopApp()) {
            return
        }
        let unlisten: (() => void) | undefined
        import('@tauri-apps/api/event')
            .then(({ listen }) => {
                listen('refresh-actions', () => {
                    void revalidate()
                }).then((cb) => {
                    unlisten = cb
                })
            })
            .catch((err) => {
                console.error('Failed to listen to refresh-actions:', err)
            })
        return () => {
            unlisten?.()
        }
    }, [revalidate])

    return actions ?? getDefaultBuiltinActions()
}
