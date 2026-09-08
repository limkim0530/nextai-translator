import { computePosition, shift, flip, offset, type ReferenceElement, size } from '@floating-ui/dom'
import { PropsWithChildren, useCallback, useEffect, useRef } from 'react'
import {
    documentPadding,
    dragRegionSelector,
    popupCardInnerContainerId,
    popupCardMaxWidth,
    popupCardMinHeight,
    popupCardMinWidth,
    popupCardOffset,
    zIndex,
} from './consts'
import { createUseStyles } from '@/common/styles'
import { useAppStore } from '../../common/store'
import { type DraggableBounds, useDraggable } from '../../common/hooks/useDraggable'

type Props = {
    reference: ReferenceElement
    compact?: boolean
} & PropsWithChildren

const useStyles = createUseStyles({
    container: {
        position: 'fixed',
        zIndex,
        borderRadius: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        minWidth: `${popupCardMinWidth}px`,
        maxWidth: `${popupCardMaxWidth}px`,
        lineHeight: '1.6',
        fontSize: '13px',
        color: '#333',
        font: '14px/1.6 "Inter",-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji',
        letterSpacing: '-0.01em',
        minHeight: `${popupCardMinHeight}px`,
        width: 'max-content',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        overscrollBehavior: 'contain',
    },
})

export default function InnerContainer({ children, reference, compact }: Props) {
    const styles = useStyles()
    const showSettings = useAppStore((state) => state.showSettings)

    const draggedRef = useRef(false)
    const draggableRef = useRef<HTMLDivElement | null>(null)
    const boundsRef = useRef<DraggableBounds | undefined>(undefined)

    const updatePosition = useCallback(async () => {
        if (!draggableRef.current) {
            return
        }
        const { x, y } = await computePosition(reference, draggableRef.current, {
            placement: 'bottom',
            middleware: [
                offset(popupCardOffset),
                flip({
                    padding: documentPadding,
                    fallbackPlacements: ['top', 'bottom'],
                }),
                shift({
                    padding: documentPadding,
                    crossAxis: true,
                }),
                size({
                    padding: documentPadding,
                    apply({ availableHeight, elements }) {
                        const safeMaxHeight = Math.min(availableHeight, window.innerHeight - 2 * documentPadding)
                        Object.assign(elements.floating.style, {
                            maxHeight: `${Math.floor(safeMaxHeight)}px`,
                            overflow: 'hidden',
                        })
                    },
                }),
            ],
            strategy: 'fixed',
        })

        Object.assign(draggableRef.current.style, {
            left: `${Math.max(documentPadding, x)}px`,
            top: `${Math.max(documentPadding, y)}px`,
        })
    }, [reference])

    const handleOnStart = useCallback((pos: { x: number; y: number }) => {
        const node = draggableRef.current
        if (!node) {
            return
        }
        const rect = node.getBoundingClientRect()
        boundsRef.current = {
            left: pos.x - rect.left + documentPadding,
            top: pos.y - rect.top + documentPadding,
            right: pos.x + Math.max(0, window.innerWidth - rect.right - documentPadding),
            bottom: pos.y + Math.max(0, window.innerHeight - rect.bottom - documentPadding),
        }
    }, [])

    const { setPosition, transform, dragProps } = useDraggable({
        handleSelector: dragRegionSelector,
        bounds: () => boundsRef.current,
        onStart: handleOnStart,
        onDrag: () => {
            draggedRef.current = true
        },
    })

    useEffect(() => {
        if (!draggableRef.current) {
            return
        }
        const resizeObserver = new ResizeObserver(() => {
            if (draggedRef.current) {
                const node = draggableRef.current
                if (node) {
                    const rect = node.getBoundingClientRect()
                    if (rect.bottom > window.innerHeight - documentPadding) {
                        const overflowY = rect.bottom - (window.innerHeight - documentPadding)
                        setPosition((prev) => ({
                            ...prev,
                            y: prev.y - overflowY,
                        }))
                    }
                }
            } else {
                updatePosition()
            }
        })
        resizeObserver.observe(draggableRef.current)
        return () => {
            resizeObserver.disconnect()
        }
    }, [reference, setPosition, updatePosition])

    useEffect(() => {
        const handleResize = () => {
            if (!draggedRef.current) {
                updatePosition()
            }
        }
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [updatePosition])

    if (compact) {
        return (
            <div
                ref={draggableRef}
                className={styles.container}
                id={popupCardInnerContainerId}
                style={{ minWidth: 'auto', minHeight: 'auto', width: 'max-content' }}
            >
                {children}
            </div>
        )
    }

    return (
        <div
            ref={draggableRef}
            className={styles.container}
            id={popupCardInnerContainerId}
            style={{
                width: showSettings ? `${popupCardMaxWidth}px` : 'max-content',
                transform,
            }}
            {...dragProps}
        >
            {children}
        </div>
    )
}
