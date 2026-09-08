/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '@/common/hooks/useTheme'
import { SIZE } from './constants'
import { MdArrowDropDown, MdClose } from 'react-icons/md'

export { SIZE }

export interface Option {
    id?: string | number
    label?: React.ReactNode
    [key: string]: any
}

export type Value = Option[]

export const TYPE = {
    select: 'select',
    search: 'search',
} as const

export interface SelectProps {
    options?: Option[]
    value?: Value
    onChange?: (params: { value: Value; option?: Option; type?: string }) => void
    onBlur?: (e?: any) => void
    clearable?: boolean
    searchable?: boolean
    disabled?: boolean
    size?: keyof typeof SIZE | 'mini' | 'compact' | 'default' | 'large'
    placeholder?: any
    labelKey?: string
    valueKey?: string
    multi?: boolean
    filterOptions?: (options: Option[], filterValue: string) => Option[]
    mountNode?: HTMLElement
    overrides?: any
    type?: string
    backspaceRemoves?: boolean
    closeOnSelect?: boolean
    creatable?: boolean
    isLoading?: boolean
    autoFocus?: boolean
    error?: boolean
    getOptionLabel?: (params: { option: any }) => React.ReactNode
    getValueLabel?: (params: { option: any }) => React.ReactNode
    style?: React.CSSProperties
    className?: string
    id?: string
}

