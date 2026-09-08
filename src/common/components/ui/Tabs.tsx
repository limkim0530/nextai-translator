/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Children, isValidElement } from 'react'
import { useTheme } from '@/common/hooks/useTheme'

export interface TabProps {
    title?: React.ReactNode
    key?: string | number
    artwork?: () => React.ReactNode
    overrides?: any
    children?: React.ReactNode
    disabled?: boolean
}

export const Tab: React.FC<TabProps> = () => null

export interface TabsProps {
    activeKey?: string | number
    onChange?: (params: { activeKey: string | number }) => void
    children?: React.ReactNode
    overrides?: any
    fill?: string
    renderAll?: boolean
}

export function Tabs({ activeKey, onChange, children, overrides }: TabsProps) {
    const { theme } = useTheme()

    const tabs: Array<{
        key: string | number
        title: React.ReactNode
        artwork?: () => React.ReactNode
        overrides?: any
        children?: React.ReactNode
        disabled?: boolean
    }> = []

    Children.forEach(children, (child) => {
        if (isValidElement(child)) {
            tabs.push({
                key: (child.key as string | number) ?? '',
                ...(child.props as any),
            })
        }
    })

    const rootOverride =
        typeof overrides?.Root?.style === 'function'
            ? overrides.Root.style({ $theme: theme })
            : overrides?.Root?.style || {}

    const tabListOverride =
        typeof overrides?.TabList?.style === 'function'
            ? overrides.TabList.style({ $theme: theme })
            : overrides?.TabList?.style || {}

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', ...rootOverride }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderBottom: `1px solid ${theme.colors.borderOpaque}`,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    ...tabListOverride,
                }}
            >
                {tabs.map((tab) => {
                    const isActive = tab.key === activeKey
                    const tabOverride =
                        typeof tab.overrides?.Tab?.style === 'function'
                            ? tab.overrides.Tab.style({ $theme: theme, $isActive: isActive })
                            : tab.overrides?.Tab?.style || {}

                    return (
                        <button
                            key={String(tab.key)}
                            type='button'
                            disabled={tab.disabled}
                            onClick={() => onChange?.({ activeKey: tab.key })}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                fontSize: '13px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? theme.colors.contentAccent : theme.colors.contentSecondary,
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isActive ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
                                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                                outline: 'none',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                                ...tabOverride,
                            }}
                            {...(tab.overrides?.Tab?.props || {})}
                        >
                            {tab.artwork && (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        lineHeight: 1,
                                        flexShrink: 0,
                                    }}
                                >
                                    {tab.artwork()}
                                </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
                                {tab.title}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export function StyledTabList(props: any) {
    return <div {...props} />
}

export function StyledTabPanel(props: any) {
    return <div {...props} />
}
