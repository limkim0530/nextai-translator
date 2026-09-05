import { findPreset } from './catalog'
import { isBaseURLRequired } from './endpoints'
import type { ProviderConfig } from './types'

export type ProviderRequiredField = 'name' | 'baseURL' | 'apiKey' | 'model'
export type ProviderField = ProviderRequiredField

export interface ProviderFieldError {
    field: ProviderRequiredField
    messageKey: string
}

export interface ProviderValidationError extends ProviderFieldError {
    providerId: string
    providerName: string
}

/** Whether this provider configuration requires an API key. */
export function isApiKeyRequired(config: ProviderConfig | undefined): boolean {
    if (!config) {
        return false
    }
    const preset = findPreset(config)
    if (preset?.keyless) {
        return false
    }
    const url = config.baseURL ?? ''
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/.test(url)) {
        return false
    }
    return true
}

/**
 * Validate a single provider configuration against its required fields.
 */
export function validateProvider(config: ProviderConfig | undefined): ProviderFieldError[] {
    if (!config) {
        return []
    }
    const errors: ProviderFieldError[] = []
    if (!config.name?.trim()) {
        errors.push({ field: 'name', messageKey: 'Name is required' })
    }
    if (isBaseURLRequired(config.protocol) && !config.baseURL?.trim()) {
        errors.push({ field: 'baseURL', messageKey: 'Base URL is required' })
    }
    if (isApiKeyRequired(config) && !config.apiKey?.trim()) {
        errors.push({ field: 'apiKey', messageKey: 'API Key is required' })
    }
    if (!config.model?.trim()) {
        errors.push({ field: 'model', messageKey: 'Model is required' })
    }
    return errors
}

/**
 * Validate an array of provider configurations.
 */
export function validateProviders(providers: ProviderConfig[]): ProviderValidationError[] {
    const allErrors: ProviderValidationError[] = []
    for (const provider of providers) {
        const errors = validateProvider(provider)
        for (const err of errors) {
            allErrors.push({
                ...err,
                providerId: provider.id,
                providerName: provider.name?.trim() || 'Unnamed',
            })
        }
    }
    return allErrors
}
