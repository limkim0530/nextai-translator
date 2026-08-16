import type { JSONValue } from 'ai'
import type { Effort, PackedCaps } from './capability-packing'

/**
 * How to talk to an endpoint. This is a *protocol*, not a brand: the whole
 * point of the provider-instance model is that a user can point
 * `openai-compatible` at any base URL without the app shipping a code change
 * for that vendor.
 *
 * Every value maps to an `@ai-sdk/*` package, so the request/response encoding
 * — including how a reasoning effort is spelled for each model generation — is
 * maintained upstream rather than here.
 */
export type ProviderProtocol =
    | 'openai'
    | 'openai-compatible'
    | 'open-responses'
    | 'anthropic'
    | 'google'
    | 'azure'
    | 'bedrock'
    | 'xai'
    | 'mistral'
    | 'cohere'
    | 'groq'
    | 'deepseek'
    | 'cerebras'
    | 'fireworks'
    | 'togetherai'
    | 'deepinfra'
    | 'perplexity'
    | 'replicate'
    | 'vercel'
    | 'alibaba'
    | 'moonshotai'
    | 'huggingface'
    | 'ollama'

/**
 * The user's reasoning intent, in the AI SDK's own vocabulary so it can be
 * passed straight through as the top-level `reasoning` call setting.
 *
 * This is an *intent*, not a wire field: `'none'` means "don't think", and each
 * provider package decides whether that becomes `reasoning_effort: 'none'`,
 * `thinking: {type: 'disabled'}`, `thinkingConfig.thinkingBudget: 0`, or a
 * warning that the model cannot comply.
 */
export type ReasoningSelection = 'provider-default' | 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'

export const REASONING_SELECTIONS: ReasoningSelection[] = [
    'provider-default',
    'none',
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
]

/** A single configured endpoint. Users may create any number of these. */
export interface ProviderConfig {
    /** Stable uuid. Referenced by per-action overrides, so it must not change. */
    id: string
    /** User-facing label. Free text; duplicates are allowed. */
    name: string
    protocol: ProviderProtocol
    /** Overrides the protocol's default endpoint. Required for custom hosts. */
    baseURL?: string
    apiKey?: string
    model: string
    /**
     * models.dev provider key used for capability lookup. Set automatically for
     * built-in presets; left empty for custom endpoints, which fall back to the
     * cross-host model index.
     */
    catalogKey?: string
    reasoning?: ReasoningSelection
    /** Extra headers merged into every request. */
    headers?: Record<string, string>
    /**
     * Raw `providerOptions` passed to the AI SDK verbatim, keyed by the SDK's
     * provider name. The escape hatch for anything the capability table and the
     * SDK do not yet know about — a model released after the last sync can be
     * driven from here without waiting for a release.
     */
    providerOptions?: Record<string, JSONValue>
    /** Provider-factory settings (Azure resource name, API version, region…). */
    providerSettings?: Record<string, JSONValue>
}

/** What kind of thinking control the settings UI should render for a model. */
export type ReasoningControlKind =
    | 'effort' // discrete ladder the model publishes
    | 'toggle' // on/off only
    | 'budget' // token budget
    | 'fixed' // reasons, but exposes no knob
    | 'unknown' // not in the catalog

export interface ReasoningControl {
    kind: ReasoningControlKind
    /** Selections safe to offer, always including `provider-default`. */
    options: ReasoningSelection[]
    /** Whether the model can be told to stop thinking at all. */
    canDisable: boolean
    /** Token budget bounds, when the model is budget-driven. */
    budget?: { min: number; max?: number }
    /** Raw capabilities behind this control, for diagnostics in the UI. */
    caps?: PackedCaps
}

/** Efforts the SDK understands. `max` exists upstream but has no SDK spelling. */
const SDK_EFFORTS = new Set<string>(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])

/**
 * Translate raw catalog capabilities into the control the UI should show.
 *
 * The bias throughout is to offer *fewer* choices than might work rather than
 * more: an effort the endpoint rejects is a hard request failure the user sees
 * as a broken translation, while a missing option is merely a missing option.
 */
export function toReasoningControl(caps: PackedCaps | undefined): ReasoningControl {
    if (!caps) {
        // Not in the catalog — most likely a model newer than the last sync, or
        // a private deployment. Offer the full ladder but let the UI say the
        // capabilities are unverified, and leave `providerOptions` as the fix.
        return {
            kind: 'unknown',
            options: REASONING_SELECTIONS,
            canDisable: true,
        }
    }

    if (caps.e?.length) {
        const options = caps.e.filter((e): e is Effort & ReasoningSelection => SDK_EFFORTS.has(e))
        return {
            kind: 'effort',
            options: ['provider-default', ...options],
            canDisable: options.includes('none' as never),
            caps,
        }
    }

    const budget = caps.b ? { min: caps.b[0], max: caps.b[1] } : undefined

    if (caps.t || budget) {
        // A toggle or a budget means the depth is controllable even though the
        // model publishes no effort words. The SDK translates an effort into
        // whichever of the two the provider actually speaks.
        return {
            kind: budget && !caps.t ? 'budget' : 'toggle',
            options: ['provider-default', 'none', 'low', 'medium', 'high'],
            canDisable: true,
            budget,
            caps,
        }
    }

    // Reasoning-capable but no published knob (e.g. deepseek-reasoner). Sending
    // any reasoning parameter here is what produces the "unsupported parameter"
    // errors this table exists to avoid.
    return {
        kind: 'fixed',
        options: ['provider-default'],
        canDisable: false,
        caps,
    }
}
