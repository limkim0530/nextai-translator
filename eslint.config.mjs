import js from '@eslint/js'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Flat config, ported 1:1 from the old .eslintrc.js + .eslintignore. ESLint 9
// no longer reads either file, so the ignore patterns live in `ignores` below.
export default tseslint.config(
    { ignores: ['public/**', 'dist/**', 'src/tauri/bindings.ts', 'src-safari/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    reactPlugin.configs.flat.recommended,
    // Bundles eslint-config-prettier's rule shut-offs alongside prettier/prettier,
    // which is what `extends: [..., 'prettier']` used to provide. Keep it last.
    prettierRecommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.node },
            parserOptions: {
                // typescript-eslint 8's replacement for `project: true`.
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        // Neither plugin ships a flat config export, so mount them by hand.
        plugins: {
            'react-hooks': reactHooks,
        },
        settings: {
            'import/resolver': {
                typescript: {},
            },
            'react': {
                version: 'detect',
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'camelcase': 'error',
            'eqeqeq': ['error', 'always'],
            'no-duplicate-imports': 'error',
            'prettier/prettier': 'error',
            // typescript-eslint 8 added no-unused-expressions to `recommended`.
            // It fires on four pre-existing `guard && call()` short-circuits plus
            // the deliberate `browser.runtime.lastError` read that clears Chrome's
            // error state. Off here to keep this a dependency bump; turning it on
            // is a separate cleanup.
            '@typescript-eslint/no-unused-expressions': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
            'spaced-comment': ['error', 'always', { markers: ['/'] }],
        },
    },
    {
        // `.prettierrc.cjs` and this file are plain JS, and tsconfig sets
        // `allowJs: false`, so no TS project will ever claim them — the project
        // service above would fail to parse them with "was not found by the
        // project service". Nothing here needs type information anyway; the
        // type-aware rule sets are not enabled.
        files: ['**/*.{js,cjs,mjs}'],
        languageOptions: {
            parserOptions: {
                projectService: false,
            },
        },
    }
)
