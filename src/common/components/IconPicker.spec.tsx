import { describe, it, expect, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { IconPicker } from './IconPicker'
import { DEFAULT_ACTION_ICON } from '../constants'

describe('IconPicker', () => {
    it('renders without crashing when value is "default"', async () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const onChange = vi.fn()

        await act(async () => {
            createRoot(container).render(<IconPicker value='default' onChange={onChange} />)
        })

        expect(container.querySelector('button')).not.toBeNull()
        expect(onChange).toHaveBeenCalledWith(DEFAULT_ACTION_ICON)
    })

    it('renders without crashing when value is undefined', async () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const onChange = vi.fn()

        await act(async () => {
            createRoot(container).render(<IconPicker onChange={onChange} />)
        })

        expect(container.querySelector('button')).not.toBeNull()
        expect(onChange).toHaveBeenCalledWith(DEFAULT_ACTION_ICON)
    })

    it('renders without crashing when value is an unknown icon string', async () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const onChange = vi.fn()

        await act(async () => {
            createRoot(container).render(<IconPicker value='some_invalid_icon_name' onChange={onChange} />)
        })

        expect(container.querySelector('button')).not.toBeNull()
        expect(onChange).toHaveBeenCalledWith(DEFAULT_ACTION_ICON)
    })
})
