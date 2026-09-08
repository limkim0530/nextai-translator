import { describe, it, expect, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { ActionForm } from './ActionForm'

vi.mock('../services/action', () => ({
    actionService: {
        create: vi.fn(),
        update: vi.fn(),
    },
}))

vi.mock('../hooks/useSettings', () => ({
    useSettings: () => ({
        settings: {
            providers: [],
        },
    }),
}))

describe('ActionForm', () => {
    it('renders without crashing when action is undefined (create action flow)', async () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const onSubmit = vi.fn()

        await act(async () => {
            createRoot(container).render(<ActionForm onSubmit={onSubmit} />)
        })

        // Check that inputs and submit button are present
        expect(container.querySelector('form')).not.toBeNull()
        expect(container.querySelector('button[type="submit"]')).not.toBeNull()
        // Icon picker button should render an icon, not crash
        expect(container.querySelector('svg')).not.toBeNull()
    })
})
