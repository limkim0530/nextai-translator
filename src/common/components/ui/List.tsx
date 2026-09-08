/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react'
import { MdDragIndicator } from 'react-icons/md'
import { useTheme } from '@/common/hooks/useTheme'

export function arrayMove<T>(array: T[], from: number, to: number): T[] {
    const copy = [...array]
    const [item] = copy.splice(from, 1)
    copy.splice(to, 0, item)
    return copy
}

export interface ListProps {
    items?: React.ReactNode[]
    onChange?: (params: { oldIndex: number; newIndex: number }) => void
    overrides?: {
        Item?: {
            style?: React.CSSProperties | ((props: any) => React.CSSProperties)
        }
        Root?: {
            style?: React.CSSProperties | ((props: any) => React.CSSProperties)
        }
    }
    style?: React.CSSProperties
    className?: string
}

export function List({ items = [], onChange, overrides, style, className }: ListProps) {
    const { theme } = useTheme()
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [overIndex, setOverIndex] = useState<number | null>(null)

    let itemStyle: React.CSSProperties = {}
    if (overrides?.Item?.style) {
        itemStyle = typeof overrides.Item.style === 'function' ? overrides.Item.style({}) : overrides.Item.style
    }

    let rootStyle: React.CSSProperties = {}
    if (overrides?.Root?.style) {
        rootStyle = typeof overrides.Root.style === 'function' ? overrides.Root.style({}) : overrides.Root.style
    }

    const isDraggable = Boolean(onChange)

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style, ...rootStyle }}
            className={className}
        >
            {items.map((item, idx) => {
                const isDragging = dragIndex === idx
                const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx

                return (
                    <div
                        key={idx}
                        draggable={isDraggable}
                        onDragStart={(e) => {
                            if (!isDraggable) return
                            setDragIndex(idx)
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', String(idx))
                        }}
                        onDragOver={(e) => {
                            if (!isDraggable || dragIndex === null) return
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            if (overIndex !== idx) {
                                setOverIndex(idx)
                            }
                        }}
                        onDragLeave={(e) => {
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return
                            if (overIndex === idx) {
                                setOverIndex(null)
                            }
                        }}
                        onDrop={(e) => {
                            if (!isDraggable) return
                            e.preventDefault()
                            const dataIndexStr = e.dataTransfer.getData('text/plain')
                            const fromIndex = dragIndex ?? (dataIndexStr !== '' ? Number(dataIndexStr) : null)
                            if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== idx) {
                                onChange?.({ oldIndex: fromIndex, newIndex: idx })
                            }
                            setDragIndex(null)
                            setOverIndex(null)
                        }}
                        onDragEnd={() => {
                            setDragIndex(null)
                            setOverIndex(null)
                        }}
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            opacity: isDragging ? 0.35 : 1,
                            borderTop:
                                isOver && dragIndex !== null && idx < dragIndex
                                    ? `2px solid ${theme.colors.accent}`
                                    : '2px solid transparent',
                            borderBottom:
                                isOver && dragIndex !== null && idx > dragIndex
                                    ? `2px solid ${theme.colors.accent}`
                                    : '2px solid transparent',
                            transition: 'opacity 0.15s ease, border-color 0.15s ease',
                            borderRadius: '6px',
                            ...itemStyle,
                        }}
                    >
                        {isDraggable && (
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'grab',
                                    color: theme.colors.contentTertiary,
                                    padding: '0 4px',
                                    flexShrink: 0,
                                    userSelect: 'none',
                                }}
                                title='Drag to reorder'
                            >
                                <MdDragIndicator size={18} />
                            </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>{item}</div>
                    </div>
                )
            })}
        </div>
    )
}
