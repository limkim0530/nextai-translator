/* eslint-disable camelcase */
import { version } from '../../package.json'

export function getManifest(browser: 'firefox' | 'chromium') {
    const manifest = {
        manifest_version: 3,

        name: 'NextAI Translator',
        description: `NextAI-Translator is a browser extension that uses the ChatGPT API for translation.`,
        version: version,

        icons: {
            '16': 'icon.png',
            '32': 'icon.png',
            '48': 'icon.png',
            '128': 'icon.png',
        },

        options_ui: {
            page: 'src/browser-extension/options/index.html',
            open_in_tab: true,
        },

        action: {
            default_icon: 'icon.png',
            default_popup: 'src/browser-extension/popup/index.html',
        },

        content_scripts: [
            {
                matches: ['<all_urls>'],
                all_frames: true,
                match_about_blank: true,
                js: ['src/browser-extension/content_script/index.tsx'],
            },
        ],

        background: {
            service_worker: 'src/browser-extension/background/index.ts',
        },

        permissions: ['storage', 'contextMenus'],

        commands: {
            'open-popup': {
                suggested_key: {
                    default: 'Ctrl+Shift+Y',
                    mac: 'Command+Shift+Y',
                },
                description: 'Open the popup',
            },
        },

        // Only what the app itself calls regardless of which LLM provider the
        // user configures: TTS, language detection and the dictionary lookup.
        // LLM endpoints are no longer listed here — a user-defined provider can
        // point anywhere, so its origin is requested at runtime instead (see
        // `providers/permissions.ts`).
        host_permissions: [
            '*://speech.platform.bing.com/',
            'https://*.githubusercontent.com/',
            'https://*.baidu.com/',
            'https://api-edge.cognitive.microsofttranslator.com/',
            'https://*.microsoft.com/',
            'https://*.google.com/',
            'https://models.dev/',
            'https://api.dictionaryapi.dev/',
        ],

        optional_host_permissions: ['http://*/*', 'https://*/*'],
    }

    if (browser === 'firefox') {
        return {
            ...manifest,
            browser_specific_settings: {
                gecko: {
                    id: 'openaitranslator@gmail.com',
                },
            },
            // Gecko runs MV3 background as persistent scripts rather than a
            // service worker; `crx({ browser: 'firefox' })` leaves this shape
            // alone instead of rewriting it into `service_worker`.
            background: {
                scripts: ['src/browser-extension/background/index.ts'],
            },
        }
    }
    return manifest
}
