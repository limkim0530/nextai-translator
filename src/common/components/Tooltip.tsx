import React from 'react'
import { StatefulTooltip, StatefulTooltipProps } from './ui/Tooltip'

export interface ITooltipProps extends StatefulTooltipProps {
    content: React.ReactNode
    onMouseEnterDelay?: number
}

const Tooltip = ({ content, children, ...props }: ITooltipProps) => {
    return (
        <StatefulTooltip
            content={<span style={{ pointerEvents: 'none', userSelect: 'none' }}>{content}</span>}
            accessibilityType={'tooltip'}
            showArrow
            {...props}
        >
            {children}
        </StatefulTooltip>
    )
}

export { Tooltip }
