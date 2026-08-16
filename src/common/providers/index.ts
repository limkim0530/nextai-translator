/**
 * Resolving a configured provider, and the small amount of shared plumbing the
 * rest of the app needs from this module.
 */
import { v4 as uuidv4 } from 'uuid'
import type { ISettings } from '../types'
import { getSettings } from '../utils'
import { getPreset, PROVIDER_PRESETS, type ProviderPreset } from './catalog'
import type { ProviderConfig } from './types'

export * from './types'
export { PROVIDER_PRESETS, getPreset } from './catalog'
export type { ProviderPreset } from './catalog'
export { streamChat, type ChatRequest } from './chat'
export { createLanguageModel, ProviderConfigError } from './registry'
export {
    getModelCapabilities,
    getReasoningControl,
    refreshModelCapabilities,
    getCapabilitySnapshotDate,
} from './capabilities'

export class NoProviderConfiguredError extends Error {
    constructor() {
        super('No provider configured')
        this.name = 'NoProviderConfiguredError'
    }
}

/**
 * Pick the provider a request should use.
 *
 * `providerId` is an explicit per-action override. A stale id — the provider it
 * named was deleted — deliberately falls back to the default rather than
 * failing, so removing a provider never silently breaks unrelated actions.
 */
export function resolveProvider(settings: ISettings, providerId?: string): ProviderConfig {
    const providers = settings.providers ?? []
    if (providers.length === 0) {
        throw new NoProviderConfiguredError()
    }
    if (providerId) {
        const explicit = providers.find((p) => p.id === providerId)
        if (explicit) {
            return explicit
        }
    }
    return providers.find((p) => p.id === settings.defaultProviderId) ?? providers[0]
}

export async function getProvider(providerId?: string): Promise<ProviderConfig> {
    return resolveProvider(await getSettings(), providerId)
}

/** A new provider row seeded from a preset, ready to be appended to settings. */
export function createProviderFromPreset(presetId: string, overrides: Partial<ProviderConfig> = {}): ProviderConfig {
    const preset: ProviderPreset | undefined = getPreset(presetId)
    return {
        id: uuidv4(),
        name: preset?.name ?? 'New provider',
        protocol: preset?.protocol ?? 'openai-compatible',
        baseURL: preset?.baseURL,
        catalogKey: preset?.catalogKey,
        model: preset?.defaultModel ?? '',
        ...overrides,
    }
}

/** Whether a provider row is complete enough to attempt a request. */
export function isProviderUsable(config: ProviderConfig | undefined): config is ProviderConfig {
    if (!config?.model?.trim()) {
        return false
    }
    const preset = PROVIDER_PRESETS.find((p) => p.protocol === config.protocol && p.baseURL === config.baseURL)
    if (preset?.keyless) {
        return true
    }
    // Local endpoints conventionally need no credentials; requiring one here
    // would block the common Ollama / LM Studio / vLLM setups.
    const url = config.baseURL ?? ''
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/.test(url)) {
        return true
    }
    return !!config.apiKey?.trim()
}

/**
 * Whether the active provider talks to OpenAI's own endpoint.
 *
 * Only used to decide whether the "OpenAI is unavailable in your region"
 * notice is relevant: a proxy or an OpenAI-compatible gateway is reached from
 * somewhere else, so the notice would be misleading there.
 */
export async function isUsingOpenAIOfficial(): Promise<boolean> {
    const settings = await getSettings()
    const provider = settings.providers?.find((p) => p.id === settings.defaultProviderId) ?? settings.providers?.[0]
    if (!provider || provider.protocol !== 'openai') {
        return false
    }
    const url = provider.baseURL?.trim()
    return !url || /^https?:\/\/api\.openai\.com/i.test(url)
}

/** Display label for a provider id, for UI that only stores the id. */
export function getProviderLabel(settings: ISettings, providerId: string | undefined): string | undefined {
    if (!providerId) {
        return undefined
    }
    return settings.providers?.find((p) => p.id === providerId)?.name
}
