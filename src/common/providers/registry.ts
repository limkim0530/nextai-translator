/**
 * Builds an AI SDK language model from a `ProviderConfig`.
 *
 * Everything protocol-specific stops here. Callers hand this module a config
 * and get back a `LanguageModel`; how a reasoning effort, a system prompt or a
 * streaming chunk is encoded for a given vendor is the SDK package's problem,
 * which is the entire point of routing through it.
 */
import { createAlibaba } from '@ai-sdk/alibaba'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAzure } from '@ai-sdk/azure'
import { createCerebras } from '@ai-sdk/cerebras'
import { createCohere } from '@ai-sdk/cohere'
import { createDeepInfra } from '@ai-sdk/deepinfra'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createFireworks } from '@ai-sdk/fireworks'
import { createGateway } from '@ai-sdk/gateway'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createHuggingFace } from '@ai-sdk/huggingface'
import { createMistral } from '@ai-sdk/mistral'
import { createMoonshotAI } from '@ai-sdk/moonshotai'
import { createOpenResponses } from '@ai-sdk/open-responses'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createPerplexity } from '@ai-sdk/perplexity'
import { createReplicate } from '@ai-sdk/replicate'
import { createTogetherAI } from '@ai-sdk/togetherai'
import { createXai } from '@ai-sdk/xai'
import type { LanguageModel } from 'ai'
import { createOllama } from 'ai-sdk-ollama'
import { getUniversalFetch } from '../universal-fetch'
import { baseURLCandidates, normalizeBaseURL } from './endpoints'
import type { ProviderConfig, ProviderProtocol } from './types'

type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/**
 * Statuses that mean "nothing is served at this path", as opposed to a request
 * the endpoint understood and rejected. A wrong version prefix produces one of
 * these; a bad key or an unknown model does not.
 */
const WRONG_PATH_STATUSES = new Set([404, 405])

/**
 * Which candidate base URL a host actually answered on, keyed by the one we
 * tried first. Remembering it makes the retry below cost one extra round trip
 * per context instead of one per request.
 */
const resolvedBases = new Map<string, string>()

function swapBase(url: string, from: string, to: string): string | undefined {
    return url.startsWith(from) ? to + url.slice(from.length) : undefined
}

/**
 * Adapts the app's platform-specific fetchers to what the AI SDK expects.
 *
 * Two gaps have to be closed. The extension's `backgroundFetch` proxies through
 * the background page and returns a hand-rolled response object with no
 * `headers` — the SDK reads `response.headers` on every call, so a missing one
 * throws before any content is parsed. And all three fetchers take a URL
 * string, while the SDK may pass a `URL` or a `Request`.
 *
 * It also resolves the version-prefix ambiguity `baseURLCandidates` leaves
 * open: if the base the user typed has no route, the alternate is tried once
 * before the failure is reported. A POST that 404s never reached a handler, so
 * repeating it cannot double anything.
 */
function createSDKFetch(candidates: string[] = []): FetchFunction {
    const fetcher = getUniversalFetch()
    const [primary, alternate] = candidates
    const ensureHeaders = (resp: Response) => {
        if (!resp.headers) {
            // Cannot assign to a real Response, but these proxies are plain
            // objects, so defining the property is both safe and necessary.
            Object.defineProperty(resp, 'headers', { value: new Headers(), configurable: true })
        }
        return resp
    }
    return async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
        const known = primary ? resolvedBases.get(primary) : undefined
        const first = (known && swapBase(url, primary, known)) || url
        const resp = await fetcher(first, init ?? {})
        if (known || !alternate || !WRONG_PATH_STATUSES.has(resp.status)) {
            return ensureHeaders(resp)
        }
        const retry = swapBase(url, primary, alternate)
        if (!retry || retry === first) {
            return ensureHeaders(resp)
        }
        const second = await fetcher(retry, init ?? {})
        if (WRONG_PATH_STATUSES.has(second.status)) {
            return ensureHeaders(resp)
        }
        resolvedBases.set(primary, alternate)
        return ensureHeaders(second)
    }
}

