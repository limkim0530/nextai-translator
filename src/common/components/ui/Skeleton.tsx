/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { useTheme } from '@/common/hooks/useTheme'

export interface SkeletonProps {
    rows?: number
    height?: string
    width?: string
    animation?: boolean
    overrides?: any
}

export function Skeleton({ rows = 1, height = '20px', width = '100%', animation = true }: SkeletonProps) {
    const { theme } = useTheme()

    const items = Array.from({ length: rows })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width }}>
            {items.map((_, i) => (
                <div
                    key={i}
                    style={{
                        height: rows > 1 ? `calc(${height} / ${rows} - 8px)` : height,
                        width: '100%',
                        borderRadius: '4px',
                        backgroundColor: theme.colors.backgroundTertiary,
                        opacity: animation ? 0.7 : 1,
                        animation: animation ? 'pulse 1.5s ease-in-out infinite' : undefined,
                    }}
                />
            ))}
        </div>
    )
}
