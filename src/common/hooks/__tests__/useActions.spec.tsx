import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useActions, getDefaultBuiltinActions } from '../useActions'
import { actionService } from '../../services/action'
import { Action } from '../../internal-services/db'

function TestComponent({ onValue }: { onValue: (val: Action[]) => void }) {
    const actions = useActions()
    React.useEffect(() => {
        onValue(actions)
    }, [actions, onValue])
    return <div>{actions.length}</div>
}

describe('useActions hook', () => {
    let container: HTMLDivElement

    beforeEach(() => {
        vi.restoreAllMocks()
        container = document.createElement('div')
        document.body.appendChild(container)
    })

    afterEach(() => {
        vi.restoreAllMocks()
        container.remove()
    })

    it('returns default builtin actions synchronously on initial render', async () => {
        let currentActions: Action[] = []
        await act(async () => {
            createRoot(container).render(
                <TestComponent
                    onValue={(val) => {
                        currentActions = val
                    }}
                />
            )
        })

        expect(currentActions).toHaveLength(5)
        expect(currentActions.map((a) => a.mode)).toEqual([
            'translate',
            'polishing',
            'summarize',
            'analyze',
            'explain-code',
        ])
    })

    it('updates when actionService.list returns actions', async () => {
        const customActions = [
            ...getDefaultBuiltinActions(),
            { id: 99, idx: 5, name: 'Custom Action', mode: undefined, createdAt: '0', updatedAt: '0' },
        ]
        vi.spyOn(actionService, 'list').mockResolvedValue(customActions)

        let currentActions: Action[] = []
        await act(async () => {
            createRoot(container).render(
                <TestComponent
                    onValue={(val) => {
                        currentActions = val
                    }}
                />
            )
        })

        expect(currentActions.length).toBeGreaterThanOrEqual(5)
    })

    it('falls back to default builtin actions if actionService.list fails', async () => {
        vi.spyOn(actionService, 'list').mockRejectedValue(new Error('IndexedDB failed'))

        let currentActions: Action[] = []
        await act(async () => {
            createRoot(container).render(
                <TestComponent
                    onValue={(val) => {
                        currentActions = val
                    }}
                />
            )
        })

        expect(currentActions).toHaveLength(5)
    })
})