/** Options every SDK provider factory accepts. */
interface CommonFactoryOptions {
    baseURL?: string
    apiKey?: string
    headers?: Record<string, string>
    fetch: FetchFunction
    [key: string]: unknown
}

/**
 * Protocols whose SDK package ships a correct default endpoint. For these,
 * `baseURL` is only forwarded when the user actually set one — passing
 * `undefined` explicitly makes some factories skip their own default.
 */
const PROTOCOL_FACTORIES: Record<
    Exclude<ProviderProtocol, 'openai-compatible' | 'open-responses' | 'ollama'>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (options: CommonFactoryOptions) => any
> = {
    openai: createOpenAI,
    anthropic: createAnthropic,
    google: createGoogleGenerativeAI,
    azure: createAzure,
    bedrock: createAmazonBedrock,
    xai: createXai,
    mistral: createMistral,
    cohere: createCohere,
    groq: createGroq,
    deepseek: createDeepSeek,
    cerebras: createCerebras,
    fireworks: createFireworks,
    togetherai: createTogetherAI,
    deepinfra: createDeepInfra,
    perplexity: createPerplexity,
    replicate: createReplicate,
    // `@ai-sdk/vercel` drove the v0 Model API, which Vercel removed; the AI
    // Gateway this row is named after now lives in `@ai-sdk/gateway`. The
    // protocol keeps its `vercel` name so stored provider rows still resolve.
    vercel: createGateway,
    alibaba: createAlibaba,
    moonshotai: createMoonshotAI,
    huggingface: createHuggingFace,
}

export class ProviderConfigError extends Error {}

/** Strip undefined values so they never override a factory's own defaults. */
function compact<T extends Record<string, unknown>>(source: T): T {
    return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined)) as T
}

export function createLanguageModel(config: ProviderConfig): LanguageModel {
    const model = config.model?.trim()
    if (!model) {
        throw new ProviderConfigError(`Provider "${config.name}" has no model selected`)
    }

    // A base URL the user did not set stays unset: the SDK's own default is
    // already correct, and passing `undefined` explicitly makes some factories
    // skip it. Only a user-supplied host is ambiguous enough to need candidates.
    const userBase = normalizeBaseURL(config.baseURL, config.protocol)
    const candidates = userBase ? baseURLCandidates(config) : []

    const options: CommonFactoryOptions = compact({
        ...(config.providerSettings ?? {}),
        baseURL: userBase,
        apiKey: config.apiKey?.trim() || undefined,
        headers: config.headers && Object.keys(config.headers).length ? config.headers : undefined,
        fetch: createSDKFetch(candidates),
    })

    if (config.protocol === 'openai-compatible') {
        if (!options.baseURL) {
            throw new ProviderConfigError(`Provider "${config.name}" needs a base URL`)
        }
        return createOpenAICompatible({
            name: config.name || 'openai-compatible',
            ...options,
            baseURL: options.baseURL,
        }).languageModel(model)
    }

    if (config.protocol === 'open-responses') {
        if (!options.baseURL) {
            throw new ProviderConfigError(`Provider "${config.name}" needs a base URL`)
        }
        const { baseURL, ...rest } = options
        return createOpenResponses({
            name: config.name || 'open-responses',
            url: baseURL,
            ...rest,
        }).languageModel(model)
    }

    if (config.protocol === 'ollama') {
        return createOllama(options).languageModel(model)
    }

    const factory = PROTOCOL_FACTORIES[config.protocol]
    if (!factory) {
        throw new ProviderConfigError(`Unsupported protocol "${config.protocol}"`)
    }
    return factory(options).languageModel(model)
}

/** The SDK provider name `providerOptions` must be keyed by for this config. */
export function getProviderOptionsKey(config: ProviderConfig): string {
    switch (config.protocol) {
        case 'google':
            return 'google'
        case 'bedrock':
            return 'amazon-bedrock'
        case 'openai-compatible':
        case 'open-responses':
            return config.name || config.protocol
        default:
            return config.protocol
    }
}
