/**
 * Listing the models an endpoint offers.
 *
 * Two independent sources, because neither is sufficient alone:
 *   - the endpoint's own model list is authoritative about what a given key can
 *     actually call, but needs a working key and is not offered by every host;
 *   - the models.dev catalog needs no credentials and covers hosts with no
 *     listing endpoint, but describes the vendor's line-up rather than the
 *     caller's entitlements.
 */
import { getUniversalFetch } from '../universal-fetch'
import { getModelCapabilities } from './capabilities'
import { baseURLCandidates } from './endpoints'
import { PACKED_CAPS_BY_PROVIDER } from './model-capabilities.gen'
import type { ProviderConfig, ProviderProtocol } from './types'

export interface ModelOption {
    id: string
    /** True when the catalog says this model can reason. */
    reasoning?: boolean
}

/**
 * Protocols whose listing lives somewhere other than their chat base.
 *
 * DeepInfra is the only one: the SDK talks to `/v1` and appends `/openai/…`
 * per call, while the OpenAI-compatible listing sits under `/v1/openai`.
 */
const LIST_BASE_OVERRIDES: Partial<Record<ProviderProtocol, string>> = {
    deepinfra: 'https://api.deepinfra.com/v1/openai',
}

/** Protocols whose list endpoint is `GET {base}/models` returning `{data:[{id}]}`. */
const OPENAI_SHAPED: ProviderProtocol[] = [
    'openai',
    'openai-compatible',
    'open-responses',
    'deepseek',
    'groq',
    'cerebras',
    'mistral',
    'xai',
    'moonshotai',
    'togetherai',
    'deepinfra',
    'perplexity',
    'fireworks',
    'alibaba',
    'vercel',
]

/**
 * Bases to try, best guess first.
 *
 * A user who left `baseURL` empty gets the protocol's default; one who typed a
 * host gets it and the version-prefixed variant, so forgetting `/v1` costs a
 * wasted request rather than an unexplained empty list.
 */
function baseURLsFor(config: ProviderConfig): string[] {
    if (!config.baseURL?.trim()) {
        const override = LIST_BASE_OVERRIDES[config.protocol]
        if (override) {
            return [override]
        }
    }
    return baseURLCandidates(config)
}

/** Models the catalog knows for this provider, usable with no credentials. */
export function listModelsFromCatalog(config: ProviderConfig): ModelOption[] {
    if (!config.catalogKey) {
        return []
    }
    try {
        const byProvider = JSON.parse(PACKED_CAPS_BY_PROVIDER) as Record<string, Record<string, unknown>>
        const rows = byProvider[config.catalogKey]
        if (!rows) {
            return []
        }
        return Object.keys(rows)
            .sort()
            .map((id) => ({ id, reasoning: true }))
    } catch {
        return []
    }
}

/**
 * Ask one endpoint what it serves. Throws on transport or auth failure so the
 * caller can show why the list is empty rather than an unexplained blank.
 */
async function fetchModelList(config: ProviderConfig, base: string): Promise<ModelOption[]> {
    const fetcher = getUniversalFetch()
    const apiKey = config.apiKey?.trim() ?? ''

    if (config.protocol === 'ollama') {
        const resp = await fetcher(`${base.replace(/\/api$/, '')}/api/tags`, { method: 'GET' })
        if (resp.status !== 200) {
            throw new Error(`${resp.status}`)
        }
        const data = (await resp.json()) as { models?: { name?: string }[] }
        return (data.models ?? []).flatMap((m) => (m.name ? [{ id: m.name }] : []))
    }

    if (config.protocol === 'anthropic') {
        const resp = await fetcher(`${base}/models?limit=100`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                // Anthropic blocks browser-origin requests unless this opt-in
                // header is present; without it the list silently 403s.
                'anthropic-dangerous-direct-browser-access': 'true',
            },
        })
        if (resp.status !== 200) {
            throw new Error(`${resp.status}`)
        }
        const data = (await resp.json()) as { data?: { id?: string }[] }
        return (data.data ?? []).flatMap((m) => (m.id ? [{ id: m.id }] : []))
    }

    if (config.protocol === 'google') {
        const resp = await fetcher(`${base}/models?key=${encodeURIComponent(apiKey)}&pageSize=200`, { method: 'GET' })
        if (resp.status !== 200) {
            throw new Error(`${resp.status}`)
        }
        const data = (await resp.json()) as { models?: { name?: string }[] }
        return (data.models ?? []).flatMap((m) => (m.name ? [{ id: m.name.replace(/^models\//, '') }] : []))
    }

    if (!OPENAI_SHAPED.includes(config.protocol)) {
        return []
    }

    const resp = await fetcher(`${base}/models`, {
        method: 'GET',
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } : {},
    })
    if (resp.status !== 200) {
        throw new Error(`${resp.status}`)
    }
    const data = (await resp.json()) as { data?: { id?: string }[] }
    return (data.data ?? []).flatMap((m) => (m.id ? [{ id: m.id }] : []))
}

/**
 * The endpoint's own listing, trying each plausible base URL in turn.
 *
 * `baseURL` in the result is the base that answered. It is what settles the
 * "does this host want /v1?" question for a config, so the caller stores it.
 */
export async function listModelsFromEndpoint(
    config: ProviderConfig
): Promise<{ models: ModelOption[]; baseURL?: string }> {
    let lastError: unknown
    for (const base of baseURLsFor(config)) {
        try {
            const models = await fetchModelList(config, base)
            if (models.length) {
                return { models, baseURL: base }
            }
        } catch (e) {
            lastError = e
        }
    }
    if (lastError) {
        throw lastError
    }
    return { models: [] }
}

/**
 * Endpoint listing with a catalog fallback, annotated with whether each model
 * reasons so the picker can hint at what will get a thinking control.
 */
export async function listModels(
    config: ProviderConfig
): Promise<{ models: ModelOption[]; error?: string; baseURL?: string }> {
    let models: ModelOption[] = []
    let baseURL: string | undefined
    let error: string | undefined
    try {
        ;({ models, baseURL } = await listModelsFromEndpoint(config))
    } catch (e) {
        error = e instanceof Error ? e.message : String(e)
    }
    // Only worth reporting when it is not already what the config says, since
    // the caller uses it to decide whether to correct the stored provider row.
    const corrected = baseURL && baseURL !== config.baseURL?.trim() ? baseURL : undefined

    if (models.length === 0) {
        const fallback = listModelsFromCatalog(config)
        return { models: fallback, error }
    }

    const annotated = await Promise.all(
        models.map(async (m) => ({
            ...m,
            reasoning: !!(await getModelCapabilities(m.id, config.catalogKey)),
        }))
    )
    return { models: annotated, error, baseURL: corrected }
}
