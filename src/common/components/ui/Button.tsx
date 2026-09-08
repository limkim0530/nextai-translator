/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { forwardRef } from 'react'
import { useTheme } from '@/common/hooks/useTheme'
import { KIND, SIZE, SHAPE } from './constants'

// export KIND, SIZE, SHAPE from constants

export type ButtonKind = keyof typeof KIND | 'primary' | 'secondary' | 'tertiary' | 'minimal'
export type ButtonSize = keyof typeof SIZE | 'mini' | 'compact' | 'default' | 'large'
export type ButtonShape = keyof typeof SHAPE | 'default' | 'pill' | 'round' | 'circle' | 'square'

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    kind?: ButtonKind
    size?: ButtonSize
    shape?: ButtonShape
    isLoading?: boolean
    startEnhancer?: React.ReactNode | (() => React.ReactNode)
    endEnhancer?: React.ReactNode | (() => React.ReactNode)
    overrides?: any
    children?: any
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        kind = 'primary',
        size = 'default',
        shape = 'default',
        isLoading = false,
        disabled = false,
        startEnhancer,
        endEnhancer,
        overrides,
        children,
        style,
        className,
        type = 'button',
        ...rest
    },
    ref
) {
    const { theme } = useTheme()

    let padding = '10px 16px'
    let fontSize = '14px'
    let height = '36px'
    let iconSize = 16

    let gap = '6px'

    if (size === 'mini') {
        padding = '4px 8px'
        fontSize = '12px'
        height = '24px'
        iconSize = 12
        gap = '4px'
    } else if (size === 'compact') {
        padding = '6px 12px'
        fontSize = '13px'
        height = '30px'
        iconSize = 14
    } else if (size === 'large') {
        padding = '12px 20px'
        fontSize = '16px'
        height = '44px'
        iconSize = 18
    }

    let borderRadius = '6px'
    if (shape === 'pill' || shape === 'round' || shape === 'circle') {
        borderRadius = '9999px'
    } else if (shape === 'square') {
        borderRadius = '0px'
    }

    let bg = theme.colors.accent
    let color = '#ffffff'
    const border = 'none'

    if (kind === 'secondary') {
        bg = theme.colors.backgroundSecondary
        color = theme.colors.contentPrimary
    } else if (kind === 'tertiary') {
        bg = theme.colors.backgroundTertiary
        color = theme.colors.contentPrimary
    } else if (kind === 'minimal') {
        bg = 'transparent'
        color = theme.colors.contentPrimary
    }

    const baseStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        padding: shape === 'circle' || shape === 'square' ? '0' : padding,
        width: shape === 'circle' || shape === 'square' ? height : undefined,
        height,
        fontSize,
        fontWeight: 500,
        fontFamily: 'inherit',
        lineHeight: 1,
        borderRadius,
        border,
        backgroundColor: bg,
        color,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        userSelect: 'none',
        outline: 'none',
        boxSizing: 'border-box',
        verticalAlign: 'middle',
        textDecoration: 'none',
        ...style,
    }

    const overrideStyle =
        typeof overrides?.Root?.style === 'function'
            ? overrides.Root.style({
                  $theme: theme,
                  $size: size,
                  $kind: kind,
                  $isLoading: isLoading,
                  $disabled: disabled,
              })
            : typeof overrides?.BaseButton?.style === 'function'
              ? overrides.BaseButton.style({
                    $theme: theme,
                    $size: size,
                    $kind: kind,
                    $isLoading: isLoading,
                    $disabled: disabled,
                })
              : overrides?.Root?.style || overrides?.BaseButton?.style || {}

    const renderEnhancer = (enhancer: React.ReactNode | (() => React.ReactNode)) => {
        if (typeof enhancer === 'function') {
            return enhancer()
        }
        return enhancer
    }

    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || isLoading}
            style={{ ...baseStyle, ...overrideStyle }}
            className={className}
            {...rest}
        >
            {isLoading ? (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        lineHeight: 1,
                    }}
                >
                    <svg
                        style={{
                            animation: 'spin 1s linear infinite',
                            width: iconSize,
                            height: iconSize,
                        }}
                        viewBox='0 0 24 24'
                        fill='none'
                    >
                        <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' strokeDasharray='30 60' />
                    </svg>
                </span>
            ) : (
                startEnhancer && (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            lineHeight: 1,
                        }}
                    >
                        {renderEnhancer(startEnhancer)}
                    </span>
                )
            )}
            {typeof children === 'string' || typeof children === 'number' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{children}</span>
            ) : (
                children
            )}
            {!isLoading && endEnhancer && (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        lineHeight: 1,
                    }}
                >
                    {renderEnhancer(endEnhancer)}
                </span>
            )}
        </button>
    )
})
