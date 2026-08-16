/**
 * Runtime host permissions for user-supplied endpoints.
 *
 * The extension can no longer ship a fixed `host_permissions` allowlist: the
 * whole point of user-defined providers is that the target host is unknown at
 * build time. MV3's answer is `optional_host_permissions` plus a request made
 * from a user gesture, which is what this module wraps.
 *
 * Every other target (desktop, userscript) is unaffected — Tauri fetches
 * through Rust and a userscript through `GM_xmlhttpRequest`, neither of which
 * consults this.
 */
import { isDesktopApp, isUserscript } from '../utils'
import { normalizeBaseURL, PROTOCOL_DEFAULT_BASE_URL } from './endpoints'
import type { ProviderConfig } from './types'

/** `https://host/*`, the origin pattern `permissions.request` expects. */
export function toOriginPattern(url: string): string | undefined {
    try {
        const parsed = new URL(url)
        return `${parsed.protocol}//${parsed.host}/*`
    } catch {
        return undefined
    }
}

export function getProviderOrigin(config: ProviderConfig): string | undefined {
    const url = normalizeBaseURL(config.baseURL, config.protocol) ?? PROTOCOL_DEFAULT_BASE_URL[config.protocol]
    return url ? toOriginPattern(url) : undefined
}

function isExtension(): boolean {
    return !isDesktopApp() && !isUserscript()
}

/** Whether the extension may already call this provider's host. */
export async function hasHostPermission(config: ProviderConfig): Promise<boolean> {
    if (!isExtension()) {
        return true
    }
    const origin = getProviderOrigin(config)
    if (!origin) {
        return true
    }
    try {
        const browser = (await import('webextension-polyfill')).default
        return await browser.permissions.contains({ origins: [origin] })
    } catch {
        // Firefox MV2 and older polyfills may not expose the API; assume the
        // manifest already covers it rather than blocking the request.
        return true
    }
}

/**
 * Request host permission if it is missing.
 *
 * Must be called from a user gesture (a click in settings). Resolves to whether
 * the permission is held afterwards; callers proceed either way, since a denial
 * still produces a clearer error at request time than a silent block.
 */
export async function ensureHostPermission(config: ProviderConfig): Promise<boolean> {
    if (!isExtension()) {
        return true
    }
    const origin = getProviderOrigin(config)
    if (!origin) {
        return true
    }
    try {
        const browser = (await import('webextension-polyfill')).default
        if (await browser.permissions.contains({ origins: [origin] })) {
            return true
        }
        return await browser.permissions.request({ origins: [origin] })
    } catch {
        return true
    }
}
