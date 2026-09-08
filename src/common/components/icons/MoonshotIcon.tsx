import { IconBaseProps } from 'react-icons'
import Logo from '@/common/assets/images/moonshot.svg?react'
import { createUseStyles } from '@/common/styles'

const useStyles = createUseStyles({
    icon: {
        'display': 'block',
        '& path': {
            fill: 'currentColor',
        },
    },
})

export function MoonshotIcon(props: IconBaseProps) {
    const styles = useStyles()
    return <Logo className={styles.icon} width={props.size} height={props.size} style={props.style} />
}
