import { useCallback, useEffect, useRef, useState } from 'react'

export interface DraggableBounds {
    left?: number
    top?: number
    right?: number
    bottom?: number
}

export interface UseDraggableOptions {
    initialPosition?: { x: number; y: number }
    handleSelector?: string
    bounds?: DraggableBounds | (() => DraggableBounds | undefined)
    onStart?: (pos: { x: number; y: number }) => void
    onDrag?: (pos: { x: number; y: number }) => void
    onDragEnd?: (pos: { x: number; y: number }) => void
}

export function useDraggable({
    initialPosition = { x: 0, y: 0 },
    handleSelector = '',
    bounds,
    onStart,
    onDrag,
    onDragEnd,
}: UseDraggableOptions = {}) {
    const [position, setPosition] = useState(initialPosition)
    const isDraggingRef = useRef(false)
    const startPosRef = useRef({ x: 0, y: 0 })
    const elemPosRef = useRef(initialPosition)
    const currentPosRef = useRef(initialPosition)
    currentPosRef.current = position

    const onPointerDown = useCallback(
        (e: React.PointerEvent | React.MouseEvent) => {
            if (handleSelector) {
                const target = e.target as HTMLElement | null
                if (!target?.closest?.(handleSelector)) return
            }
            isDraggingRef.current = true
            startPosRef.current = { x: e.clientX, y: e.clientY }
            elemPosRef.current = currentPosRef.current
            onStart?.(currentPosRef.current)

            try {
                if ('setPointerCapture' in e.currentTarget && 'pointerId' in e) {
                    ;(e.currentTarget as HTMLElement).setPointerCapture((e as React.PointerEvent).pointerId)
                }
            } catch (err) {
                void err
            }
        },
        [handleSelector, onStart]
    )

    useEffect(() => {
        const handleMove = (e: MouseEvent | PointerEvent) => {
            if (!isDraggingRef.current) return
            const dx = e.clientX - startPosRef.current.x
            const dy = e.clientY - startPosRef.current.y
            let nextX = elemPosRef.current.x + dx
            let nextY = elemPosRef.current.y + dy

            const resolvedBounds = typeof bounds === 'function' ? bounds() : bounds
            if (resolvedBounds) {
                if (resolvedBounds.left !== undefined) nextX = Math.max(resolvedBounds.left, nextX)
                if (resolvedBounds.right !== undefined) nextX = Math.min(resolvedBounds.right, nextX)
                if (resolvedBounds.top !== undefined) nextY = Math.max(resolvedBounds.top, nextY)
                if (resolvedBounds.bottom !== undefined) nextY = Math.min(resolvedBounds.bottom, nextY)
            }

            const nextPos = { x: nextX, y: nextY }
            setPosition(nextPos)
            onDrag?.(nextPos)
        }

        const handleUp = (e: MouseEvent | PointerEvent) => {
            if (!isDraggingRef.current) return
            isDraggingRef.current = false
            try {
                if (e.target && 'releasePointerCapture' in e.target && 'pointerId' in e) {
                    ;(e.target as HTMLElement).releasePointerCapture((e as PointerEvent).pointerId)
                }
            } catch (err) {
                void err
            }
            onDragEnd?.(currentPosRef.current)
        }

        document.addEventListener('pointermove', handleMove)
        document.addEventListener('mousemove', handleMove)
        document.addEventListener('pointerup', handleUp)
        document.addEventListener('mouseup', handleUp)

        return () => {
            document.removeEventListener('pointermove', handleMove)
            document.removeEventListener('mousemove', handleMove)
            document.removeEventListener('pointerup', handleUp)
            document.removeEventListener('mouseup', handleUp)
        }
    }, [bounds, onDrag, onDragEnd])

    return {
        position,
        setPosition,
        transform: `translate(${position.x}px,${position.y}px)`,
        dragProps: {
            onPointerDown,
            onMouseDown: onPointerDown,
        },
    }
}
