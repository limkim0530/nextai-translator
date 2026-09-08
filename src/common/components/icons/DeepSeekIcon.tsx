import { IconBaseProps } from 'react-icons'
import Logo from '@/common/assets/images/deepseek.svg?react'
import { createUseStyles } from '@/common/styles'

const useStyles = createUseStyles({
    icon: {
        'display': 'block',
        '& path': {
            fill: 'currentColor',
        },
    },
})

export function DeepSeekIcon(props: IconBaseProps) {
    const styles = useStyles()
    return (
        <Logo
            className={styles.icon}
            height={props.size}
            width={typeof props.size === 'number' ? Math.round(props.size * (48.4 / 36.4)) : props.size}
            style={props.style}
        />
    )
}
