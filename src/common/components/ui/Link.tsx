/* eslint-disable react/prop-types */
import React from 'react'
import { useTheme } from '@/common/hooks/useTheme'

export function StyledLink({ children, style, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    const { theme } = useTheme()
    return (
        <a
            style={{
                color: theme.colors.linkText ?? theme.colors.primary,
                textDecoration: 'none',
                cursor: 'pointer',
                ...style,
            }}
            onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'
            }}
            onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'
            }}
            {...rest}
        >
            {children}
        </a>
    )
}
