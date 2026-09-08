/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { forwardRef, useState } from 'react'
import { useTheme } from '@/common/hooks/useTheme'
import { MdClose } from 'react-icons/md'
import { SIZE } from './constants'

// export SIZE from constants

export type Size = keyof typeof SIZE | 'mini' | 'compact' | 'default' | 'large'
export type InputSize = keyof typeof SIZE | 'mini' | 'compact' | 'default' | 'large'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    size?: InputSize
    clearable?: boolean
    error?: boolean
    positive?: boolean
    startEnhancer?: React.ReactNode | (() => React.ReactNode)
    endEnhancer?: React.ReactNode | (() => React.ReactNode)
    inputRef?: React.Ref<HTMLInputElement>
    onClear?: () => void
    overrides?: any
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    {
        size = 'default',
        clearable = false,
        error = false,
        positive = false,
        startEnhancer,
        endEnhancer,
        inputRef,
        onClear,
        overrides,
        disabled = false,
        value,
        onChange,
        onFocus,
        onBlur,
        style,
        className,
        type = 'text',
        ...rest
    },
    ref
) {
    const { theme } = useTheme()
    const [isFocused, setIsFocused] = useState(false)

    let height = '36px'
    let fontSize = '13px'
    let padding = '0 10px'

    if (size === 'mini') {
        height = '24px'
        fontSize = '11px'
        padding = '0 6px'
    } else if (size === 'compact') {
        height = '30px'
        fontSize = '12px'
        padding = '0 8px'
    } else if (size === 'large') {
        height = '44px'
        fontSize = '15px'
        padding = '0 14px'
    }

    let borderColor = theme.colors.borderOpaque
    if (error) {
        borderColor = theme.colors.borderNegative
    } else if (positive) {
        borderColor = theme.colors.borderPositive
    } else if (isFocused) {
        borderColor = theme.colors.borderAccent
    }

    const containerStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        height,
        padding,
        boxSizing: 'border-box',
        borderRadius: '6px',
        border: `1px solid ${borderColor}`,
        backgroundColor: disabled ? theme.colors.backgroundStateDisabled : theme.colors.backgroundPrimary,
        color: disabled ? theme.colors.contentStateDisabled : theme.colors.contentPrimary,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        boxShadow: isFocused ? `0 0 0 1px ${borderColor}` : 'none',
        ...style,
    }

    const inputElementStyle: React.CSSProperties = {
        flex: 1,
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        padding: 0,
        margin: 0,
        fontSize,
        fontFamily: 'inherit',
        backgroundColor: 'transparent',
        color: 'inherit',
        boxSizing: 'border-box',
    }

    const rootOverride =
        typeof overrides?.Root?.style === 'function'
            ? overrides.Root.style({ $theme: theme, $isFocused: isFocused, $error: error, $size: size })
            : overrides?.Root?.style || {}

    const inputOverride =
        typeof overrides?.Input?.style === 'function'
            ? overrides.Input.style({ $theme: theme, $isFocused: isFocused, $error: error, $size: size })
            : overrides?.Input?.style || {}

    const renderEnhancer = (enhancer: React.ReactNode | (() => React.ReactNode)) => {
        if (typeof enhancer === 'function') {
            return enhancer()
        }
        return enhancer
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onClear?.()
        if (onChange) {
            const syntheticEvent = {
                target: { value: '' },
                currentTarget: { value: '' },
            } as React.ChangeEvent<HTMLInputElement>
            onChange(syntheticEvent)
        }
    }

    const showClear = clearable && !disabled && value !== undefined && value !== ''

    const setRefs = (node: HTMLInputElement | null) => {
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        if (typeof inputRef === 'function') inputRef(node)
        else if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
    }

    return (
        <div style={{ ...containerStyle, ...rootOverride }} className={className}>
            {startEnhancer && (
                <div style={{ marginRight: '6px', display: 'flex', alignItems: 'center' }}>
                    {renderEnhancer(startEnhancer)}
                </div>
            )}
            <input
                ref={setRefs}
                type={type}
                value={value ?? ''}
                disabled={disabled}
                onChange={onChange}
                style={{ ...inputElementStyle, ...inputOverride }}
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
            {showClear && (
                <div
                    onClick={handleClear}
                    style={{
                        marginLeft: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: theme.colors.contentTertiary,
                    }}
                >
                    <MdClose size={14} />
                </div>
            )}
            {endEnhancer && (
                <div style={{ marginLeft: '6px', display: 'flex', alignItems: 'center' }}>
                    {renderEnhancer(endEnhancer)}
                </div>
            )}
        </div>
    )
})
