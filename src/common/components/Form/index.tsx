/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export interface FormInstance<S = any> {
    values: S
    setFieldsValue: (vals: Partial<S>) => void
    getFieldValue: (name: any) => any
    getFieldsValue: () => S
    submit: () => void
    submitHandler?: () => void
}

function getValue(obj: any, path: any): any {
    if (!obj || !path) return undefined
    const keys = Array.isArray(path) ? path : String(path).split('.')
    let curr = obj
    for (const k of keys) {
        if (curr === null || curr === undefined) return undefined
        curr = curr[k]
    }
    return curr
}

function setValue(obj: any, path: any, value: any): any {
    const keys = Array.isArray(path) ? path : String(path).split('.')
    const root = Array.isArray(obj) ? [...obj] : { ...obj }
    let curr = root
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        curr[k] =
            curr[k] !== null && curr[k] !== undefined
                ? Array.isArray(curr[k])
                    ? [...curr[k]]
                    : { ...curr[k] }
                : typeof keys[i + 1] === 'number'
                  ? []
                  : {}
        curr = curr[k]
    }
    curr[keys[keys.length - 1]] = value
    return root
}

function createChange(path: any, value: any): Record<string, any> {
    const keys = Array.isArray(path) ? path : String(path).split('.')
    if (keys.length === 1) {
        return { [keys[0]]: value }
    }
    const result: Record<string, any> = {}
    let curr = result
    for (let i = 0; i < keys.length - 1; i++) {
        curr[keys[i]] = {}
        curr = curr[keys[i]]
    }
    curr[keys[keys.length - 1]] = value
    return result
}

interface IFormContext {
    values: any
    setFieldValue: (name: any, value: any) => void
}

const FormContext = createContext<IFormContext>({
    values: {},
    setFieldValue: () => {},
})

export function useForm<S = any>(): [FormInstance<S>] {
    const formRef = useRef<FormInstance<S> | null>(null)
    if (!formRef.current) {
        formRef.current = {
            values: {} as S,
            setFieldsValue(vals: Partial<S>) {
                this.values = { ...this.values, ...vals }
            },
            getFieldValue(name: any) {
                return getValue(this.values, name)
            },
            getFieldsValue() {
                return this.values
            },
            submit() {
                this.submitHandler?.()
            },
        }
    }
    return [formRef.current]
}

export interface FormProps<S = any> {
    form?: FormInstance<S>
    initialValues?: S
    onValuesChange?: (changes: Partial<S>, values: S) => void
    onFinish?: (values: S) => void
    children?: React.ReactNode
    style?: React.CSSProperties
    className?: string
    autoComplete?: string
    autoCapitalize?: string
}

export function Form<S = any>({
    form,
    initialValues,
    onValuesChange,
    onFinish,
    children,
    style,
    className,
    autoComplete,
    autoCapitalize,
}: FormProps<S>) {
    const [currentValues, setCurrentValues] = useState<S>(initialValues ?? (form?.values as S) ?? ({} as S))

    useEffect(() => {
        if (initialValues) {
            setCurrentValues(initialValues)
            if (form) form.values = initialValues
        }
    }, [initialValues, form])

    const setFieldValue = useCallback(
        (name: any, val: any) => {
            setCurrentValues((prev) => {
                const next = setValue(prev, name, val)
                if (form) form.values = next
                const changes = createChange(name, val)
                onValuesChange?.(changes as Partial<S>, next)
                return next
            })
        },
        [form, onValuesChange]
    )

    const handleSubmit = useCallback(
        (e?: React.FormEvent) => {
            e?.preventDefault()
            e?.stopPropagation()
            onFinish?.(currentValues)
        },
        [currentValues, onFinish]
    )

    if (form) {
        form.submitHandler = handleSubmit
    }

    return (
        <FormContext.Provider value={{ values: currentValues, setFieldValue }}>
            <form
                onSubmit={handleSubmit}
                style={style}
                className={className}
                autoComplete={autoComplete}
                autoCapitalize={autoCapitalize}
            >
                {children}
            </form>
        </FormContext.Provider>
    )
}

export interface FormItemProps {
    name?: any
    label?: React.ReactNode
    caption?: React.ReactNode
    required?: boolean
    children?: React.ReactNode | ((values: any) => React.ReactNode)
    style?: React.CSSProperties
    className?: string
    deps?: any[]
    noStyle?: boolean
}

export function FormItem({ name, label, caption, required, children, style, className, noStyle }: FormItemProps) {
    const context = useContext(FormContext)

    if (typeof children === 'function') {
        return <>{children(context.values)}</>
    }

    let childNode = children
    if (React.isValidElement(children) && name !== undefined) {
        const fieldValue = getValue(context.values, name)
        const isCheckbox =
            typeof fieldValue === 'boolean' ||
            Boolean(
                children.props &&
                ('checked' in (children.props as Record<string, any>) ||
                    'checkmarkType' in (children.props as Record<string, any>))
            )

        const injectedProps: Record<string, any> = {
            onChange: (eOrVal: any) => {
                let val = eOrVal
                if (eOrVal && typeof eOrVal === 'object') {
                    if (eOrVal.target) {
                        val = eOrVal.target.type === 'checkbox' ? eOrVal.target.checked : eOrVal.target.value
                    } else if (eOrVal.currentTarget) {
                        val =
                            eOrVal.currentTarget.type === 'checkbox'
                                ? eOrVal.currentTarget.checked
                                : eOrVal.currentTarget.value
                    }
                }
                context.setFieldValue(name, val)
                ;(children.props as any)?.onChange?.(eOrVal)
            },
        }

        if (isCheckbox) {
            injectedProps.checked = Boolean(fieldValue)
            injectedProps.value = fieldValue ?? false
        } else if (fieldValue !== undefined) {
            injectedProps.value = fieldValue
        }

        childNode = React.cloneElement(children, injectedProps)
    }

    if (noStyle) {
        return <>{childNode}</>
    }

    const labelNode = label ? (
        <div
            style={{
                flexShrink: 0,
                padding: '0.25em 0',
                fontSize: '1.2em',
                fontWeight: 600,
                marginBottom: '4px',
            }}
        >
            {required && <span style={{ color: '#e53e3e', marginRight: 4 }}>*</span>}
            {label}
        </div>
    ) : null

    return (
        <div style={{ marginBottom: 14, ...style }} className={className}>
            {labelNode}
            {childNode}
            {caption && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{caption}</div>}
        </div>
    )
}

export function createForm<S = any>() {
    return {
        Form: Form as React.ComponentType<FormProps<S>>,
        FormItem: FormItem as React.ComponentType<FormItemProps>,
        useForm: useForm as () => [FormInstance<S>],
    }
}
