/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import { computePosition, flip, offset, shift, type Placement as FloatingPlacement } from '@floating-ui/dom'
import { useTheme } from '@/common/hooks/useTheme'

export interface StatefulPopoverProps {
    content: React.ReactNode | ((args: { close: () => void }) => React.ReactNode)
    placement?: string
    triggerType?: 'hover' | 'click'
    showArrow?: boolean
    autoFocus?: boolean
    children: React.ReactNode
    overrides?: any
    onClose?: () => void
    onOpen?: () => void
}

export function StatefulPopover({
    content,
    placement = 'bottom',
    triggerType = 'click',
    children,
    onClose,
    onOpen,
}: StatefulPopoverProps) {
    const { theme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const triggerRef = useRef<HTMLElement | null>(null)
    const popoverRef = useRef<HTMLDivElement | null>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const resolvedPlacement: FloatingPlacement = (
        placement === 'bottom' ? 'bottom-start' : placement === 'top' ? 'top-start' : placement
    ) as FloatingPlacement

    const updatePosition = () => {
        if (!triggerRef.current || !popoverRef.current) return
        computePosition(triggerRef.current, popoverRef.current, {
            placement: resolvedPlacement,
            middleware: [offset(4), flip(), shift({ padding: 6 })],
        }).then(({ x, y }) => {
            if (popoverRef.current) {
                Object.assign(popoverRef.current.style, {
                    left: `${x}px`,
                    top: `${y}px`,
                })
            }
        })
    }

    useEffect(() => {
        if (isOpen) {
            updatePosition()
            onOpen?.()
        } else {
            onClose?.()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return
        const handleMouseDown = (e: MouseEvent) => {
            const path = e.composedPath ? e.composedPath() : []
            if (
                triggerRef.current &&
                !path.includes(triggerRef.current) &&
                popoverRef.current &&
                !path.includes(popoverRef.current)
            ) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleMouseDown)
        return () => document.removeEventListener('mousedown', handleMouseDown)
    }, [isOpen])

    const handleMouseEnter = () => {
        if (triggerType === 'hover') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            setIsOpen(true)
        }
    }

    const handleMouseLeave = () => {
        if (triggerType === 'hover') {
            timeoutRef.current = setTimeout(() => setIsOpen(false), 150)
        }
    }

    const handleClick = () => {
        if (triggerType === 'click') {
            setIsOpen(!isOpen)
        }
    }

    if (!isValidElement(children)) {
        return <>{children}</>
    }

    const triggerElement = cloneElement(children as React.ReactElement<any>, {
        ref: (node: HTMLElement | null) => {
            triggerRef.current = node
            const childRef = (children as any).ref
            if (typeof childRef === 'function') childRef(node)
            else if (childRef) childRef.current = node
        },
        onMouseEnter: (e: any) => {
            handleMouseEnter()
            ;(children as any).props?.onMouseEnter?.(e)
        },
        onMouseLeave: (e: any) => {
            handleMouseLeave()
            ;(children as any).props?.onMouseLeave?.(e)
        },
        onClick: (e: any) => {
            handleClick()
            ;(children as any).props?.onClick?.(e)
        },
    })

    const close = () => setIsOpen(false)
    const renderedContent = typeof content === 'function' ? content({ close }) : content

    return (
        <>
            {triggerElement}
            {isOpen && (
                <div
                    ref={popoverRef}
                    onMouseEnter={() => {
                        if (triggerType === 'hover' && timeoutRef.current) {
                            clearTimeout(timeoutRef.current)
                        }
                    }}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        zIndex: 9999,
                        backgroundColor: theme.colors.backgroundPrimary,
                        border: `1px solid ${theme.colors.borderOpaque}`,
                        borderRadius: '6px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
                        overflow: 'hidden',
                    }}
                >
                    {renderedContent}
                </div>
            )}
        </>
    )
}

export const Popover = StatefulPopover
