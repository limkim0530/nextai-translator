/**
 * Model capability lookup: "which thinking settings may this model be offered?"
 *
 * Two sources, in priority order:
 *   1. a runtime snapshot the user refreshed from models.dev (if any)
 *   2. the snapshot baked in at build time by `pnpm sync-models`
 *
 * The runtime layer exists because model releases outpace app releases. Without
 * it, a model that shipped the day after a build would fall into the `unknown`
 * branch and lose its published effort ladder until the next release.
 */
import { getLocalDB } from '../internal-services/db'
import { getUniversalFetch } from '../universal-fetch'
import {
    buildCapabilityTables,
    normalizeModelId,
    type CapabilityTables,
    type PackedCaps,
    type RawCatalog,
} from './capability-packing'
import { PACKED_CAPS_BY_MODEL, PACKED_CAPS_BY_PROVIDER, MODELS_DEV_SNAPSHOT } from './model-capabilities.gen'
import { toReasoningControl, type ProviderConfig, type ReasoningControl } from './types'

export const MODELS_DEV_API = 'https://models.dev/api.json'

/** IndexedDB row key holding the user-refreshed snapshot. */
const RUNTIME_SNAPSHOT_KEY = 'model-capabilities'

export interface CapabilitySnapshot {
    /** ISO date the snapshot was fetched. */
    fetchedAt: string
    tables: CapabilityTables
}

/**
 * Parsing the baked tables costs ~250KB of JSON, so it is deferred until the
 * first lookup and then held for the life of the context.
 */
let bakedTables: CapabilityTables | undefined
function getBakedTables(): CapabilityTables {
    if (!bakedTables) {
        bakedTables = {
            byProvider: JSON.parse(PACKED_CAPS_BY_PROVIDER),
            byModel: JSON.parse(PACKED_CAPS_BY_MODEL),
        }
    }
    return bakedTables
}

let runtimeSnapshot: CapabilitySnapshot | null | undefined

async function getRuntimeSnapshot(): Promise<CapabilitySnapshot | null> {
    if (runtimeSnapshot !== undefined) {
        return runtimeSnapshot
    }
    try {
        const row = await getLocalDB().snapshot.get(RUNTIME_SNAPSHOT_KEY)
        runtimeSnapshot = row ? (JSON.parse(row.payload) as CapabilitySnapshot) : null
    } catch {
        // A corrupt or unreadable snapshot must never block translation; the
        // baked table is always a valid answer.
        runtimeSnapshot = null
    }
    return runtimeSnapshot
}

/**
 * Pull a fresh catalog from models.dev and persist it.
 *
 * Returns the number of reasoning-capable models ingested so the settings UI
 * can report something concrete.
 */
export async function refreshModelCapabilities(): Promise<{ models: number; fetchedAt: string }> {
    const fetcher = getUniversalFetch()
    const resp = await fetcher(MODELS_DEV_API, { method: 'GET' })
    if (resp.status !== 200) {
        throw new Error(`models.dev returned ${resp.status}`)
    }
    const catalog = (await resp.json()) as RawCatalog
    const tables = buildCapabilityTables(catalog)
    const models = Object.values(tables.byProvider).reduce((sum, rows) => sum + Object.keys(rows).length, 0)
    if (models === 0) {
        throw new Error('models.dev returned an empty catalog')
    }

    const snapshot: CapabilitySnapshot = { fetchedAt: new Date().toISOString(), tables }
    await getLocalDB().snapshot.put({
        key: RUNTIME_SNAPSHOT_KEY,
        payload: JSON.stringify(snapshot),
        updatedAt: Date.now(),
    })
    runtimeSnapshot = snapshot
    return { models, fetchedAt: snapshot.fetchedAt }
}

/** Date of the capability data currently in effect, for display in settings. */
export async function getCapabilitySnapshotDate(): Promise<{ date: string; source: 'runtime' | 'baked' }> {
    const snapshot = await getRuntimeSnapshot()
    if (snapshot) {
        return { date: snapshot.fetchedAt.slice(0, 10), source: 'runtime' }
    }
    return { date: MODELS_DEV_SNAPSHOT, source: 'baked' }
}

function lookupIn(tables: CapabilityTables, catalogKey: string | undefined, model: string): PackedCaps | undefined {
    // An exact (provider, model) hit is authoritative. It matters more than it
    // looks: hosts disagree about the effort vocabulary of the same model on
    // roughly a quarter of reasoning models, and the reseller's list is usually
    // the gateway's superset rather than what the model accepts.
    if (catalogKey) {
        const exact = tables.byProvider[catalogKey]?.[model]
        if (exact) {
            return exact
        }
        const rows = tables.byProvider[catalogKey]
        if (rows) {
            const normalized = normalizeModelId(model)
            for (const [id, caps] of Object.entries(rows)) {
                if (normalizeModelId(id) === normalized) {
                    return caps
                }
            }
        }
    }
    return tables.byModel[normalizeModelId(model)]
}

/** Raw capabilities for a model, or `undefined` when the catalog has no entry. */
export async function getModelCapabilities(model: string, catalogKey?: string): Promise<PackedCaps | undefined> {
    if (!model) {
        return undefined
    }
    const snapshot = await getRuntimeSnapshot()
    if (snapshot) {
        const hit = lookupIn(snapshot.tables, catalogKey, model)
        if (hit) {
            return hit
        }
    }
    return lookupIn(getBakedTables(), catalogKey, model)
}

/** The thinking control the settings UI should render for a provider config. */
export async function getReasoningControl(
    config: Pick<ProviderConfig, 'model' | 'catalogKey'>
): Promise<ReasoningControl> {
    const caps = await getModelCapabilities(config.model, config.catalogKey)
    return toReasoningControl(caps)
}
