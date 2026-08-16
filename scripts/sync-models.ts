/**
 * Regenerate the model reasoning-capability table from models.dev.
 *
 * Run with `pnpm sync-models`. The generated file is a build artifact — never
 * hand-edit it; change this script (or `capability-packing.ts`) and regenerate.
 *
 * Why an upstream catalog at all: every vendor spells "think less" differently
 * and each model generation accepts a different vocabulary, so the only thing
 * that stops the app from hardcoding a regex per model is a machine-readable
 * registry of what each model actually accepts. models.dev publishes exactly
 * that as `reasoning_options`, which is why its three option kinds (`effort` /
 * `toggle` / `budget_tokens`) are mirrored 1:1 rather than remapped.
 *
 * The wire encoding is deliberately NOT captured here: the AI SDK provider
 * packages already translate a normalized effort into each vendor's payload.
 * This table only answers "which choices may the user be offered", which is
 * what the settings UI needs and what no SDK exposes.
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCapabilityTables, type RawCatalog } from '../src/common/providers/capability-packing.ts'

const MODELS_DEV_API = 'https://models.dev/api.json'
const OUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/common/providers/model-capabilities.gen.ts')

async function main() {
    process.stdout.write(`fetching ${MODELS_DEV_API} ...\n`)
    const resp = await fetch(MODELS_DEV_API)
    if (!resp.ok) {
        throw new Error(`models.dev returned ${resp.status} ${resp.statusText}`)
    }
    const catalog = (await resp.json()) as RawCatalog
    const { byProvider, byModel } = buildCapabilityTables(catalog)

    const modelCount = Object.values(byProvider).reduce((sum, rows) => sum + Object.keys(rows).length, 0)
    const snapshot = new Date().toISOString().slice(0, 10)

    // Emitted as JSON string literals rather than object literals: the payload
    // is inert data, and JSON.parse of one big string is both smaller in the
    // bundle and faster to evaluate than an equivalent JS object literal.
    //
    // Wrapped in single quotes on purpose — JSON is full of double quotes, and
    // letting JSON.stringify escape every one of them inflated this file by
    // ~20%. Only backslashes and single quotes need escaping this way.
    const toLiteral = (value: unknown) => `'${JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

    const source = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Model reasoning capabilities ingested from ${MODELS_DEV_API}.
 * Regenerate with \`pnpm sync-models\`.
 *
 * Snapshot: ${snapshot}
 * Providers: ${Object.keys(byProvider).length} · Reasoning models: ${modelCount}
 */
/* eslint-disable */

export const MODELS_DEV_SNAPSHOT = '${snapshot}'

/** models.dev provider key -> upstream model id -> packed capabilities. */
export const PACKED_CAPS_BY_PROVIDER = ${toLiteral(byProvider)}

/** Normalized model id -> packed capabilities, for endpoints with no known provider key. */
export const PACKED_CAPS_BY_MODEL = ${toLiteral(byModel)}
`

    writeFileSync(OUT_PATH, source, 'utf8')
    process.stdout.write(
        `wrote ${OUT_PATH}\n` +
            `  providers: ${Object.keys(byProvider).length}\n` +
            `  reasoning models: ${modelCount}\n` +
            `  fallback keys: ${Object.keys(byModel).length}\n` +
            `  size: ${(source.length / 1024).toFixed(0)} KB\n`
    )
}

main().catch((e) => {
    process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`)
    process.exit(1)
})
