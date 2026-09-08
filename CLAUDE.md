# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                      # package manager is pinned in package.json

pnpm dev-chromium                 # extension with HMR
pnpm dev-firefox                  # extension, watch build (no HMR)
pnpm dev-tauri                    # desktop shell with devtools

pnpm build-chrome                 # single chromium build
pnpm build-browser-extension      # tsc + chromium + firefox + zips (via make)
pnpm build-userscript             # single-file userscript
pnpm build-tauri                  # renderer + native bundle
pnpm clean                        # rm -rf dist

pnpm lint / pnpm lint:fix / pnpm format
pnpm sync-models                  # regenerate the model capability table (see below)
```

### Tests

`pnpm test` runs `vitest test`, where `test` is a **filename filter, not a subcommand** — it
silently runs only the files whose path contains "test" (2 of 7 files at time of writing). To run
the whole suite use vitest directly:

```bash
npx vitest run                                        # all tests
npx vitest run src/common/providers/__tests__         # one directory
npx vitest run -t 'prefers the vendor listing'        # one test by name
pnpm test:e2e                                         # playwright, ./e2e
```

Vitest config lives in `vite.config.ts` (`root: 'src'`, jsdom). Tests sit next to the code as
`*.spec.ts` or under `__tests__/`.

### Environment notes

-   `.gitattributes` pins every text file to LF in the working tree (`* text=auto eol=lf`),
    which overrides `core.autocrlf` — this checkout has it set to `true`, and without the
    override Prettier reported a `Delete ␍` error on every line of every file. If you ever see
    that noise return, the working tree predates the attributes file: `git add --renormalize .`
    then `git checkout-index -a -f` rewrites it.
-   ESLint runs on flat config (`eslint.config.mjs`); there is no `.eslintrc.js` or `.eslintignore`.
    Three rules are off with the reason inline: `baseui/deprecated-theme-api` and
    `baseui/deprecated-component-api` (the plugin's latest release calls `context.getAncestors()`,
    removed in ESLint 9, and throws) and `@typescript-eslint/no-unused-expressions` (fires on four
    pre-existing `guard && call()` sites).
-   **Native `Select` inside ShadowRoot** (`select-shadow-root.spec.tsx`). The popup card
    in the browser extension content script renders inside a ShadowRoot. The native `Select` component
    handles outside-click detection using `composedPath()` so that clicks inside the ShadowRoot
    do not prematurely dismiss the dropdown menu. `select-shadow-root.spec.tsx` tests this behavior.
-   Both extension targets are built by `@crxjs/vite-plugin` (`crx()`), with `browser: 'chrome'` /
    `browser: 'firefox'` selecting the background shape — Gecko wants `background.scripts`, Chrome
    wants `background.service_worker`, and `getManifest()` in `src/browser-extension/manifest.ts`
    emits both. Verify both after touching anything in the build: the two generated
    `manifest.json`s are the only place that divergence is visible.
-   Vite 8 bundles with Rolldown, not Rollup/esbuild. Two consequences already hit once:
    `build.minify: 'esbuild'` now throws `Cannot find package 'esbuild'` (use `'oxc'`), and
    `vite.config.ts` must import `defineConfig` from `vitest/config` — under `vite`'s own
    `defineConfig` the `test` key no longer typechecks. `rollupOptions` still works and is aliased
    to `rolldownOptions`. tsconfig `paths` resolve natively via `resolve.tsconfigPaths: true`, so
    there is no `vite-tsconfig-paths` plugin.
-   **`crx()` is configured with `contentScripts.injectCss: false` on purpose.** The popup card
    renders in a shadow root, and the browser's own content-script CSS injection targets the page
    document — outside the boundary, where it would both miss the card and leak into the host page.
    `false` keeps the stylesheets out of `content_scripts[].css` and puts them in
    `web_accessible_resources`, and `content_script/shadow-styles.ts` links them into the root
    itself (reading them back off the manifest in a build, mirroring Vite's `style[data-vite-dev-id]`
    tags under the dev server). Turning `injectCss` back on silently breaks style isolation.

## Architecture

### One codebase, five targets

`src/common/` is shared by every target; each target gets its own Vite config
(`vite.config.{chromium,firefox,tauri,userscript}.ts`). Extension surfaces live in
`src/browser-extension/`, the desktop renderer in `src/tauri/`, the Rust backend in `src-tauri/`,
and Safari/PopClip/SnipDo wrappers in `src-safari/` and `clip-extensions/`.

Platform differences are hidden behind three seams rather than `if (isTauri())` scattered through
features:

-   **`getBrowser()`** (`common/utils.ts`) → `common/polyfills/{tauri,electron,userscript}.ts` or
    `webextension-polyfill`. All settings go through `browser.storage.sync`; on Tauri that is a
    `config.json` written with a write-then-rename so a crash mid-write cannot brick the app.
-   **`getUniversalFetch()`** (`common/universal-fetch.ts`) → `backgroundFetch` (extension, proxies
    through the background page to escape CORS and returns a hand-rolled `Response`-like object
    **with no `headers`**), `tauriFetch` (Rust, honours the proxy settings), or `userscriptFetch`.
-   **`common/services/*`** pick between the direct `internal-services/*` implementation
    (desktop/userscript, where IndexedDB is reachable) and a background-RPC proxy (extension, where
    a content script cannot touch the extension's IndexedDB). Message names in
    `common/background/eventnames.ts`.

### Provider layer (`src/common/providers/`)

This is the part that most repays reading before changing anything LLM-related. The design goal is
that **no vendor- or model-specific adaptation lives in this repo**. Four layers, only the third of
which is hand-maintained:

1. **Protocol encoding — upstream.** `registry.ts` maps a `ProviderProtocol` to one of ~22
   `@ai-sdk/*` packages and returns a `LanguageModel`. How a reasoning effort, system prompt or
   stream chunk is spelled for a vendor is the SDK's problem. `createSDKFetch()` there adapts the
   app's fetchers to the SDK, including bolting a `Headers` onto `backgroundFetch`'s response.
2. **Model capabilities — upstream.** `model-capabilities.gen.ts` is **generated** by
   `pnpm sync-models` from `https://models.dev/api.json`; never hand-edit it. It answers only
   "which thinking settings may this model be offered", which no SDK exposes. `capabilities.ts`
   looks up a runtime-refreshed snapshot first, then the baked one.
3. **Intent → UI — local.** `toReasoningControl()` in `types.ts` turns raw capabilities into the
   control the settings UI renders (`effort` / `toggle` / `budget` / `fixed` / `unknown`).
4. **Escape hatch — user.** Each provider row carries free-form `providerOptions` JSON passed to
   the SDK verbatim, so a model newer than the last sync can be driven without a release.

`chat.ts` wraps `streamText` back into the callback shape (`onMessage`/`onError`/`onFinished`/
`onStatusCode`) that the translator UI consumes, so swapping the transport did not disturb
rendering, abort or error handling.

Two invariants worth preserving when editing `capability-packing.ts`:

-   Capability lookup is keyed by **(models.dev provider key, model id)** and only falls back to a
    cross-host index. Hosts disagree about the effort vocabulary of the same model on ~200 of ~720
    reasoning models, and a reseller usually advertises the gateway's superset. Unioning those makes
    every model look like it accepts every effort.
-   Disagreement resolves toward the **intersection**, and the vendor's own listing wins over a
    reseller's. Sending an effort the endpoint rejects is a hard request failure; omitting one it
    would have accepted only hides a UI option.

The packing logic is shared by `scripts/sync-models.ts` and the runtime refresh precisely so a
build-time snapshot and a user-triggered refresh cannot disagree.

### Providers are data, not code

`ISettings.providers` is a list of `ProviderConfig` rows (`id`, `name`, `protocol`, `baseURL`,
`apiKey`, `model`, `reasoning`, `providerOptions`, `headers`). Adding a vendor needs no code —
`catalog.ts` presets only prefill fields a user could type. Actions pin a provider by **id**
(`Action.providerId`), so one action can target a second instance of the same vendor with a
different key or reasoning level.

Consequences to keep in mind:

-   The extension can no longer ship a fixed `host_permissions` allowlist. `manifest.ts` declares
    only the hosts the app itself calls (TTS, detection, dictionary, models.dev) plus
    `optional_host_permissions`; `providers/permissions.ts` requests a provider's origin at runtime
    from a user gesture in settings.
-   The models.dev snapshot (~250KB) lives in IndexedDB via Dexie, not `storage.sync`, which caps at
    100KB total / 8KB per item.

### Local data

Dexie (`common/internal-services/db.ts`, database `openai-translator`) holds `vocabulary`,
`action`, `history` and `snapshot`. Bump `this.version(n).stores({...})` when adding a table.

Actions are user-editable prompt templates (role prompt + command prompt + rendering format);
built-in modes are seeded in `internal-services/action.ts` from `constants.ts`. `common/translate.ts`
builds the prompts and dispatches to the provider layer.

## Conventions

TypeScript + React 18 with Styletron/baseui and react-jss. Prettier enforces 4-space indent,
single quotes, no semicolons, trailing commas, 120 columns. Components `PascalCase`, hooks and
utilities `camelCase`, constants `SCREAMING_SNAKE_CASE`. Reuse helpers from `src/common` rather
than duplicating per target.

Commits follow a lightweight conventional pattern (`fix:`, `feat:`, `chore:`) with an optional
scope and an issue reference in parentheses, e.g. `fix(windows): explain a broken WebView2 Runtime`.
PRs should state platform coverage across Chrome, Firefox and Tauri.
