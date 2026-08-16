import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { fileURLToPath, URL } from 'url'
import { getManifest } from './src/browser-extension/manifest'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
    plugins: [
        react(),
        svgr(),
        crx({
            manifest: getManifest('chromium'),
            browser: 'chrome',
        }),
    ],
    resolve: {
        // Vite 8 resolves tsconfig `paths` natively; vite-tsconfig-paths is gone.
        tsconfigPaths: true,
        alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
    },
    build: {
        minify: !isDev,
        sourcemap: isDev,
        target: 'chrome105',
        outDir: 'dist/browser-extension/chromium',
        emptyOutDir: true,
    },
})
