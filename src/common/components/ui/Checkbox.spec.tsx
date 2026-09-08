import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'
import { createForm } from '../Form'

// @ts-expect-error React 18 testing flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
})

const { Form, FormItem } = createForm<{
    alwaysShowIcons: boolean
    autoTranslate: boolean
}>()

function MyCheckbox({
    value,
    checked,
    onChange,
    onBlur,
}: {
    value?: boolean
    checked?: boolean
    onChange?: (val: boolean) => void
    onBlur?: () => void
}) {
    const isChecked = checked ?? value ?? false
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={isChecked}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

describe('Checkbox in Form', () => {
    it('echoes checked state correctly on initial render', async () => {
        await act(async () => {
            root.render(
                <Form initialValues={{ alwaysShowIcons: true, autoTranslate: false }}>
                    <FormItem name='alwaysShowIcons'>
                        <MyCheckbox />
                    </FormItem>
                    <FormItem name='autoTranslate'>
                        <MyCheckbox />
                    </FormItem>
                </Form>
            )
        })

        const inputs = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>
        expect(inputs.length).toBe(2)
        // alwaysShowIcons is true
        expect(inputs[0].checked).toBe(true)
        // autoTranslate is false
        expect(inputs[1].checked).toBe(false)

        // The first checkbox has checkmark SVG rendered
        const svgs = container.querySelectorAll('svg')
        expect(svgs.length).toBe(1)
    })

    it('toggles value on click and triggers onValuesChange', async () => {
        const onValuesChange = vi.fn()
        await act(async () => {
            root.render(
                <Form initialValues={{ alwaysShowIcons: true, autoTranslate: false }} onValuesChange={onValuesChange}>
                    <FormItem name='alwaysShowIcons'>
                        <MyCheckbox />
                    </FormItem>
                </Form>
            )
        })

        const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement
        expect(input.checked).toBe(true)

        const label = container.querySelector('label')!
        await act(async () => {
            label.click()
        })

        expect(input.checked).toBe(false)
        expect(onValuesChange).toHaveBeenCalledWith(
            { alwaysShowIcons: false },
            { alwaysShowIcons: false, autoTranslate: false }
        )

        // Click again to re-enable
        await act(async () => {
            label.click()
        })

        expect(input.checked).toBe(true)
        expect(onValuesChange).toHaveBeenLastCalledWith(
            { alwaysShowIcons: true },
            { alwaysShowIcons: true, autoTranslate: false }
        )
    })

    it('supports direct Checkbox component inside FormItem', async () => {
        const onValuesChange = vi.fn()
        await act(async () => {
            root.render(
                <Form initialValues={{ alwaysShowIcons: true, autoTranslate: false }} onValuesChange={onValuesChange}>
                    <FormItem name='alwaysShowIcons'>
                        <Checkbox />
                    </FormItem>
                </Form>
            )
        })

        const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement
        expect(input.checked).toBe(true)

        const label = container.querySelector('label')!
        await act(async () => {
            label.click()
        })

        expect(input.checked).toBe(false)
        expect(onValuesChange).toHaveBeenCalledWith(
            { alwaysShowIcons: false },
            { alwaysShowIcons: false, autoTranslate: false }
        )
    })
})
