/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { useTheme } from '@/common/hooks/useTheme'
import { MdClose } from 'react-icons/md'

export const TAG_HIERARCHY = {
    primary: 'primary',
    secondary: 'secondary',
} as const

export const HIERARCHY = TAG_HIERARCHY

export interface TagProps {
    children?: React.ReactNode
    closeable?: boolean
    onActionClick?: (e: React.MouseEvent) => void
    hierarchy?: string
    kind?: string
    size?: 'small' | 'medium' | 'large'
    className?: string
    style?: React.CSSProperties
    overrides?: any
}

export function Tag({
    children,
    closeable = false,
    onActionClick,
    kind = 'accent',
    size = 'small',
    className,
    style,
}: TagProps) {
    const { theme } = useTheme()

    let bg = theme.colors.backgroundLightAccent
    let color = theme.colors.contentAccent

    if (kind === 'negative') {
        bg = theme.colors.backgroundNegative + '20'
        color = theme.colors.contentNegative
    } else if (kind === 'positive') {
        bg = theme.colors.backgroundPositive + '20'
        color = theme.colors.contentPositive
    } else if (kind === 'warning') {
        bg = theme.colors.backgroundWarning + '20'
        color = theme.colors.contentWarning
    }

    let padding = '2px 6px'
    let fontSize = '11px'

    if (size === 'medium') {
        padding = '4px 8px'
        fontSize = '12px'
    } else if (size === 'large') {
        padding = '6px 12px'
        fontSize = '13px'
    }

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding,
                fontSize,
                fontWeight: 500,
                borderRadius: '4px',
                backgroundColor: bg,
                color,
                lineHeight: 1.2,
                userSelect: 'none',
                ...style,
            }}
            className={className}
        >
            <span>{children}</span>
            {closeable && (
                <span
                    onClick={onActionClick}
                    style={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}
                >
                    <MdClose size={12} />
                </span>
            )}
        </span>
    )
}
