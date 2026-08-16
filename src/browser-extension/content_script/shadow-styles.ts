/**
 * Gets the popup card's stylesheets into its shadow root.
 *
 * The card renders inside a shadow root so that arbitrary host-page CSS cannot
 * reach it, which also means the browser's own content-script stylesheet
 * injection is useless here — that targets the page document, outside the
 * boundary. So `crx()` is configured with `contentScripts.injectCss: false`,
 * which keeps the stylesheets out of `content_scripts[].css` and lists them in
 * `web_accessible_resources` instead, and this module links them in by hand.
 *
 * Replaces the two `@samrum/vite-plugin-web-extension` client APIs the card used
 * to depend on: the `PLUGIN_WEB_EXT_CHUNK_CSS_PATHS` build-time constant and
 * `addViteStyleTarget`. crxjs ships no equivalent of either.
 */
import * as utils from '@/common/utils'

/**
 * Build output: link the CSS chunks crxjs listed in `web_accessible_resources`.
 *
 * `getManifest` is absent on every non-extension polyfill, so the userscript
 * build (which shares this content script and lets vite-plugin-monkey handle its
 * own styles) falls through here without doing anything.
 */
async function linkBuiltStylesheets(shadowRoot: ShadowRoot) {
    const browser = await utils.getBrowser()
    const manifest = browser.runtime.getManifest?.()
    if (!manifest) {
        return
    }

    // MV2 spells this `string[]` and MV3 `{ resources: string[] }[]`; accept both
    // so the reader does not depend on which one the target browser reports.
    const resources: string[] = (manifest.web_accessible_resources ?? []).flatMap(
        (entry: string | { resources?: string[] }) => (typeof entry === 'string' ? [entry] : (entry.resources ?? []))
    )

    for (const cssPath of resources.filter((resource) => resource.endsWith('.css'))) {
        const styleEl = document.createElement('link')
        styleEl.setAttribute('rel', 'stylesheet')
        styleEl.setAttribute('href', browser.runtime.getURL(cssPath))
        shadowRoot.appendChild(styleEl)
    }
}

/**
 * Dev server: Vite serves CSS as `<style data-vite-dev-id>` appended to the
 * page's `<head>`, which the shadow boundary blocks, so the card would render
 * unstyled under `pnpm dev-chromium`. Mirror those tags into the root and keep
 * mirroring, since HMR both appends new ones and rewrites existing ones in place.
 */
function mirrorDevStylesheets(shadowRoot: ShadowRoot) {
    const mirrored = new Map<string, HTMLStyleElement>()

    const sync = () => {
        document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]').forEach((source) => {
            const id = source.dataset.viteDevId
            if (!id) {
                return
            }
            let clone = mirrored.get(id)
            if (!clone) {
                clone = document.createElement('style')
                clone.dataset.viteDevId = id
                mirrored.set(id, clone)
                shadowRoot.appendChild(clone)
            }
            if (clone.textContent !== source.textContent) {
                clone.textContent = source.textContent
            }
        })
    }

    sync()
    new MutationObserver(sync).observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
    })
}

export async function addShadowStyleTarget(shadowRoot: ShadowRoot) {
    if (import.meta.hot) {
        mirrorDevStylesheets(shadowRoot)
        return
    }
    await linkBuiltStylesheets(shadowRoot)
}
