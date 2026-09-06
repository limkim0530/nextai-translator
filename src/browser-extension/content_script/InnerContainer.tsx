import { computePosition, shift, flip, offset, type ReferenceElement, size } from '@floating-ui/dom'
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'
import Draggable, { DraggableBounds, DraggableData, DraggableEvent } from 'react-draggable'
import {
    documentPadding,
    dragRegionSelector,
    popupCardInnerContainerId,
    popupCardMaxWidth,
    popupCardMinHeight,
    popupCardMinHeightAfterTranslation,
    popupCardMinWidth,
    popupCardOffset,
    zIndex,
} from './consts'
import { createUseStyles } from 'react-jss'
import { useAtomValue } from 'jotai'
import { showSettingsAtom } from '../../common/store/setting'

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
        /**
         * `size()` below caps the card's height, so anything taller has to scroll
         * *inside* it — the card itself is `overflow: hidden` and the page behind it
         * is not the pane's scroller. A block container gives a child no way to opt
         * into that: it would be laid out at its full height and silently clipped
         * (which is what made the settings pane unreachable below the fold, with the
         * wheel falling through to the host page). As a column, a child that sets
         * `min-height: 0` shrinks to whatever the cap leaves and can scroll itself.
         * Nothing here shrinks unless it asks to, so the translator view is unchanged.
         */
        display: 'flex',
        flexDirection: 'column',
        // Keep a wheel that runs out of scroll inside the card from chaining to the page.
        overscrollBehavior: 'contain',
    },
})

export default function InnerContainer({ children, reference, compact }: Props) {
    const styles = useStyles()
    const showSettings = useAtomValue(showSettingsAtom)

    const draggedRef = useRef(false)
    const draggableRef = useRef<HTMLDivElement | null>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [bounds, setBounds] = useState<DraggableBounds>()

    const updatePosition = useCallback(async () => {
        if (!draggableRef.current) {
            return
        }
        const { x, y } = await computePosition(reference, draggableRef.current, {
            placement: 'bottom',
            middleware: [
                shift({ padding: documentPadding }),
                offset(popupCardOffset),
                flip(),
                size({
                    apply({ availableHeight, elements }) {
                        Object.assign(elements.floating.style, {
                            maxHeight: `${Math.max(popupCardMinHeightAfterTranslation, availableHeight)}px`,
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

    /**
     * Keep the card in the viewport, without `bounds='html'`.
     *
     * A bounds *selector* is resolved against `node.getRootNode()`, which for
     * this card is the shadow root the content script mounts into — and a
     * shadow tree has no `<html>`, so react-draggable throws out of every
     * mousemove and the card never moves. (It used to query the owner document,
     * which is why this only broke on the 4.5 upgrade.)
     *
     * Measuring is also the more correct answer: the card is `position: fixed`,
     * so what has to stay reachable is the viewport, while `html` would have
     * bounded it by the full scroll height of the page.
     */
    const handleOnStart = useCallback(() => {
        const node = draggableRef.current
        if (!node) {
            return
        }
        const rect = node.getBoundingClientRect()
        // In translate space: `rect` already includes the current offset, so
        // each edge is measured from where the card sits right now.
        setBounds({
            left: position.x - rect.left + documentPadding,
            top: position.y - rect.top + documentPadding,
            right: position.x + window.innerWidth - rect.right - documentPadding,
            bottom: position.y + window.innerHeight - rect.bottom - documentPadding,
        })
    }, [position])

    function handleOnDrag(event: DraggableEvent, data: DraggableData) {
        draggedRef.current = true
        setPosition({ x: data.x, y: data.y })
    }

    useEffect(() => {
        if (!draggableRef.current) {
            return
        }
        const resizeObserver = new ResizeObserver(() => {
            if (draggedRef.current) {
                // do nothing if has been dragged
            } else {
                updatePosition()
            }
        })
        resizeObserver.observe(draggableRef.current)
        return () => {
            resizeObserver.disconnect()
        }
    }, [reference, updatePosition])

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
        <Draggable
            nodeRef={draggableRef}
            handle={dragRegionSelector}
            bounds={bounds}
            position={position}
            onStart={handleOnStart}
            onDrag={handleOnDrag}
        >
            <div
                ref={draggableRef}
                className={styles.container}
                id={popupCardInnerContainerId}
                style={{
                    width: showSettings ? `${popupCardMaxWidth}px` : 'max-content',
                }}
            >
                {children}
            </div>
        </Draggable>
    )
}
