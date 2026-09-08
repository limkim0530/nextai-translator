/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useInsertionEffect, useLayoutEffect, useMemo, useRef } from 'react'

// Targets for injecting styles: document.head by default, plus any registered ShadowRoots
const styleTargets = new Set<Node>()
const injectedRules = new Set<string>()

let headStyleElement: HTMLStyleElement | null = null

function getOrCreateHeadStyle(): HTMLStyleElement | null {
    if (typeof document === 'undefined') return null
    if (!headStyleElement || !document.head.contains(headStyleElement)) {
        headStyleElement = document.createElement('style')
        headStyleElement.setAttribute('data-nextai-styles', 'true')
        document.head.appendChild(headStyleElement)
    }
    return headStyleElement
}

/**
 * Register an additional target (such as a ShadowRoot) where styles must be mirrored.
 */
export function addStyleTarget(target: Node) {
    styleTargets.add(target)
    if (typeof document !== 'undefined') {
        const style = document.createElement('style')
        style.setAttribute('data-nextai-shadow-styles', 'true')
        style.textContent = Array.from(injectedRules).join('\n')
        target.appendChild(style)
    }
}

export function removeStyleTarget(target: Node) {
    styleTargets.delete(target)
}

function insertCss(cssText: string) {
    if (!cssText || injectedRules.has(cssText)) return
    injectedRules.add(cssText)

    if (typeof document === 'undefined') return

    const headStyle = getOrCreateHeadStyle()
    if (headStyle) {
        headStyle.appendChild(document.createTextNode(cssText + '\n'))
    }

    for (const target of styleTargets) {
        try {
            const shadowStyle = (target as HTMLElement).querySelector?.('style[data-nextai-shadow-styles]')
            if (shadowStyle) {
                shadowStyle.appendChild(document.createTextNode(cssText + '\n'))
            }
        } catch {
            // target might have been detached
        }
    }
}

const UNITLESS_PROPERTIES = new Set([
    'animationIterationCount',
    'borderImageOutset',
    'borderImageSlice',
    'borderImageWidth',
    'boxFlex',
    'boxFlexGroup',
    'boxOrdinalGroup',
    'columnCount',
    'columns',
    'flex',
    'flexGrow',
    'flexPositive',
    'flexShrink',
    'flexNegative',
    'flexOrder',
    'gridRow',
    'gridRowEnd',
    'gridRowSpan',
    'gridRowStart',
    'gridColumn',
    'gridColumnEnd',
    'gridColumnSpan',
    'gridColumnStart',
    'fontWeight',
    'lineClamp',
    'lineHeight',
    'opacity',
    'order',
    'orphans',
    'tabSize',
    'widows',
    'zIndex',
    'zoom',
    'fillOpacity',
    'floodOpacity',
    'stopOpacity',
    'strokeDasharray',
    'strokeDashoffset',
    'strokeMiterlimit',
    'strokeOpacity',
    'strokeWidth',
])

function camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

function hashString(str: string): string {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i)
    }
    return (hash >>> 0).toString(36)
}

function serializeDeclarations(obj: Record<string, any>, keyframeMap: Map<string, string>): string {
    const decls: string[] = []
    for (const [key, val] of Object.entries(obj)) {
        if (val === null || val === undefined || val === '') continue
        if (typeof val === 'object' && !Array.isArray(val)) continue // Nested rule, handled separately
        const kebabKey = camelToKebab(key)
        let formattedVal = val
        if (typeof val === 'number' && !UNITLESS_PROPERTIES.has(key)) {
            formattedVal = `${val}px`
        } else if (typeof val === 'string' && val.includes('$')) {
            // Replace $keyframeName with scoped keyframe name
            formattedVal = val.replace(/\$([a-zA-Z0-9_-]+)/g, (_, name) => keyframeMap.get(name) || name)
        }
        decls.push(`${kebabKey}:${formattedVal};`)
    }
    return decls.join('')
}

