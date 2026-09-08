/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { forwardRef, useState } from 'react'
import { useTheme } from '@/common/hooks/useTheme'
import { SIZE } from './constants'

export { SIZE }

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    size?: any
    error?: boolean
    positive?: boolean
    resize?: any
    inputRef?: React.Ref<HTMLTextAreaElement>
    overrides?: any
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    {
        size = 'default',
        error = false,
        positive = false,
        resize = 'vertical',
        inputRef,
        overrides,
        disabled = false,
        value,
        onChange,
        onFocus,
        onBlur,
        style,
        className,
        rows = 3,
        ...rest
    },
    ref
) {
    const { theme } = useTheme()
    const [isFocused, setIsFocused] = useState(false)

    let fontSize = '13px'
    let padding = '8px 10px'

    if (size === 'mini') {
        fontSize = '11px'
        padding = '4px 6px'
    } else if (size === 'compact') {
        fontSize = '12px'
        padding = '6px 8px'
    } else if (size === 'large') {
        fontSize = '15px'
        padding = '12px 14px'
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
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: '6px',
        border: `1px solid ${borderColor}`,
        backgroundColor: disabled ? theme.colors.backgroundStateDisabled : theme.colors.backgroundPrimary,
        color: disabled ? theme.colors.contentStateDisabled : theme.colors.contentPrimary,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        boxShadow: isFocused ? `0 0 0 1px ${borderColor}` : 'none',
        ...style,
    }

    const textareaElementStyle: React.CSSProperties = {
        width: '100%',
        minHeight: '100%',
        border: 'none',
        outline: 'none',
        padding,
        margin: 0,
        fontSize,
        fontFamily: 'inherit',
        backgroundColor: 'transparent',
        color: 'inherit',
        boxSizing: 'border-box',
        resize: typeof resize === 'string' ? (resize as any) : 'vertical',
        lineHeight: 1.5,
    }

    const rootOverride =
        typeof overrides?.Root?.style === 'function'
            ? overrides.Root.style({ $theme: theme, $isFocused: isFocused, $error: error, $size: size })
            : overrides?.Root?.style || {}

    const containerOverride =
        typeof overrides?.InputContainer?.style === 'function'
            ? overrides.InputContainer.style({ $theme: theme, $isFocused: isFocused, $error: error, $size: size })
            : overrides?.InputContainer?.style || {}

    const inputOverride =
        typeof overrides?.Input?.style === 'function'
            ? overrides.Input.style({ $theme: theme, $isFocused: isFocused, $error: error, $size: size })
            : overrides?.Input?.style || {}

    const setRefs = (node: HTMLTextAreaElement | null) => {
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
        if (typeof inputRef === 'function') inputRef(node)
        else if (inputRef) (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
    }

    return (
        <div style={{ ...containerStyle, ...rootOverride, ...containerOverride }} className={className}>
            <textarea
                ref={setRefs}
                rows={rows}
                value={value ?? ''}
                disabled={disabled}
                onChange={onChange}
                style={{ ...textareaElementStyle, ...inputOverride }}
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
        </div>
    )
})
