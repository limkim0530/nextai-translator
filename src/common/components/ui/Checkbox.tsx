/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { useTheme } from '@/common/hooks/useTheme'

export const LABEL_PLACEMENT = {
    left: 'left',
    right: 'right',
} as const

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    checked?: boolean
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    labelPlacement?: keyof typeof LABEL_PLACEMENT | 'left' | 'right'
    checkmarkType?: any
    overrides?: any
}

export function Checkbox(props: CheckboxProps) {
    const {
        checked = false,
        onChange,
        onFocus,
        onBlur,
        disabled = false,
        labelPlacement = 'right',
        children,
        style,
        className,
        checkmarkType,
        overrides,
        ...rest
    } = props
    void checkmarkType
    void overrides

    const { theme } = useTheme()
    const [isFocused, setIsFocused] = React.useState(false)

    const boxSize = 16
    const boxBg = checked ? theme.colors.primary : 'transparent'
    const boxBorder = checked ? theme.colors.primary : theme.colors.borderOpaque

    const box = (
        <div
            style={{
                width: `${boxSize}px`,
                height: `${boxSize}px`,
                minWidth: `${boxSize}px`,
                borderRadius: '4px',
                border: `1.5px solid ${boxBorder}`,
                backgroundColor: boxBg,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                outline: isFocused ? `2px solid ${theme.colors.accent}` : 'none',
                outlineOffset: '2px',
            }}
        >
            {checked && (
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#FFFFFF' strokeWidth='3'>
                    <polyline points='20 6 9 17 4 12' />
                </svg>
            )}
        </div>
    )

    return (
        <label
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                userSelect: 'none',
                gap: '8px',
                fontSize: '13px',
                color: theme.colors.contentPrimary,
                ...style,
            }}
            className={className}
        >
            <input
                type='checkbox'
                checked={checked}
                disabled={disabled}
                onChange={onChange}
                style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    borderWidth: 0,
                }}
                {...rest}
                onFocus={(e) => {
                    setIsFocused(true)
                    onFocus?.(e)
                }}
                onBlur={(e) => {
                    setIsFocused(false)
                    onBlur?.(e)
                }}
            />
            {labelPlacement === 'left' && children && <span>{children}</span>}
            {box}
            {labelPlacement === 'right' && children && <span>{children}</span>}
        </label>
    )
}
