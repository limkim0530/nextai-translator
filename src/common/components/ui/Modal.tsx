/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react'
import { useTheme } from '@/common/hooks/useTheme'
import { Button, ButtonProps } from './Button'
import { MdClose } from 'react-icons/md'

export const ROLE = {
    dialog: 'dialog',
    alertdialog: 'alertdialog',
} as const

export const MODAL_SIZE = {
    default: 'default',
    full: 'full',
    auto: 'auto',
} as const

export interface ModalProps {
    isOpen?: boolean
    onClose?: (args?: any) => void
    closeable?: boolean
    children?: React.ReactNode
    animate?: boolean
    role?: string
    size?: string
    autoFocus?: boolean
    overrides?: any
}

export function Modal({
    isOpen = false,
    onClose,
    closeable = true,
    children,
    role = 'dialog',
    size = 'default',
    overrides,
}: ModalProps) {
    const { theme } = useTheme()

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose) {
                onClose({ source: 'escape' })
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const dialogOverride =
        typeof overrides?.Dialog?.style === 'function'
            ? overrides.Dialog.style({ $theme: theme })
            : overrides?.Dialog?.style || {}

    const defaultDialogWidth =
        size === 'full' ? '100vw' : size === 'auto' ? 'auto' : size === 'compact' ? '420px' : '560px'
    const defaultDialogHeight = size === 'full' ? '100vh' : undefined
    const defaultMinWidth = size === 'auto' || size === 'full' ? undefined : '360px'

    return (
        <div
            role={role}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) {
                    onClose({ source: 'backdrop' })
                }
            }}
        >
            <div
                style={{
                    backgroundColor: theme.colors.backgroundPrimary,
                    color: theme.colors.contentPrimary,
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
                    width: defaultDialogWidth,
                    minWidth: defaultMinWidth,
                    height: defaultDialogHeight,
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    ...dialogOverride,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {closeable && onClose && (
                    <button
                        type='button'
                        onClick={() => onClose({ source: 'close' })}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: theme.colors.contentTertiary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            zIndex: 1,
                        }}
                    >
                        <MdClose size={18} />
                    </button>
                )}
                {children}
            </div>
        </div>
    )
}

export function ModalHeader({
    children,
    style,
    className,
}: {
    children?: React.ReactNode
    style?: React.CSSProperties
    className?: string
}) {
    return (
        <div
            style={{
                padding: '16px 20px',
                fontSize: '16px',
                fontWeight: 600,
                borderBottom: '1px solid rgba(128, 128, 128, 0.15)',
                ...style,
            }}
            className={className}
        >
            {children}
        </div>
    )
}

export function ModalBody({
    children,
    style,
    className,
}: {
    children?: React.ReactNode
    style?: React.CSSProperties
    className?: string
}) {
    return (
        <div
            style={{
                padding: '16px 20px',
                overflowY: 'auto',
                flex: 1,
                fontSize: '14px',
                lineHeight: 1.5,
                ...style,
            }}
            className={className}
        >
            {children}
        </div>
    )
}

export function ModalFooter({
    children,
    style,
    className,
}: {
    children?: React.ReactNode
    style?: React.CSSProperties
    className?: string
}) {
    return (
        <div
            style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                borderTop: '1px solid rgba(128, 128, 128, 0.15)',
                ...style,
            }}
            className={className}
        >
            {children}
        </div>
    )
}

export function ModalButton(props: ButtonProps) {
    return <Button {...props} />
}
