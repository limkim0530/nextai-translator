import { describe, it, expect, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { List, arrayMove } from './List'

describe('List component', () => {
    it('moves array items correctly with arrayMove helper', () => {
        const arr = ['a', 'b', 'c', 'd']
        expect(arrayMove(arr, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
        expect(arrayMove(arr, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
    })

    it('renders drag handles and supports reordering via drag and drop', async () => {
        const onChange = vi.fn()
        const container = document.createElement('div')
        document.body.appendChild(container)

        await act(async () => {
            createRoot(container).render(
                <List items={[<span key='1'>Item 1</span>, <span key='2'>Item 2</span>]} onChange={onChange} />
            )
        })

        // Should render drag handles
        const handles = container.querySelectorAll('[title="Drag to reorder"]')
        expect(handles.length).toBe(2)

        const rows = container.querySelectorAll('div[draggable="true"]')
        expect(rows.length).toBe(2)

        // Simulate HTML5 drag and drop from index 0 to index 1
        const mockDataTransfer = {
            setData: vi.fn(),
            effectAllowed: 'none',
            dropEffect: 'none',
        }

        await act(async () => {
            const dragStartEvent = new Event('dragstart', { bubbles: true })
            Object.defineProperty(dragStartEvent, 'dataTransfer', { value: mockDataTransfer })
            rows[0].dispatchEvent(dragStartEvent)
        })

        await act(async () => {
            const dragOverEvent = new Event('dragover', { bubbles: true })
            Object.defineProperty(dragOverEvent, 'dataTransfer', { value: mockDataTransfer })
            rows[1].dispatchEvent(dragOverEvent)
        })

        await act(async () => {
            const dropEvent = new Event('drop', { bubbles: true })
            Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer })
            rows[1].dispatchEvent(dropEvent)
        })

        expect(onChange).toHaveBeenCalledWith({ oldIndex: 0, newIndex: 1 })
    })
})
