import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { Textarea } from './Textarea'
import { createForm } from '../Form'
import NumberInput from '../NumberInput'

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

interface TestFormValues {
    autoTranslate: boolean
    fontSize: number
}

const { Form, FormItem, useForm } = createForm<TestFormValues>()

describe('Form and Button submission', () => {
    it('does not submit form when Button has default type="button" and no click handler', async () => {
        const onFinish = vi.fn()
        await act(async () => {
            root.render(
                <Form initialValues={{ autoTranslate: true, fontSize: 16 }} onFinish={onFinish}>
                    <FormItem name='autoTranslate'>
                        <Checkbox />
                    </FormItem>
                    <Button>Save</Button>
                </Form>
            )
        })

        const button = container.querySelector('button')!
        expect(button.type).toBe('button')

        await act(async () => {
            button.click()
        })

        expect(onFinish).not.toHaveBeenCalled()
    })

    it('submits form with updated values when Button has type="submit"', async () => {
        const onFinish = vi.fn()
        await act(async () => {
            root.render(
                <Form initialValues={{ autoTranslate: true, fontSize: 16 }} onFinish={onFinish}>
                    <FormItem name='autoTranslate'>
                        <Checkbox />
                    </FormItem>
                    <Button type='submit'>Save</Button>
                </Form>
            )
        })

        const button = container.querySelector('button')!
        expect(button.type).toBe('submit')

        // Toggle checkbox first
        const label = container.querySelector('label')!
        await act(async () => {
            label.click()
        })

        await act(async () => {
            button.click()
        })

        expect(onFinish).toHaveBeenCalledTimes(1)
        expect(onFinish).toHaveBeenCalledWith({
            autoTranslate: false,
            fontSize: 16,
        })
    })

    it('submits latest values when Save button has explicit onClick reading form fields', async () => {
        const onSave = vi.fn()

        function FormWrapper() {
            const [form] = useForm()
            return (
                <Form form={form} initialValues={{ autoTranslate: false, fontSize: 14 }}>
                    <FormItem name='autoTranslate'>
                        <Checkbox />
                    </FormItem>
                    <FormItem name='fontSize'>
                        <NumberInput />
                    </FormItem>
                    <Button
                        type='submit'
                        onClick={() => {
                            const latest = form.getFieldsValue()
                            onSave(latest)
                        }}
                    >
                        Save
                    </Button>
                </Form>
            )
        }

        await act(async () => {
            root.render(<FormWrapper />)
        })

        // Toggle checkbox
        const label = container.querySelector('label')!
        await act(async () => {
            label.click()
        })

        // Change number input
        const numberInput = container.querySelector('input[type="number"]') as HTMLInputElement
        await act(async () => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
            setter.call(numberInput, '20')
            numberInput.dispatchEvent(new Event('input', { bubbles: true }))
            numberInput.dispatchEvent(new Event('change', { bubbles: true }))
        })

        const button = container.querySelector('button')!
        await act(async () => {
            button.click()
        })

        expect(onSave).toHaveBeenCalledWith({
            autoTranslate: true,
            fontSize: 20,
        })
    })

    it('calls onBlur when NumberInput loses focus and clears focus border', async () => {
        const onBlur = vi.fn()
        await act(async () => {
            root.render(<NumberInput value={14} onBlur={onBlur} />)
        })

        const input = container.querySelector('input[type="number"]') as HTMLInputElement
        const wrapper = input.parentElement as HTMLDivElement

        await act(async () => {
            input.focus()
        })
        expect(wrapper.style.boxShadow).not.toBe('none')

        await act(async () => {
            input.blur()
        })

        expect(onBlur).toHaveBeenCalled()
        expect(wrapper.style.boxShadow).toBe('none')
    })

    it('resets focus style on Textarea when blurred with onBlur handler', async () => {
        const onBlur = vi.fn()
        await act(async () => {
            root.render(<Textarea onChange={() => {}} onBlur={onBlur} />)
        })

        const textarea = container.querySelector('textarea') as HTMLTextAreaElement
        const wrapper = textarea.parentElement as HTMLDivElement

        await act(async () => {
            textarea.focus()
        })
        expect(wrapper.style.boxShadow).not.toBe('none')

        await act(async () => {
            textarea.blur()
        })

        expect(onBlur).toHaveBeenCalled()
        expect(wrapper.style.boxShadow).toBe('none')
    })
})
