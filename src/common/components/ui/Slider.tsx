/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { useTheme } from '@/common/hooks/useTheme'

export interface SliderProps {
    value?: number[]
    onChange?: (params: { value: number[] }) => void
    onFinalChange?: (params: { value: number[] }) => void
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    overrides?: any
    style?: React.CSSProperties
    className?: string
}

export function Slider({
    value = [0],
    onChange,
    onFinalChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    style,
    className,
}: SliderProps) {
    const { theme } = useTheme()
    const currentVal = value[0] ?? min

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextVal = Number(e.target.value)
        onChange?.({ value: [nextVal] })
    }

    const handleCommit = () => {
        onFinalChange?.({ value: [currentVal] })
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                ...style,
            }}
            className={className}
        >
            <input
                type='range'
                min={min}
                max={max}
                step={step}
                value={currentVal}
                disabled={disabled}
                onChange={handleChange}
                onMouseUp={handleCommit}
                onTouchEnd={handleCommit}
                onKeyUp={handleCommit}
                style={{
                    flex: 1,
                    accentColor: theme.colors.primary,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                }}
            />
            <span
                style={{
                    fontSize: '12px',
                    color: theme.colors.contentSecondary,
                    minWidth: '28px',
                    textAlign: 'right',
                    userSelect: 'none',
                }}
            >
                {currentVal}
            </span>
        </div>
    )
}
