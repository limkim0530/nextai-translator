import '../enable-dev-hmr'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Translator } from '../../common/components/Translator'
import '../../common/i18n.js'
import './index.css'
import { useTheme } from '../../common/hooks/useTheme'

const root = createRoot(document.getElementById('root') as HTMLElement)

function App() {
    const { theme } = useTheme()

    useEffect(() => {
        document.documentElement.style.backgroundColor = theme.colors.backgroundPrimary
        document.body.style.backgroundColor = theme.colors.backgroundPrimary
    }, [theme.colors.backgroundPrimary])

    return (
        <div
            style={{
                position: 'relative',
                height: '100%',
                background: theme.colors.backgroundPrimary,
            }}
            data-testid='popup-container'
        >
            <Translator showSettingsIcon defaultShowSettings autoFocus openSource='popup' />
        </div>
    )
}

root.render(<App />)
