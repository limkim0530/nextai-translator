/**
 * Pure ingestion logic for the models.dev catalog, shared by the build-time
 * generator (`scripts/sync-models.ts`) and the runtime refresh in
 * `capabilities.ts`.
 *
 * Kept free of browser and Node APIs so both callers can use it unchanged: a
 * second copy of this logic would let the baked snapshot and a user-triggered
 * refresh disagree about the same model, which is the one failure mode this
 * whole table exists to prevent.
 */

/** Canonical effort ladder, weakest first. Matches the AI SDK's own vocabulary. */
export const EFFORT_ORDER = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
export type Effort = (typeof EFFORT_ORDER)[number]

const EFFORT_RANK = new Map<string, number>(EFFORT_ORDER.map((e, i) => [e, i]))

/**
 * models.dev provider keys that publish a vendor's own models. When hosts
 * disagree about a model's effort vocabulary the vendor's own listing wins: a
 * resold endpoint routinely advertises the gateway's superset rather than what
 * the upstream model actually accepts.
 */
export const FIRST_PARTY_PROVIDERS = [
    'openai',
    'anthropic',
    'google',
    'google-vertex',
    'deepseek',
    'xai',
    'mistral',
    'cohere',
    'moonshotai',
    'alibaba',
    'zhipuai',
    'minimax',
    'groq',
    'cerebras',
    'perplexity',
    'amazon-bedrock',
    'azure',
    'ollama',
]

export interface RawReasoningOption {
    type?: string
    values?: string[]
    min?: number
    max?: number
}

export interface RawModel {
    reasoning?: boolean
    // eslint-disable-next-line camelcase
    reasoning_options?: RawReasoningOption[]
}

export interface RawProvider {
    models?: Record<string, RawModel>
}

export type RawCatalog = Record<string, RawProvider>

/**
 * Compact wire shape. Keys are single letters because this payload ships inside
 * the extension bundle and is also cached in `storage.sync`.
 */
export interface PackedCaps {
    /** Accepted effort vocabulary, canonical order. */
    e?: Effort[]
    /** Model exposes a plain on/off thinking switch. */
    t?: 1
    /** Thinking-token budget as `[min]` or `[min, max]`. */
    b?: [number] | [number, number]
}

export interface CapabilityTables {
    byProvider: Record<string, Record<string, PackedCaps>>
    byModel: Record<string, PackedCaps>
}

export function packCaps(model: RawModel): PackedCaps {
    const packed: PackedCaps = {}
    for (const option of model.reasoning_options ?? []) {
        if (option.type === 'effort' && option.values?.length) {
            const values = option.values
                .filter((v): v is Effort => EFFORT_RANK.has(v))
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .sort((a, b) => EFFORT_RANK.get(a)! - EFFORT_RANK.get(b)!)
            if (values.length) {
                packed.e = values
            }
        }
        if (option.type === 'toggle') {
            packed.t = 1
        }
        if (option.type === 'budget_tokens') {
            const min = option.min ?? 0
            packed.b = option.max !== null && option.max !== undefined ? [min, option.max] : [min]
        }
    }
    // A model flagged `reasoning` with no options at all is meaningful, not
    // empty: it means "thinks, but exposes no knob" (deepseek-reasoner), which
    // the UI must explain rather than render as a broken toggle.
    return packed
}

/**
 * Strip the host namespace and cosmetic suffixes so the same model reached
 * through different gateways collapses onto one key.
 */
export function normalizeModelId(id: string): string {
    return (id.toLowerCase().split('/').pop() ?? '')
        .replace(/[:@](free|nitro|beta|latest)$/, '')
        .replace(/_/g, '-')
        .trim()
}

/**
 * Narrowest common vocabulary across hosts. Advertising an effort the endpoint
 * rejects is a hard request failure, while omitting one it would have accepted
 * merely hides a UI option — so disagreement resolves toward the intersection.
 */
export function intersectEfforts(sets: Effort[][]): Effort[] | undefined {
    if (!sets.length) {
        return undefined
    }
    const [first, ...rest] = sets
    const common = first.filter((value) => rest.every((set) => set.includes(value)))
    return common.length ? common : undefined
}

/** Build both lookup tables from a raw models.dev catalog. */
export function buildCapabilityTables(catalog: RawCatalog): CapabilityTables {
    const byProvider: Record<string, Record<string, PackedCaps>> = {}
    const candidates = new Map<string, { provider: string; caps: PackedCaps }[]>()

    for (const [providerKey, provider] of Object.entries(catalog)) {
        const rows: Record<string, PackedCaps> = {}
        for (const [modelId, model] of Object.entries(provider.models ?? {})) {
            if (!model?.reasoning) {
                continue
            }
            const caps = packCaps(model)
            rows[modelId] = caps

            const key = normalizeModelId(modelId)
            const bucket = candidates.get(key) ?? []
            bucket.push({ provider: providerKey, caps })
            candidates.set(key, bucket)
        }
        if (Object.keys(rows).length) {
            byProvider[providerKey] = rows
        }
    }

    // Cross-host fallback, used when the configured endpoint is a custom
    // OpenAI-compatible URL that maps to no models.dev provider key.
    const byModel: Record<string, PackedCaps> = {}
    for (const [key, bucket] of candidates) {
        const firstParty = bucket.find((entry) => FIRST_PARTY_PROVIDERS.includes(entry.provider))
        if (firstParty) {
            byModel[key] = firstParty.caps
            continue
        }
        const merged: PackedCaps = {}
        const efforts = intersectEfforts(bucket.map((entry) => entry.caps.e).filter((e): e is Effort[] => !!e))
        if (efforts) {
            merged.e = efforts
        }
        if (bucket.some((entry) => entry.caps.t)) {
            merged.t = 1
        }
        const budgets = bucket.map((entry) => entry.caps.b).filter((b): b is [number] | [number, number] => !!b)
        if (budgets.length) {
            const min = Math.max(...budgets.map((b) => b[0]))
            const maxes = budgets.map((b) => b[1]).filter((m): m is number => m !== null && m !== undefined)
            merged.b = maxes.length ? [min, Math.min(...maxes)] : [min]
        }
        byModel[key] = merged
    }

    return { byProvider, byModel }
}
