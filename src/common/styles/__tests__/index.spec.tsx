import { describe, it, expect } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createUseStyles } from '../index'

describe('createUseStyles JSS selector replacement', () => {
    it('resolves $siblingRule in nested selectors', async () => {
        const useStyles = createUseStyles({
            parent: {
                'color': 'red',
                '&:hover $child': {
                    display: 'flex',
                },
            },
            child: {
                display: 'none',
            },
        })

        let classes!: Record<string, string>
        function TestComponent() {
            classes = useStyles()
            return (
                <div className={classes.parent}>
                    <span className={classes.child} />
                </div>
            )
        }

        const container = document.createElement('div')
        document.body.appendChild(container)

        await act(async () => {
            createRoot(container).render(<TestComponent />)
        })

        expect(classes.parent).toBeDefined()
        expect(classes.child).toBeDefined()

        const headStyles = document.head.querySelectorAll('style[data-nextai-styles]')
        let foundCombinedRule = false
        headStyles.forEach((styleTag) => {
            const content = styleTag.textContent || ''
            if (content.includes(`.${classes.parent}:hover .${classes.child}`) && content.includes('display:flex')) {
                foundCombinedRule = true
            }
        })

        expect(foundCombinedRule).toBe(true)
    })
})
