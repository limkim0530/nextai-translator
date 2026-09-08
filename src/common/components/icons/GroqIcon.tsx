import { IconBaseProps } from 'react-icons'
import Logo from '@/common/assets/images/groq.svg?react'
import { createUseStyles } from '@/common/styles'

const useStyles = createUseStyles({
    icon: {
        'display': 'block',
        '& path': {
            fill: 'currentColor',
        },
    },
})

export function GroqIcon(props: IconBaseProps) {
    const styles = useStyles()
    return <Logo className={styles.icon} width={props.size} height={props.size} />
}
