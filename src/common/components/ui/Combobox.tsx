/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/common/hooks/useTheme'
import { Size } from './Input'

export interface ComboboxProps<T = any> {
    value?: string
    onChange?: (value: string, option: T | null) => void
    options: T[]
    mapOptionToString?: (option: T) => string
    mapOptionToNode?: (option: T) => React.ReactNode
    size?: Size
    disabled?: boolean
    placeholder?: string
    name?: string
    id?: string
    style?: React.CSSProperties
    className?: string
}

export function Combobox<T = any>({
    value = '',
    onChange,
    options = [],
    mapOptionToString = (opt: any) => (typeof opt === 'string' ? opt : (opt?.label ?? opt?.id ?? String(opt))),
    mapOptionToNode,
    size = 'default',
    disabled = false,
    placeholder = '',
    name,
    id,
    style,
    className,
}: ComboboxProps<T>) {
    const { theme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            const path = e.composedPath ? e.composedPath() : []
            const isInside =
                path.includes(containerRef.current!) ||
                (dropdownRef.current && path.includes(dropdownRef.current)) ||
                containerRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)

            if (!isInside) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
        }
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setIsOpen(true)
        onChange?.(val, null)
    }

    const handleSelectOption = (option: T, e?: React.SyntheticEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        const str = mapOptionToString(option)
        onChange?.(str, option)
        setIsOpen(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true)
            return
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                handleSelectOption(options[highlightedIndex])
            } else if (value && options.some((opt) => mapOptionToString(opt) === value)) {
                const currentOpt = options.find((opt) => mapOptionToString(opt) === value)
                if (currentOpt) {
                    handleSelectOption(currentOpt)
                } else {
                    setIsOpen(false)
                }
            } else if (options.length > 0) {
                handleSelectOption(options[0])
            } else {
                setIsOpen(false)
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false)
        }
    }

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

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                display: 'inline-block',
                width: '100%',
                boxSizing: 'border-box',
                ...style,
            }}
            className={className}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    height,
                    padding,
                    fontSize,
                    borderRadius: '6px',
                    border: `1px solid ${isOpen ? theme.colors.borderSelected : theme.colors.borderOpaque}`,
                    backgroundColor: disabled ? theme.colors.backgroundStateDisabled : theme.colors.backgroundSecondary,
                    color: disabled ? theme.colors.contentStateDisabled : theme.colors.contentPrimary,
                }}
            >
                <input
                    ref={inputRef}
                    id={id}
                    name={name}
                    value={value}
                    disabled={disabled}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    style={{
                        flex: 1,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'inherit',
                        fontSize,
                        padding: 0,
                    }}
                />
            </div>

            {isOpen && options.length > 0 && (
                <div
                    ref={dropdownRef}
                    role='listbox'
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        marginTop: '4px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        backgroundColor: theme.colors.backgroundPrimary,
                        border: `1px solid ${theme.colors.borderOpaque}`,
                        borderRadius: '6px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                        boxSizing: 'border-box',
                    }}
                >
                    {options.map((opt, idx) => {
                        const str = mapOptionToString(opt)
                        const isHighlighted = idx === highlightedIndex
                        return (
                            <div
                                key={str + idx}
                                role='option'
                                aria-selected={isHighlighted}
                                onClick={(e) => handleSelectOption(opt, e)}
                                style={{
                                    padding: '8px 12px',
                                    fontSize,
                                    cursor: 'pointer',
                                    backgroundColor: isHighlighted ? theme.colors.backgroundTertiary : 'transparent',
                                    color: theme.colors.contentPrimary,
                                }}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                            >
                                {mapOptionToNode ? mapOptionToNode(opt) : str}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
