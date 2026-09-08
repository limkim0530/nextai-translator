/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { useTheme } from '@/common/hooks/useTheme'

export interface MenuItem {
    id?: string | number
    label?: React.ReactNode
    disabled?: boolean
    [key: string]: any
}

export interface StatefulMenuProps {
    items: MenuItem[]
    onItemSelect?: (params: { item: MenuItem; event?: any }) => void
    initialState?: {
        highlightedIndex?: number
    }
    overrides?: any
}

export function StatefulMenu({ items = [], onItemSelect }: StatefulMenuProps) {
    const { theme } = useTheme()

    return (
        <div
            style={{
                minWidth: '160px',
                padding: '4px 0',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: theme.colors.backgroundPrimary,
                color: theme.colors.contentPrimary,
            }}
        >
            {items.map((item, index) => {
                return (
                    <div
                        key={item.id ?? index}
                        onClick={(e) => {
                            if (!item.disabled) {
                                onItemSelect?.({ item, event: e })
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            cursor: item.disabled ? 'not-allowed' : 'pointer',
                            opacity: item.disabled ? 0.4 : 1,
                            transition: 'background-color 0.1s ease',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        onMouseEnter={(e) => {
                            if (!item.disabled) {
                                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!item.disabled) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                            }
                        }}
                    >
                        {item.label}
                    </div>
                )
            })}
        </div>
    )
}

export const Menu = StatefulMenu