function compileRule(
    selector: string,
    ruleObj: Record<string, any>,
    keyframeMap: Map<string, string>,
    outputCss: string[],
    classMap?: Map<string, string>
) {
    const baseDecls = serializeDeclarations(ruleObj, keyframeMap)
    if (baseDecls) {
        outputCss.push(`${selector}{${baseDecls}}`)
    }

    // Process nested rules and selectors
    for (const [key, val] of Object.entries(ruleObj)) {
        if (!val || typeof val !== 'object' || Array.isArray(val)) continue

        if (key.startsWith('@keyframes')) {
            continue // Handled separately
        } else if (key.startsWith('@media') || key.startsWith('@supports')) {
            const nested: string[] = []
            compileRule(selector, val, keyframeMap, nested, classMap)
            if (nested.length > 0) {
                outputCss.push(`${key}{${nested.join('')}}`)
            }
        } else {
            // Nested selector, e.g. '&:hover', '& path', '& > div', or sub-selectors
            const subSelectors = key.split(',').map((s) => s.trim())
            for (const sub of subSelectors) {
                let resolvedSelector = sub
                if (classMap && resolvedSelector.includes('$')) {
                    resolvedSelector = resolvedSelector.replace(/\$([a-zA-Z0-9_-]+)/g, (_, name) => {
                        const targetClass = classMap.get(name)
                        return targetClass ? `.${targetClass}` : name
                    })
                }
                if (resolvedSelector.includes('&')) {
                    resolvedSelector = resolvedSelector.replace(/&/g, selector)
                } else {
                    resolvedSelector = `${selector} ${resolvedSelector}`
                }
                compileRule(resolvedSelector, val, keyframeMap, outputCss, classMap)
            }
        }
    }
}

// React insertion hook fallback for jsdom / SSR
const useIsoEffect = typeof window !== 'undefined' ? (useInsertionEffect ?? useLayoutEffect) : useMemo

export type StyleDefinition<Props = any> = Record<
    string,
    React.CSSProperties | Record<string, any> | ((props: Props) => React.CSSProperties | Record<string, any>)
>

/**
 * Lightweight, zero-dependency createUseStyles drop-in replacement for react-jss.
 * Fully compatible with React 19, Shadow DOM, and Vitest.
 */
export function createUseStyles<Classes extends string = string, Props = any>(
    styles: Record<Classes, any> | ((theme: any) => Record<Classes, any>),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: any
) {
    return function useStyles(props?: Props): Record<Classes, string> {
        const rawStyles = typeof styles === 'function' ? styles(props) : styles

        const classes = useMemo(() => {
            const resultClasses = {} as Record<Classes, string>
            const cssBlocks: string[] = []
            const keyframeMap = new Map<string, string>()

            // First pass: collect keyframes
            for (const [ruleName, ruleDef] of Object.entries(rawStyles)) {
                if (ruleName.startsWith('@keyframes ')) {
                    const keyframeName = ruleName.replace('@keyframes ', '').trim()
                    const scopedKeyframe = `kf-${keyframeName}-${hashString(JSON.stringify(ruleDef))}`
                    keyframeMap.set(keyframeName, scopedKeyframe)

                    const evaluatedDef = typeof ruleDef === 'function' ? (ruleDef as any)(props) : ruleDef
                    const frameDecls: string[] = []
                    for (const [step, stepStyles] of Object.entries(evaluatedDef as Record<string, any>)) {
                        frameDecls.push(`${step}{${serializeDeclarations(stepStyles, keyframeMap)}}`)
                    }
                    cssBlocks.push(`@keyframes ${scopedKeyframe}{${frameDecls.join('')}}`)
                }
            }

            // Second pass: collect class names
            const classMap = new Map<string, string>()
            const evaluatedMap = new Map<string, any>()
            for (const [ruleName, ruleDef] of Object.entries(rawStyles)) {
                if (ruleName.startsWith('@keyframes')) continue

                const evaluatedDef = typeof ruleDef === 'function' ? (ruleDef as any)(props) : ruleDef
                if (!evaluatedDef || typeof evaluatedDef !== 'object') continue

                const hash = hashString(ruleName + JSON.stringify(evaluatedDef))
                const className = `nxt-${ruleName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${hash}`
                resultClasses[ruleName as Classes] = className
                classMap.set(ruleName, className)
                evaluatedMap.set(ruleName, evaluatedDef)
            }

            // Third pass: compile class rules with classMap for selector interpolation
            for (const [ruleName, evaluatedDef] of evaluatedMap.entries()) {
                const className = classMap.get(ruleName)!
                compileRule(`.${className}`, evaluatedDef, keyframeMap, cssBlocks, classMap)
            }

            const fullCss = cssBlocks.join('\n')
            return { resultClasses, fullCss }
        }, [rawStyles, props])

        const lastInjectedRef = useRef<string>('')
        useIsoEffect(() => {
            if (classes.fullCss && classes.fullCss !== lastInjectedRef.current) {
                lastInjectedRef.current = classes.fullCss
                insertCss(classes.fullCss)
            }
        }, [classes.fullCss])

        return classes.resultClasses
    }
}

/**
 * Drop-in no-op JssProvider for backwards compatibility
 */
export const JssProvider = ({ children }: { children?: React.ReactNode; [key: string]: any }) => {
    return children as React.ReactElement
}

export const createGenerateId = () => () => ''
export default createUseStyles
