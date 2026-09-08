/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import { computePosition, flip, offset, shift, type Placement as FloatingPlacement } from '@floating-ui/dom'
import { useTheme } from '@/common/hooks/useTheme'

export const PLACEMENT = {
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
    topLeft: 'top-start',
    topRight: 'top-end',
    bottomLeft: 'bottom-start',
    bottomRight: 'bottom-end',
} as const

export type TooltipPlacement = keyof typeof PLACEMENT | FloatingPlacement | string

export interface StatefulTooltipProps {
    content: React.ReactNode | (() => React.ReactNode) | any
    placement?: TooltipPlacement
    children: React.ReactNode
    showArrow?: boolean
    triggerType?: 'hover' | 'click'
    accessibilityType?: string
    onMouseEnterDelay?: number
    overrides?: any
    [key: string]: any
}

export function StatefulTooltip({
    content,
    placement = 'top',
    children,
    triggerType = 'hover',
    onMouseEnterDelay,
}: StatefulTooltipProps) {
    const { theme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const triggerRef = useRef<HTMLElement | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Map baseui placement names to floating-ui placement names
    const resolvedPlacement: FloatingPlacement = (
        placement === 'topLeft'
            ? 'top-start'
            : placement === 'topRight'
              ? 'top-end'
              : placement === 'bottomLeft'
                ? 'bottom-start'
                : placement === 'bottomRight'
                  ? 'bottom-end'
                  : placement
    ) as FloatingPlacement

    useEffect(() => {
        if (!isOpen || !triggerRef.current || !tooltipRef.current) return
        computePosition(triggerRef.current, tooltipRef.current, {
            placement: resolvedPlacement,
            middleware: [offset(8), flip(), shift({ padding: 6 })],
        }).then(({ x, y }) => {
            if (tooltipRef.current) {
                Object.assign(tooltipRef.current.style, {
                    left: `${x}px`,
                    top: `${y}px`,
                })
            }
        })
    }, [isOpen, content, resolvedPlacement])

    const handleMouseEnter = () => {
        if (triggerType === 'hover') {
            if (onMouseEnterDelay && onMouseEnterDelay > 0) {
                timerRef.current = setTimeout(() => setIsOpen(true), onMouseEnterDelay)
            } else {
                setIsOpen(true)
            }
        }
    }

    const handleMouseLeave = () => {
        if (triggerType === 'hover') {
            if (timerRef.current) clearTimeout(timerRef.current)
            setIsOpen(false)
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

    const renderedContent = typeof content === 'function' ? content() : content

    return (
        <>
            {triggerElement}
            {isOpen && (
                <div
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        zIndex: 99999,
                        pointerEvents: 'none',
                        backgroundColor: theme.colors.backgroundInversePrimary,
                        color: theme.colors.contentInversePrimary,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        lineHeight: 1.3,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {renderedContent}
                </div>
            )}
        </>
    )
}
