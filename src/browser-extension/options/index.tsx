import '../enable-dev-hmr'
import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Settings } from '../../common/components/Settings'
import '../../common/i18n.js'
import './index.css'
import { createUseStyles } from '@/common/styles'
import { IThemedStyleProps } from '../../common/types'
import { useTheme } from '../../common/hooks/useTheme'

const useStyles = createUseStyles({
    root: (props: IThemedStyleProps) => ({
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: props.theme.colors.backgroundSecondary,
        minHeight: '100vh',
    }),
    container: {
        width: '100%',
        maxWidth: '768px',
        height: '100%',
    },
})

const Options = () => {
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__IS_OT_BROWSER_EXTENSION_OPTIONS__ = true

    useEffect(() => {
        document.documentElement.style.backgroundColor = theme.colors.backgroundSecondary
        document.body.style.backgroundColor = theme.colors.backgroundSecondary
    }, [theme.colors.backgroundSecondary])

    return (
        <div className={styles.root}>
            <div className={styles.container}>
                <Settings />
            </div>
        </div>
    )
}

const root = createRoot(document.getElementById('root') as HTMLElement)

root.render(
    <React.StrictMode>
        <Options />
    </React.StrictMode>
)
