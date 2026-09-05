import { defineConfig, normalizePath } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { fileURLToPath, URL } from 'url'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), svgr()],
    resolve: {
        // Vite 8 resolves tsconfig `paths` natively; vite-tsconfig-paths is gone.
        tsconfigPaths: true,
        alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    // prevent vite from obscuring rust errors
    clearScreen: false,
    // tauri expects a fixed port, fail if that port is not available
    server: {
        port: 3333,
        strictPort: true,
    },
    // to make use of `TAURI_DEBUG` and other env variables
    // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
        // Tauri supports es2021, upgraded to es2020 for async generators
        target: ['es2020', 'chrome87', 'safari14'],
        // don't minify for debug builds
        // Vite 8 dropped esbuild as a bundled dependency; 'esbuild' here now
        // fails with "Cannot find package 'esbuild'" unless it is installed
        // separately. 'oxc' is the in-tree minifier that replaced it.
        minify: !process.env.TAURI_DEBUG ? 'oxc' : false,
        // produce sourcemaps for debug builds
        sourcemap: !!process.env.TAURI_DEBUG,
        rollupOptions: {
            input: [
                normalizePath(path.resolve(__dirname, 'src/tauri/dummy.html')),
                normalizePath(path.resolve(__dirname, 'src/tauri/index.html')),
            ],
            output: {
                dir: 'dist/tauri',
            },
        },
    },
})
