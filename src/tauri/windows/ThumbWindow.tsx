import icon from '@/common/assets/images/icon.png'
import { useTheme } from '@/common/hooks/useTheme'
export function ThumbWindow() {
    const { theme } = useTheme()

    return (
        <div
            className='thumb'
            style={{
                background: theme.colors.backgroundPrimary,
            }}
        >
            <img
                draggable={false}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                }}
                src={icon}
            />
        </div>
    )
}
