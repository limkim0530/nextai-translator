import { describe, expect, it } from 'vitest'
import { buildCapabilityTables, normalizeModelId, packCaps, intersectEfforts } from '../capability-packing'
import { toReasoningControl } from '../types'

describe('packCaps', () => {
    it('sorts the effort vocabulary onto the canonical ladder', () => {
        expect(
            packCaps({
                reasoning: true,
                // eslint-disable-next-line camelcase
                reasoning_options: [{ type: 'effort', values: ['high', 'none', 'medium', 'low'] }],
            })
        ).toEqual({ e: ['none', 'low', 'medium', 'high'] })
    })

    it('drops effort values outside the known ladder', () => {
        expect(
            packCaps({
                reasoning: true,
                // eslint-disable-next-line camelcase
                reasoning_options: [{ type: 'effort', values: ['low', 'turbo', 'high'] }],
            })
        ).toEqual({ e: ['low', 'high'] })
    })

    it('keeps toggle and budget alongside each other', () => {
        expect(
            packCaps({
                reasoning: true,
                // eslint-disable-next-line camelcase
                reasoning_options: [{ type: 'toggle' }, { type: 'budget_tokens', min: 0, max: 24576 }],
            })
        ).toEqual({ t: 1, b: [0, 24576] })
    })

    it('packs a reasoning model with no options as empty rather than absent', () => {
        // deepseek-reasoner: thinks, but exposes no knob. The distinction from
        // "not in the catalog" is what stops the UI offering a dead control.
        // eslint-disable-next-line camelcase
        expect(packCaps({ reasoning: true, reasoning_options: [] })).toEqual({})
    })
})

describe('normalizeModelId', () => {
    it('collapses host namespaces and cosmetic suffixes onto one key', () => {
        expect(normalizeModelId('deepseek-ai/DeepSeek-R1')).toBe('deepseek-r1')
        expect(normalizeModelId('x-ai/grok-4-fast:free')).toBe('grok-4-fast')
        expect(normalizeModelId('Qwen_Qwen3')).toBe('qwen-qwen3')
    })
})

describe('intersectEfforts', () => {
    it('returns the narrowest vocabulary the hosts agree on', () => {
        expect(
            intersectEfforts([
                ['none', 'low', 'medium', 'high'],
                ['low', 'medium', 'high', 'xhigh'],
            ])
        ).toEqual(['low', 'medium', 'high'])
    })

    it('returns undefined when hosts share nothing', () => {
        expect(intersectEfforts([['none'], ['xhigh']])).toBeUndefined()
    })
})

describe('buildCapabilityTables', () => {
    const catalog = {
        openai: {
            models: {
                // eslint-disable-next-line camelcase
                'gpt-5.1': { reasoning: true, reasoning_options: [{ type: 'effort', values: ['none', 'high'] }] },
                'gpt-4o': { reasoning: false },
            },
        },
        // A reseller advertising the gateway's superset for the same model.
        somegateway: {
            models: {
                'gpt-5.1': {
                    reasoning: true,
                    // eslint-disable-next-line camelcase
                    reasoning_options: [{ type: 'effort', values: ['none', 'low', 'medium', 'high', 'xhigh'] }],
                },
            },
        },
    }

    it('excludes non-reasoning models', () => {
        const { byProvider } = buildCapabilityTables(catalog)
        expect(byProvider.openai['gpt-4o']).toBeUndefined()
        expect(byProvider.openai['gpt-5.1']).toEqual({ e: ['none', 'high'] })
    })

    it('keeps each host’s own list intact under its provider key', () => {
        const { byProvider } = buildCapabilityTables(catalog)
        expect(byProvider.somegateway['gpt-5.1'].e).toContain('xhigh')
    })

    it('prefers the vendor listing over a reseller in the cross-host index', () => {
        // Sending an effort the model rejects is a hard failure, so the vendor's
        // narrower list has to win the fallback.
        const { byModel } = buildCapabilityTables(catalog)
        expect(byModel['gpt-5.1']).toEqual({ e: ['none', 'high'] })
    })
})

describe('toReasoningControl', () => {
    it('offers exactly the levels the model publishes', () => {
        const control = toReasoningControl({ e: ['none', 'low', 'medium', 'high'] })
        expect(control.kind).toBe('effort')
        expect(control.options).toEqual(['provider-default', 'none', 'low', 'medium', 'high'])
        expect(control.canDisable).toBe(true)
    })

    it('reports a model that cannot stop thinking', () => {
        // gpt-5-pro publishes only `high`, which is the case the old global
        // "Enable Thinking" checkbox silently mishandled.
        const control = toReasoningControl({ e: ['high'] })
        expect(control.options).toEqual(['provider-default', 'high'])
        expect(control.canDisable).toBe(false)
    })

    it('drops effort values the SDK has no spelling for', () => {
        const control = toReasoningControl({ e: ['low', 'max'] })
        expect(control.options).toEqual(['provider-default', 'low'])
    })

    it('treats a budget-only model as controllable', () => {
        const control = toReasoningControl({ b: [1024] })
        expect(control.kind).toBe('budget')
        expect(control.budget).toEqual({ min: 1024, max: undefined })
        expect(control.canDisable).toBe(true)
    })

    it('offers only the provider default when the model exposes no knob', () => {
        const control = toReasoningControl({})
        expect(control.kind).toBe('fixed')
        expect(control.options).toEqual(['provider-default'])
        expect(control.canDisable).toBe(false)
    })

    it('falls back to the full ladder for an uncataloged model', () => {
        const control = toReasoningControl(undefined)
        expect(control.kind).toBe('unknown')
        expect(control.options).toContain('none')
        expect(control.options).toContain('xhigh')
    })
})
