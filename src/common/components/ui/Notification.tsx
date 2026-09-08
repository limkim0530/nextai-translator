/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react'
import { useTheme } from '@/common/hooks/useTheme'
import { MdClose, MdInfo, MdCheckCircle, MdWarning, MdError } from 'react-icons/md'
import { KIND } from './constants'

// export KIND from constants

export type NotificationKind = keyof typeof KIND | 'info' | 'warning' | 'positive' | 'negative'

export interface NotificationProps {
    kind?: NotificationKind
    closeable?: boolean
    overrides?: any
    children?: React.ReactNode
    style?: React.CSSProperties
    className?: string
}

export function Notification({
    kind = 'info',
    closeable = false,
    overrides,
    children,
    style,
    className,
}: NotificationProps) {
    const { theme } = useTheme()
    const [closed, setClosed] = useState(false)

    if (closed) return null

    let bg = theme.colors.backgroundLightAccent
    let border = theme.colors.borderAccent
    const text = theme.colors.contentPrimary
    let Icon = MdInfo

    if (kind === 'positive') {
        bg = theme.colors.backgroundPositive + '15'
        border = theme.colors.borderPositive
        Icon = MdCheckCircle
    } else if (kind === 'warning') {
        bg = theme.colors.backgroundWarning + '15'
        border = theme.colors.borderWarning
        Icon = MdWarning
    } else if (kind === 'negative') {
        bg = theme.colors.backgroundNegative + '15'
        border = theme.colors.borderNegative
        Icon = MdError
    }

    const bodyOverride =
        typeof overrides?.Body?.style === 'function'
            ? overrides.Body.style({ $theme: theme, $kind: kind })
            : overrides?.Body?.style || {}

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: bg,
                border: `1px solid ${border}`,
                color: text,
                fontSize: '13px',
                lineHeight: 1.4,
                boxSizing: 'border-box',
                width: '100%',
                ...bodyOverride,
                ...style,
            }}
            className={className}
        >
            <Icon size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1 }}>{children}</div>
            {closeable && (
                <span
                    onClick={() => setClosed(true)}
                    style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: theme.colors.contentTertiary,
                    }}
                >
                    <MdClose size={16} />
                </span>
            )}
        </div>
    )
}
