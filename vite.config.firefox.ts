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
        // `browser: 'firefox'` is what keeps `background.scripts` (which Gecko
        // wants) from being rewritten into Chrome's `background.service_worker`.
        crx({
            manifest: getManifest('firefox'),
            browser: 'firefox',
            // See the chromium config: shadow-root styles, so keep crxjs out of
            // `content_scripts[].css`.
            contentScripts: { injectCss: false },
        }),
    ],
    resolve: {
        // Vite 8 resolves tsconfig `paths` natively; vite-tsconfig-paths is gone.
        tsconfigPaths: true,
        alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
    },
    build: {
        assetsInlineLimit: 1024 * 1024, // 1mb
        minify: !isDev,
        sourcemap: isDev,
        target: 'chrome105',
        outDir: 'dist/browser-extension/firefox',
        emptyOutDir: true,
    },
})
