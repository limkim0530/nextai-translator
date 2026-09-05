/**
 * Where a provider's requests actually go.
 *
 * The endpoint each `@ai-sdk/*` package calls when `baseURL` is left empty used
 * to be written down twice — once for host permissions, once for model listing
 * — and the two disagreed (the permission table still named
 * `api.moonshot.cn` and `dashscope.aliyuncs.com`, neither of which the SDK
 * calls). It is one table now, read out of the packages rather than guessed.
 *
 * The rest of this module is about the gap between that table and what a user
 * types. Hosts disagree about whether the version prefix belongs in the base
 * URL — Anthropic wants `/v1`, DeepSeek serves at the root, Google wants
 * `/v1beta`, Groq wants `/openai/v1` — so "forgot the prefix" is the most
 * common way a valid key still produces a 404. Nothing here special-cases a
 * vendor: the prefix a protocol expects is the path of its own default
 * endpoint, and which candidate is right is settled by asking the endpoint
 * rather than by a table of exceptions.
 */
import type { ProviderConfig, ProviderProtocol } from './types'

/**
 * The endpoint each protocol's SDK package uses with no `baseURL` set.
 *
 * Taken verbatim from the packages, so it is also the answer to "which host
 * will this provider call" for `optional_host_permissions`. Protocols whose
 * endpoint is assembled from other settings (Azure's resource name, Bedrock's
 * region) are deliberately absent.
 */
export const PROTOCOL_DEFAULT_BASE_URL: Partial<Record<ProviderProtocol, string>> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
    xai: 'https://api.x.ai/v1',
    mistral: 'https://api.mistral.ai/v1',
    cohere: 'https://api.cohere.com/v2',
    groq: 'https://api.groq.com/openai/v1',
    deepseek: 'https://api.deepseek.com',
    cerebras: 'https://api.cerebras.ai/v1',
    fireworks: 'https://api.fireworks.ai/inference/v1',
    togetherai: 'https://api.together.xyz/v1',
    deepinfra: 'https://api.deepinfra.com/v1',
    perplexity: 'https://api.perplexity.ai',
    replicate: 'https://api.replicate.com/v1',
    vercel: 'https://ai-gateway.vercel.sh/v4/ai',
    alibaba: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    moonshotai: 'https://api.moonshot.ai/v1',
    huggingface: 'https://router.huggingface.co/v1',
    ollama: 'http://127.0.0.1:11434',
}

/**
 * Protocols where `baseURL` is strictly required because there is no official
 * shared host or the host must be supplied by the user (e.g. Azure resource name).
 */
export const PROTOCOLS_REQUIRING_BASE_URL: ReadonlySet<ProviderProtocol> = new Set([
    'openai-compatible',
    'open-responses',
    'azure',
])

export function isBaseURLRequired(protocol: ProviderProtocol): boolean {
    return PROTOCOLS_REQUIRING_BASE_URL.has(protocol)
}

/**
 * Example placeholder URLs for protocols that require a custom endpoint.
 */
export const PROTOCOL_PLACEHOLDER_BASE_URL: Partial<Record<ProviderProtocol, string>> = {
    'azure': 'https://<your-resource>.openai.azure.com',
    'openai-compatible': 'https://api.example.com/v1',
    'open-responses': 'https://api.example.com/v1',
}

/**
 * Example placeholder API key prefixes for protocols.
 */
export const PROTOCOL_PLACEHOLDER_API_KEY: Partial<Record<ProviderProtocol, string>> = {
    'openai': 'sk-...',
    'openai-compatible': 'sk-...',
    'open-responses': 'sk-...',
    'anthropic': 'sk-ant-...',
    'google': 'AIza...',
    'deepseek': 'sk-...',
    'groq': 'gsk_...',
    'xai': 'xai-...',
    'moonshotai': 'sk-...',
}

/**
 * Protocols with no default endpoint, because the host is whatever the user
 * points them at. They all speak the OpenAI wire format, whose convention is a
 * `/v1` prefix — the one assumption worth making when there is nothing to read.
 */
const OPENAI_CONVENTION: ReadonlySet<ProviderProtocol> = new Set(['openai-compatible', 'open-responses'])

/**
 * Paths that only ever appear at the end of a *call*, not of a base URL. People
 * paste them out of a vendor's curl example; every SDK would then append its
 * own operation path after them.
 *
 * Order matters: `/chat/completions` has to be tested before `/completions`.
 */
const PASTED_OPERATION_PATHS = ['/chat/completions', '/completions', '/responses', '/messages', '/models']

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i

function withScheme(url: string): string {
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(url)) {
        return url
    }
    // A bare `api.example.com` is a dropped scheme, not a relative path. Plain
    // http is right for a loopback address and wrong for anything else.
    return `${LOCAL_HOST.test(url) ? 'http' : 'https'}://${url}`
}

function hasHost(url: string): boolean {
    try {
        return !!new URL(url).host
    } catch {
        return false
    }
}

/**
 * What the user typed, in the shape the SDK expects: scheme filled in, trailing
 * slashes gone, and a pasted operation path removed.
 *
 * Everything here is unambiguous. Guesses about the version prefix belong in
 * `baseURLCandidates`, where they get verified before being acted on.
 */
export function normalizeBaseURL(raw: string | undefined, protocol?: ProviderProtocol): string | undefined {
    const trimmed = raw?.trim()
    if (!trimmed) {
        return undefined
    }
    let url = withScheme(trimmed).replace(/\/+$/, '')
    for (const path of PASTED_OPERATION_PATHS) {
        if (url.toLowerCase().endsWith(path)) {
            url = url.slice(0, -path.length)
            break
        }
    }
    // Ollama's base URL is an origin — its client appends `/api/chat` itself,
    // so the `…:11434/api` an older preset shipped resolves to `/api/api/chat`.
    if (protocol === 'ollama') {
        url = url.replace(/\/api$/i, '')
    }
    return hasHost(url) ? url : undefined
}

/** The path a protocol's own default endpoint carries, e.g. `/v1`, `/v1beta`. */
export function defaultPathFor(protocol: ProviderProtocol): string | undefined {
    const base = PROTOCOL_DEFAULT_BASE_URL[protocol]
    if (base) {
        try {
            return new URL(base).pathname.replace(/\/+$/, '') || undefined
        } catch {
            return undefined
        }
    }
    return OPENAI_CONVENTION.has(protocol) ? '/v1' : undefined
}

/**
 * Base URLs worth trying, best guess first.
 *
 * At most two: what the user typed, and the same with the protocol's version
 * prefix added (or removed, if they added one the host serves at its root).
 * Callers pick between them by observing which one answers — listing models
 * probes them in order, and a chat request retries the second only after the
 * first returns "no such route".
 */
export function baseURLCandidates(config: Pick<ProviderConfig, 'protocol' | 'baseURL'>): string[] {
    const userBase = normalizeBaseURL(config.baseURL, config.protocol)
    if (!userBase) {
        const defaultBase = PROTOCOL_DEFAULT_BASE_URL[config.protocol]
        return defaultBase ? [defaultBase] : []
    }
    const path = defaultPathFor(config.protocol)
    if (!path) {
        return [userBase]
    }
    if (userBase.toLowerCase().endsWith(path.toLowerCase())) {
        const stripped = userBase.slice(0, -path.length).replace(/\/+$/, '')
        return hasHost(stripped) ? [userBase, stripped] : [userBase]
    }
    return [userBase, userBase + path]
}
