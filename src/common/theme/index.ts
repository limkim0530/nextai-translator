/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext } from 'react'

export interface ThemeColors {
    // Backgrounds
    backgroundPrimary: string
    backgroundSecondary: string
    backgroundTertiary: string
    backgroundInversePrimary: string
    backgroundInverseSecondary: string
    backgroundLightAccent: string
    backgroundAlwaysDark: string
    backgroundAlwaysLight: string
    backgroundAccent: string
    backgroundNegative: string
    backgroundWarning: string
    backgroundPositive: string
    backgroundStateDisabled: string
    backgroundOverlay: string

    // Content (Text / Icons)
    contentPrimary: string
    contentSecondary: string
    contentTertiary: string
    contentInversePrimary: string
    contentInverseSecondary: string
    contentStateDisabled: string
    contentNegative: string
    contentWarning: string
    contentPositive: string
    contentAccent: string

    // Borders
    borderOpaque: string
    borderTransparent: string
    borderSelected: string
    borderInverseOpaque: string
    borderAccent: string
    borderNegative: string
    borderPositive: string
    borderWarning: string

    // Semantic / Actions
    positive: string
    primary: string
    linkText: string
    accent: string
    negative: string
    warning: string

    // Additional colors for compatibility
    [key: string]: string
}

export interface ThemeLighting {
    shadow400: string
    shadow500: string
    shadow600: string
    shadow700: string
    [key: string]: string
}

export interface ThemeSizing {
    scale0: string
    scale100: string
    scale200: string
    scale300: string
    scale400: string
    scale500: string
    scale600: string
    scale700: string
    scale800: string
    scale900: string
    scale1000: string
    scale1200: string
    scale1400: string
    scale1600: string
    [key: string]: string
}

export interface ThemeBorders {
    radius100: string
    radius200: string
    radius300: string
    radius400: string
    useRoundedCorners: boolean
    [key: string]: any
}

export interface Theme {
    name: 'light' | 'dark'
    colors: ThemeColors
    lighting: ThemeLighting
    sizing: ThemeSizing
    borders: ThemeBorders
    typography: Record<string, any>
    animation: Record<string, any>
    direction: 'auto' | 'ltr' | 'rtl'
}

const defaultSizing: ThemeSizing = {
    scale0: '0px',
    scale100: '4px',
    scale200: '8px',
    scale300: '12px',
    scale400: '14px',
    scale500: '16px',
    scale600: '20px',
    scale700: '24px',
    scale800: '28px',
    scale900: '32px',
    scale1000: '36px',
    scale1200: '40px',
    scale1400: '44px',
    scale1600: '48px',
}

const defaultBorders: ThemeBorders = {
    radius100: '2px',
    radius200: '4px',
    radius300: '8px',
    radius400: '12px',
    useRoundedCorners: true,
}

export const LightTheme: Theme = {
    name: 'light',
    colors: {
        backgroundPrimary: '#FFFFFF',
        backgroundSecondary: '#F6F6F6',
        backgroundTertiary: '#EEEEEE',
        backgroundInversePrimary: '#000000',
        backgroundInverseSecondary: '#161616',
        backgroundLightAccent: '#F3F6FD',
        backgroundAlwaysDark: '#161616',
        backgroundAlwaysLight: '#FFFFFF',
        backgroundAccent: '#276EF1',
        backgroundNegative: '#E11900',
        backgroundWarning: '#FFC043',
        backgroundPositive: '#048848',
        backgroundStateDisabled: '#F6F6F6',
        backgroundOverlay: 'rgba(0, 0, 0, 0.7)',

        contentPrimary: '#000000',
        contentSecondary: '#545454',
        contentTertiary: '#757575',
        contentInversePrimary: '#FFFFFF',
        contentInverseSecondary: '#F6F6F6',
        contentStateDisabled: '#AFAFAF',
        contentNegative: '#E11900',
        contentWarning: '#A06800',
        contentPositive: '#048848',
        contentAccent: '#276EF1',

        borderOpaque: '#E2E2E2',
        borderTransparent: 'rgba(0, 0, 0, 0.08)',
        borderSelected: '#000000',
        borderInverseOpaque: '#333333',
        borderAccent: '#276EF1',
        borderNegative: '#E11900',
        borderPositive: '#048848',
        borderWarning: '#FFC043',

        positive: '#048848',
        primary: '#276EF1',
        linkText: '#276EF1',
        accent: '#276EF1',
        negative: '#E11900',
        warning: '#A06800',
    },
    lighting: {
        shadow400: '0 1px 4px 0 rgba(0, 0, 0, 0.12)',
        shadow500: '0 2px 8px 0 rgba(0, 0, 0, 0.16)',
        shadow600: '0 4px 16px 0 rgba(0, 0, 0, 0.16)',
        shadow700: '0 8px 24px 0 rgba(0, 0, 0, 0.2)',
    },
    sizing: defaultSizing,
    borders: defaultBorders,
    typography: {},
    animation: {},
    direction: 'auto',
}