export function Select({
    options = [],
    value = [],
    onChange,
    onBlur,
    clearable = false,
    searchable = true,
    disabled = false,
    size = 'default',
    placeholder = 'Select...',
    labelKey = 'label',
    valueKey = 'id',
    multi = false,
    filterOptions,
    overrides,
    closeOnSelect = true,
    creatable = false,
    isLoading = false,
    autoFocus = false,
    error = false,
    getOptionLabel,
    getValueLabel,
    style,
    className,
    id,
}: SelectProps) {
    const { theme } = useTheme()
    const [isOpen, setIsOpen] = useState(autoFocus)
    const [searchQuery, setSearchQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const isSameId = useCallback((a: any, b: any) => {
        if (a === undefined || a === null || b === undefined || b === null) {
            return false
        }
        return a === b || String(a) === String(b)
    }, [])

    const getOptionId = useCallback((opt: Option) => (opt ? (opt[valueKey] ?? opt.id) : undefined), [valueKey])

    const resolveOption = useCallback(
        (opt: Option): Option => {
            if (!opt) return opt
            const rawOpt = typeof opt === 'object' ? opt : ({ id: opt, [valueKey]: opt } as Option)
            const optId = getOptionId(rawOpt)
            const matched = options.find((candidate) => isSameId(getOptionId(candidate), optId))
            if (matched) {
                const optLabel = rawOpt[labelKey] ?? rawOpt.label
                const matchedLabel = matched[labelKey] ?? matched.label
                const resolvedLabel =
                    optLabel !== undefined && !isSameId(optLabel, optId)
                        ? optLabel
                        : (matchedLabel ?? optLabel ?? optId)

                return {
                    ...matched,
                    ...rawOpt,
                    [labelKey]: resolvedLabel,
                    label: resolvedLabel,
                }
            }
            return rawOpt
        },
        [options, getOptionId, isSameId, labelKey, valueKey]
    )

    const resolveOptionLabel = useCallback(
        (opt: Option) => {
            if (getOptionLabel) {
                return getOptionLabel({ option: opt })
            }
            return opt[labelKey] ?? opt.label ?? opt.id
        },
        [getOptionLabel, labelKey]
    )

    const resolveValueLabel = useCallback(
        (opt: Option) => {
            if (getValueLabel) {
                return getValueLabel({ option: opt })
            }
            return resolveOptionLabel(opt)
        },
        [getValueLabel, resolveOptionLabel]
    )

    const normalizedValue: Option[] = useMemo(() => {
        if (!value) return []
        const list = Array.isArray(value) ? value : [value]
        return list.filter((item) => item !== undefined && item !== null).map((v) => resolveOption(v))
    }, [value, resolveOption])

    // Close on click outside (handling Shadow DOM via composedPath)
    const handleClickOutside = useCallback(
        (e: MouseEvent) => {
            const path = e.composedPath ? e.composedPath() : []
            const isInside =
                (containerRef.current && path.includes(containerRef.current)) ||
                containerRef.current?.contains(e.target as Node)
            if (!isInside) {
                if (isOpen) {
                    setIsOpen(false)
                    onBlur?.()
                }
            }
        },
        [isOpen, onBlur]
    )

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
            }
        }
    }, [isOpen, handleClickOutside])

    const handleSelect = (opt: Option) => {
        const optId = getOptionId(opt)
        const effectiveOpt = opt.__isNew__
            ? {
                  id: optId,
                  label: optId,
                  [valueKey]: optId,
                  [labelKey]: optId,
              }
            : opt
        let nextValue: Value

        if (multi) {
            const exists = normalizedValue.some((v) => isSameId(getOptionId(v), optId))
            if (exists) {
                nextValue = normalizedValue.filter((v) => !isSameId(getOptionId(v), optId))
            } else {
                nextValue = [...normalizedValue, effectiveOpt]
            }
        } else {
            nextValue = [effectiveOpt]
        }

        onChange?.({ value: nextValue, option: effectiveOpt })
        if (closeOnSelect && !multi) {
            setIsOpen(false)
            setSearchQuery('')
        }
    }

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onChange?.({ value: [], type: 'clear' })
    }

    // Filter options
    const filteredOptions = useMemo(() => {
        if (filterOptions) {
            return filterOptions(options, searchQuery)
        }
        if (!searchQuery) {
            return options
        }
        const q = searchQuery.toLowerCase()
        const getSearchableText = (opt: Option): string => {
            const raw = opt[labelKey] ?? opt.label ?? opt.name ?? opt.id ?? ''
            if (typeof raw === 'string' || typeof raw === 'number') {
                return String(raw)
            }
            return String(opt.id ?? '')
        }
        return options.filter((opt) => {
            const labelText = getSearchableText(opt).toLowerCase()
            const optId = String(getOptionId(opt) ?? '').toLowerCase()
            return labelText.includes(q) || optId.includes(q)
        })
    }, [options, filterOptions, searchQuery, labelKey, getOptionId])

    const hasExactMatch = useMemo(() => {
        if (!searchQuery.trim()) return false
        const q = searchQuery.trim().toLowerCase()
        return options.some((opt) => {
            const optId = String(getOptionId(opt) ?? '').toLowerCase()
            const label = String(opt[labelKey] ?? opt.label ?? '').toLowerCase()
            return optId === q || label === q
        })
    }, [options, searchQuery, getOptionId, labelKey])

    const displayOptions = useMemo(() => {
        if (creatable && searchQuery.trim() && !hasExactMatch) {
            const newOpt: Option = {
                id: searchQuery.trim(),
                label: `Create "${searchQuery.trim()}"`,
                [valueKey]: searchQuery.trim(),
                [labelKey]: `Create "${searchQuery.trim()}"`,
                __isNew__: true,
            }
            return [...filteredOptions, newOpt]
        }
        return filteredOptions
    }, [creatable, searchQuery, hasExactMatch, filteredOptions, valueKey, labelKey])

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

    const selectedOption = normalizedValue[0]
    const displayText = selectedOption ? resolveValueLabel(selectedOption) : null

    const rootOverride =
        typeof overrides?.Root?.style === 'function'
            ? overrides.Root.style({ $theme: theme, $isOpen: isOpen, $disabled: disabled, $size: size })
            : overrides?.Root?.style || {}

    return (
        <div
            ref={containerRef}
            id={id}
            data-baseweb='select'
            style={{
                position: 'relative',
                display: 'inline-block',
                width: '100%',
                boxSizing: 'border-box',
                ...rootOverride,
                ...style,
            }}
            className={className}
        >
            <div
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen)
                        if (!isOpen && searchable) {
                            setTimeout(() => inputRef.current?.focus(), 0)
                        }
                    }
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    height,
                    padding,
                    fontSize,
                    borderRadius: '6px',
                    border: `1px solid ${error ? theme.colors.borderNegative : isOpen ? theme.colors.borderSelected : theme.colors.borderOpaque}`,
                    backgroundColor: disabled ? theme.colors.backgroundStateDisabled : theme.colors.backgroundSecondary,
                    color: disabled ? theme.colors.contentStateDisabled : theme.colors.contentPrimary,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    userSelect: 'none',
                    gap: '6px',
                }}
            >
                <div
                    style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {multi && normalizedValue.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {normalizedValue.map((v) => (
                                <span
                                    key={String(getOptionId(v))}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: theme.colors.backgroundTertiary,
                                        fontSize: '11px',
                                    }}
                                >
                                    {resolveValueLabel(v)}
                                </span>
                            ))}
                        </div>
                    ) : displayText ? (
                        displayText
                    ) : (
                        <span style={{ color: theme.colors.contentTertiary }}>{placeholder}</span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isLoading && (
                        <svg
                            style={{
                                animation: 'spin 1s linear infinite',
                                width: 14,
                                height: 14,
                            }}
                            viewBox='0 0 24 24'
                            fill='none'
                        >
                            <circle
                                cx='12'
                                cy='12'
                                r='10'
                                stroke='currentColor'
                                strokeWidth='3'
                                strokeDasharray='30 60'
                            />
                        </svg>
                    )}
                    {clearable && !disabled && normalizedValue.length > 0 && (
                        <span
                            onClick={handleClear}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                color: theme.colors.contentTertiary,
                            }}
                        >
                            <MdClose size={14} />
                        </span>
                    )}
                    <span
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'transform 0.15s ease',
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            color: theme.colors.contentSecondary,
                        }}
                    >
                        <MdArrowDropDown size={18} />
                    </span>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    role='listbox'
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        zIndex: 9999,
                        maxHeight: '260px',
                        overflowY: 'auto',
                        backgroundColor: theme.colors.backgroundPrimary,
                        border: `1px solid ${theme.colors.borderOpaque}`,
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        padding: '4px 0',
                    }}
                >
                    {searchable && (
                        <div style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.colors.borderOpaque}` }}>
                            <input
                                ref={inputRef}
                                type='text'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (displayOptions.length > 0) {
                                            handleSelect(displayOptions[0])
                                        } else if (creatable && searchQuery.trim()) {
                                            handleSelect({
                                                id: searchQuery.trim(),
                                                label: searchQuery.trim(),
                                                [valueKey]: searchQuery.trim(),
                                                [labelKey]: searchQuery.trim(),
                                            })
                                        }
                                    }
                                }}
                                placeholder='Search...'
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    border: `1px solid ${theme.colors.borderOpaque}`,
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    outline: 'none',
                                    backgroundColor: theme.colors.backgroundSecondary,
                                    color: theme.colors.contentPrimary,
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    )}

                    {displayOptions.length === 0 ? (
                        <div
                            style={{
                                padding: '8px 12px',
                                color: theme.colors.contentTertiary,
                                fontSize: '12px',
                                textAlign: 'center',
                            }}
                        >
                            No options
                        </div>
                    ) : (
                        displayOptions.map((opt) => {
                            const optId = getOptionId(opt)
                            const isSelected = normalizedValue.some((v) => isSameId(getOptionId(v), optId))

                            return (
                                <div
                                    key={String(optId)}
                                    role='option'
                                    aria-selected={isSelected}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleSelect(opt)
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize,
                                        cursor: 'pointer',
                                        backgroundColor: isSelected
                                            ? theme.colors.backgroundLightAccent
                                            : 'transparent',
                                        color: isSelected ? theme.colors.contentAccent : theme.colors.contentPrimary,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'background-color 0.1s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = 'transparent'
                                        }
                                    }}
                                >
                                    <span>{resolveOptionLabel(opt)}</span>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
