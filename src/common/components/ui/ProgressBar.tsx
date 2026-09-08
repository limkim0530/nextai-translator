/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { useTheme } from '@/common/hooks/useTheme'

export interface ProgressBarRoundedProps {
    progress?: number
    size?: string
    overrides?: any
}

export function ProgressBarRounded({ progress = 0, size = '32px' }: ProgressBarRoundedProps) {
    const { theme } = useTheme()

    // Normalize progress to 0-1
    const p = progress > 1 ? progress / 100 : progress
    const radius = 14
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - p * circumference

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} viewBox='0 0 36 36' style={{ transform: 'rotate(-90deg)' }}>
                <circle cx='18' cy='18' r={radius} fill='none' stroke={theme.colors.borderOpaque} strokeWidth='3' />
                <circle
                    cx='18'
                    cy='18'
                    r={radius}
                    fill='none'
                    stroke={theme.colors.accent}
                    strokeWidth='3'
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap='round'
                    style={{ transition: 'stroke-dashoffset 0.2s ease' }}
                />
            </svg>
        </div>
    )
}