export const DarkTheme: Theme = {
    name: 'dark',
    colors: {
        backgroundPrimary: '#161616',
        backgroundSecondary: '#292929',
        backgroundTertiary: '#383838',
        backgroundInversePrimary: '#C4C4C4',
        backgroundInverseSecondary: '#ABABAB',
        backgroundLightAccent: '#182946',
        backgroundAlwaysDark: '#292929',
        backgroundAlwaysLight: '#DEDEDE',
        backgroundAccent: '#335BA3',
        backgroundNegative: '#A32C34',
        backgroundWarning: '#7A5616',
        backgroundPositive: '#306C44',
        backgroundStateDisabled: '#292929',
        backgroundOverlay: 'rgba(0, 0, 0, 0.7)',

        contentPrimary: '#DEDEDE',
        contentSecondary: '#C4C4C4',
        contentTertiary: '#ABABAB',
        contentInversePrimary: '#000000',
        contentInverseSecondary: '#383838',
        contentStateDisabled: '#5D5D5D',
        contentNegative: '#DE5B5D',
        contentWarning: '#AE8523',
        contentPositive: '#5C9D70',
        contentAccent: '#5E8BDB',

        borderOpaque: '#292929',
        borderTransparent: 'rgba(222, 222, 222, 0.08)',
        borderSelected: '#DEDEDE',
        borderInverseOpaque: '#484848',
        borderAccent: '#3F6EC5',
        borderNegative: '#C33840',
        borderPositive: '#3D8351',
        borderWarning: '#916C1A',

        positive: '#5C9D70',
        primary: '#5E8BDB',
        linkText: '#5E8BDB',
        accent: '#5E8BDB',
        negative: '#DE5B5D',
        warning: '#AE8523',
    },
    lighting: {
        shadow400: '0 1px 4px 0 rgba(0, 0, 0, 0.3)',
        shadow500: '0 2px 8px 0 rgba(0, 0, 0, 0.4)',
        shadow600: '0 4px 16px 0 rgba(0, 0, 0, 0.4)',
        shadow700: '0 8px 24px 0 rgba(0, 0, 0, 0.5)',
    },
    sizing: defaultSizing,
    borders: defaultBorders,
    typography: {},
    animation: {},
    direction: 'auto',
}

const ThemeContext = createContext<Theme>(LightTheme)

export const ThemeProvider = ({ theme, children }: { theme: Theme; children?: React.ReactNode }) => {
    return React.createElement(ThemeContext.Provider, { value: theme }, children)
}

export const useAppTheme = (): Theme => useContext(ThemeContext)

/**
 * Backwards compatibility wrapper for BaseProvider
 */
export const BaseProvider = ({
    theme = LightTheme,
    children,
}: {
    theme?: Theme
    zIndex?: number
    overrides?: any
    children?: React.ReactNode
}) => {
    return React.createElement(ThemeProvider, { theme }, children)
}
