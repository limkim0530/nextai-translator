import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { fileURLToPath, URL } from 'url'
import { getManifest } from './src/browser-extension/manifest.ts'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
    plugins: [
        react(),
        svgr(),
        crx({
            manifest: getManifest('chromium'),
            browser: 'chrome',
            // The popup card lives in a shadow root, so its stylesheets must be
            // linked into that root, not the host page. `false` keeps crxjs from
            // declaring them in `content_scripts[].css` (which the browser would
            // inject into the page) and puts them in `web_accessible_resources`
            // instead, where the content script fetches them itself.
            contentScripts: { injectCss: false },
        }),
    ],
    resolve: {
        // Vite 8 resolves tsconfig `paths` natively; vite-tsconfig-paths is gone.
        tsconfigPaths: true,
        alias: [
            { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
            {
                find: '@aptabase/tauri',
                replacement: fileURLToPath(new URL('./src/common/polyfills/aptabase-mock.ts', import.meta.url)),
            },
        ],
    },
    build: {
        minify: !isDev,
        modulePreload: false, // 禁用 modulepreload 标签，消除 Chromium 控制台的 cross-world 警告
        sourcemap: isDev,
        target: 'chrome105',
        outDir: 'dist/browser-extension/chromium',
        emptyOutDir: true,
        chunkSizeWarningLimit: 8000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('tiktoken')) {
                            return 'tiktoken'
                        }
                        if (id.includes('@ai-sdk') || id.includes('ai-sdk-ollama') || id.includes('/ai/')) {
                            return 'ai-sdk'
                        }
                        if (id.includes('dexie')) {
                            return 'dexie'
                        }
                        if (
                            id.includes('react') ||
                            id.includes('styletron') ||
                            id.includes('katex') ||
                            id.includes('lucide') ||
                            id.includes('rehype') ||
                            id.includes('remark') ||
                            id.includes('micromark') ||
                            id.includes('unist') ||
                            id.includes('hast') ||
                            id.includes('mdast')
                        ) {
                            return 'ui-vendor'
                        }
                        return 'vendor'
                    }
                },
            },
        },
    },
})
