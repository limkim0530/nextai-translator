/**
 * Streams a completion from a configured provider, in the callback shape the
 * translator UI already consumes.
 *
 * The callback surface is kept deliberately identical to the engine interface
 * it replaces so the UI keeps its incremental rendering, abort handling and
 * error reporting unchanged; only what happens below this function moved.
 */
import { streamText, type JSONValue } from 'ai'
import { createLanguageModel, getProviderOptionsKey, ProviderConfigError } from './registry'
import type { ProviderConfig } from './types'

export interface ChatRequest {
    /** System prompt. Sent as `system`, not folded into the user turn. */
    rolePrompt: string
    commandPrompt: string
    signal: AbortSignal
    onMessage: (message: { content: string; role: string; isFullText?: boolean }) => Promise<void>
    onError: (error: string) => void
    onFinished: (reason: string) => void
    onStatusCode?: (statusCode: number) => void
}

/**
 * Some OpenAI-compatible hosts emit chain-of-thought inline in the content
 * instead of as a separate reasoning channel. Native reasoning parts are
 * already filtered out by only forwarding `text-delta`, so this only has to
 * catch the inline case.
 */
const THINK_BLOCK = /^[\s\S]*?<\/think>/

/** Pull a human-usable message out of whatever the SDK or a provider threw. */
function describeError(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === 'string') {
        return error
    }
    if (error && typeof error === 'object') {
        const record = error as Record<string, unknown>
        const nested = record.error
        if (nested && nested !== error) {
            return describeError(nested)
        }
        for (const key of ['message', 'detail', 'reason']) {
            const value = record[key]
            if (typeof value === 'string' && value) {
                return value
            }
        }
        try {
            return JSON.stringify(error)
        } catch {
            // fall through
        }
    }
    return 'Unknown error'
}

/**
 * Dig the HTTP status out of an SDK error.
 *
 * The UI keys its "credentials were rejected" hint off 401/403/422, and with
 * the SDK owning the transport this is the only place that status is still
 * visible — an unwrapped error surfaces as a bare message with no status.
 */
function extractStatusCode(error: unknown): number | undefined {
    let current = error
    for (let depth = 0; current && typeof current === 'object' && depth < 5; depth++) {
        const record = current as Record<string, unknown>
        if (typeof record.statusCode === 'number') {
            return record.statusCode
        }
        if (typeof record.status === 'number') {
            return record.status
        }
        current = record.cause ?? record.error
    }
    return undefined
}

export async function streamChat(config: ProviderConfig, req: ChatRequest): Promise<void> {
    let model
    try {
        model = createLanguageModel(config)
    } catch (e) {
        req.onError(e instanceof ProviderConfigError ? e.message : describeError(e))
        req.onFinished('error')
        return
    }

    const providerOptions =
        config.providerOptions && Object.keys(config.providerOptions).length
            ? { [getProviderOptionsKey(config)]: config.providerOptions as Record<string, JSONValue> }
            : undefined

    // `provider-default` means "send nothing and let the endpoint decide" — the
    // safe choice for models whose knobs we cannot verify, and the only correct
    // one for models that publish no knob at all.
    const reasoning = config.reasoning && config.reasoning !== 'provider-default' ? config.reasoning : undefined

    let sawText = false
    let pendingThink = ''
    let inThinkBlock = false

    try {
        const result = streamText({
            model,
            system: req.rolePrompt || undefined,
            prompt: req.commandPrompt,
            reasoning,
            providerOptions,
            abortSignal: req.signal,
            // The UI drives its own retry/abort story and a silent retry would
            // duplicate a paid request mid-translation.
            maxRetries: 0,
        })

        for await (const part of result.fullStream) {
            if (req.signal.aborted) {
                return
            }
            switch (part.type) {
                case 'text-delta': {
                    let text = part.text
                    if (!text) {
                        break
                    }
                    // Swallow an inline <think> block until it closes, so the
                    // user never sees reasoning rendered as the translation.
                    if (!sawText && (inThinkBlock || /^\s*<think>/.test(pendingThink + text))) {
                        inThinkBlock = true
                        pendingThink += text
                        const closed = pendingThink.match(THINK_BLOCK)
                        if (!closed) {
                            break
                        }
                        text = pendingThink.slice(closed[0].length)
                        pendingThink = ''
                        inThinkBlock = false
                        if (!text) {
                            break
                        }
                    }
                    sawText = true
                    await req.onMessage({ content: text, role: 'assistant' })
                    break
                }
                case 'error': {
                    const status = extractStatusCode(part.error)
                    if (status !== undefined) {
                        req.onStatusCode?.(status)
                    }
                    req.onError(describeError(part.error))
                    req.onFinished('error')
                    return
                }
                case 'abort': {
                    return
                }
                case 'finish': {
                    // A request that got this far authenticated successfully;
                    // say so explicitly, or a stale auth warning from a previous
                    // attempt would linger after the user fixes the key.
                    req.onStatusCode?.(200)
                    req.onFinished(part.finishReason ?? 'stop')
                    return
                }
                default:
                    break
            }
        }
        // A stream that ends without a `finish` part still has to close out the
        // UI, or the translation renders as permanently in-flight.
        req.onFinished('stop')
    } catch (e) {
        if (req.signal.aborted) {
            return
        }
        const status = extractStatusCode(e)
        if (status !== undefined) {
            req.onStatusCode?.(status)
        }
        req.onError(describeError(e))
        req.onFinished('error')
    }
}
