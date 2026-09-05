import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'baseui/button'
import { Input } from 'baseui/input'
import { Select } from 'baseui/select'
import { Textarea } from 'baseui/textarea'
import { Tag, HIERARCHY as TAG_HIERARCHY } from 'baseui/tag'
import { createUseStyles } from 'react-jss'
import { IoMdAdd } from 'react-icons/io'
import { RiDeleteBin5Line } from 'react-icons/ri'
import { IoRefreshSharp } from 'react-icons/io5'
import toast from 'react-hot-toast'
import { useTheme } from '../hooks/useTheme'
import { ProviderIcon } from './ProviderIcon'
import type { IThemedStyleProps } from '../types'
import {
    createProviderFromPreset,
    getReasoningControl,
    PROVIDER_PRESETS,
    refreshModelCapabilities,
    getCapabilitySnapshotDate,
    type ProviderConfig,
    type ProviderProtocol,
    type ReasoningControl,
    type ReasoningSelection,
} from '../providers'
import { listModels, type ModelOption } from '../providers/models'
import { normalizeBaseURL } from '../providers/endpoints'
import { dropCachedModels, getCachedModels, putCachedModels } from '../providers/model-cache'
import { ensureHostPermission } from '../providers/permissions'

const PROTOCOLS: ProviderProtocol[] = [
    'openai',
    'openai-compatible',
    'open-responses',
    'anthropic',
    'google',
    'azure',
    'bedrock',
    'xai',
    'mistral',
    'cohere',
    'groq',
    'deepseek',
    'cerebras',
    'fireworks',
    'togetherai',
    'deepinfra',
    'perplexity',
    'replicate',
    'vercel',
    'alibaba',
    'moonshotai',
    'huggingface',
    'ollama',
]

/**
 * Display names for protocols whose id understates what they do. The id itself
 * is what gets stored, so this only changes what the picker reads.
 */
const PROTOCOL_LABELS: Partial<Record<ProviderProtocol, string>> = {
    // `@ai-sdk/openai` resolves `languageModel()` to the Responses API, so this
    // row posts to `/responses` — not the `/chat/completions` most relays serve.
    openai: 'openai responses',
}

const protocolLabel = (id: ProviderProtocol) => PROTOCOL_LABELS[id] ?? id

const useStyles = createUseStyles({
    root: (props: IThemedStyleProps) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        color: props.theme.colors.contentPrimary,
    }),
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    row: (props: IThemedStyleProps) => ({
        'display': 'flex',
        'alignItems': 'center',
        'gap': '8px',
        'padding': '8px 10px',
        'borderRadius': '6px',
        'border': `1px solid ${props.theme.colors.borderOpaque}`,
        'cursor': 'pointer',
        ':hover': {
            borderColor: props.theme.colors.borderSelected,
        },
    }),
    rowActive: (props: IThemedStyleProps) => ({
        borderColor: props.theme.colors.borderSelected,
        background: props.theme.colors.backgroundSecondary,
    }),
    rowMain: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flex: 1,
        minWidth: 0,
    },
    rowName: {
        fontSize: '13px',
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    rowMeta: (props: IThemedStyleProps) => ({
        fontSize: '11px',
        color: props.theme.colors.contentSecondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    }),
    editor: (props: IThemedStyleProps) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        borderRadius: '6px',
        border: `1px solid ${props.theme.colors.borderOpaque}`,
    }),
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    label: (props: IThemedStyleProps) => ({
        fontSize: '12px',
        fontWeight: 500,
        color: props.theme.colors.contentSecondary,
    }),
    caption: (props: IThemedStyleProps) => ({
        fontSize: '11px',
        lineHeight: 1.5,
        color: props.theme.colors.contentTertiary,
    }),
    inlineRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
    },
    footer: (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        color: props.theme.colors.contentTertiary,
    }),
})

export interface IProviderManagerProps {
    providers: ProviderConfig[]
    defaultProviderId?: string
    onChange: (providers: ProviderConfig[], defaultProviderId?: string) => void
}

/**
 * Reasoning control for the selected provider's model.
 *
 * The options are not a fixed list: they come from the upstream capability
 * catalog for the exact model, so a model that publishes only `high` cannot be
 * asked to stop thinking, and a model that publishes no knob at all offers only
 * the provider default instead of a switch that silently does nothing.
 */
function ReasoningField({
    config,
    onChange,
}: {
    config: ProviderConfig
    onChange: (reasoning: ReasoningSelection) => void
}) {
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })
    const [control, setControl] = useState<ReasoningControl>()

    const { model, catalogKey } = config
    useEffect(() => {
        let cancelled = false
        getReasoningControl({ model, catalogKey }).then((next) => {
            if (!cancelled) {
                setControl(next)
            }
        })
        return () => {
            cancelled = true
        }
    }, [model, catalogKey])

    if (!config.model) {
        return null
    }
    if (!control) {
        return null
    }

    const caption = (() => {
        switch (control.kind) {
            case 'effort':
                return t('This model publishes these levels: {{levels}}.', {
                    levels: control.options.filter((o) => o !== 'provider-default').join(', '),
                })
            case 'toggle':
            case 'budget':
                return t('Thinking depth is translated to this model’s native budget by the SDK.')
            case 'fixed':
                return t(
                    'This model always reasons and exposes no control. Sending a thinking parameter would be rejected.'
                )
            default:
                return t('This model is not in the capability catalog — the levels below are unverified.')
        }
    })()

    return (
        <div className={styles.field}>
            <div className={styles.label}>{t('Thinking')}</div>
            <Select
                size='compact'
                clearable={false}
                searchable={false}
                disabled={control.options.length <= 1}
                options={control.options.map((id) => ({ id, label: id }))}
                value={[{ id: config.reasoning ?? 'provider-default' }]}
                onChange={(params) => onChange(params.value[0]?.id as ReasoningSelection)}
            />
            <div className={styles.caption}>
                {caption}
                {!control.canDisable && control.kind !== 'fixed' && (
                    <> {t('This model cannot be told to stop thinking.')}</>
                )}
            </div>
        </div>
    )
}

function JSONField({
    label,
    caption,
    value,
    onChange,
}: {
    label: string
    caption: string
    value: Record<string, unknown> | undefined
    onChange: (value: Record<string, unknown> | undefined) => void
}) {
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })
    const { t } = useTranslation()
    const [text, setText] = useState(() => (value ? JSON.stringify(value, null, 2) : ''))
    const [error, setError] = useState('')

    const commit = useCallback(
        (next: string) => {
            if (!next.trim()) {
                setError('')
                onChange(undefined)
                return
            }
            try {
                const parsed = JSON.parse(next)
                if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                    setError(t('Expected a JSON object') ?? '')
                    return
                }
                setError('')
                onChange(parsed as Record<string, unknown>)
            } catch {
                setError(t('Invalid JSON') ?? '')
            }
        },
        [onChange, t]
    )

    return (
        <div className={styles.field}>
            <div className={styles.label}>{label}</div>
            <Textarea
                size='compact'
                rows={4}
                value={text}
                error={!!error}
                placeholder='{}'
                onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
                onBlur={() => commit(text)}
            />
            <div className={styles.caption}>{error || caption}</div>
        </div>
    )
}

export function ProviderManager({ providers, defaultProviderId, onChange }: IProviderManagerProps) {
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })

    const [selectedId, setSelectedId] = useState<string | undefined>(defaultProviderId ?? providers[0]?.id)
    const [models, setModels] = useState<ModelOption[]>([])
    const [loadingModels, setLoadingModels] = useState(false)
    const [snapshot, setSnapshot] = useState<{ date: string; source: 'runtime' | 'baked' }>()
    const [refreshing, setRefreshing] = useState(false)

    // Read by the cache-restore effect, which must not re-run when an unrelated
    // field of an unrelated provider changes.
    const providersRef = useRef(providers)
    useEffect(() => {
        providersRef.current = providers
    }, [providers])

    useEffect(() => {
        getCapabilitySnapshotDate().then(setSnapshot)
    }, [])

    const selected = useMemo(() => providers.find((p) => p.id === selectedId), [providers, selectedId])

    /**
     * Restore the last listing for whichever provider is open.
     *
     * Keyed on the id alone rather than on the whole config: editing the key or
     * the host would otherwise blank the picker out on every keystroke, and a
     * list that no longer matches what is stored is already rejected by the
     * cache's own fingerprint.
     */
    useEffect(() => {
        if (!selectedId) {
            setModels([])
            return undefined
        }
        const config = providersRef.current.find((p) => p.id === selectedId)
        if (!config) {
            setModels([])
            return undefined
        }
        let cancelled = false
        getCachedModels(config).then((cached) => {
            if (!cancelled) {
                setModels(cached)
            }
        })
        return () => {
            cancelled = true
        }
    }, [selectedId])

    const update = useCallback(
        (patch: Partial<ProviderConfig>) => {
            if (!selected) {
                return
            }
            onChange(
                providers.map((p) => (p.id === selected.id ? { ...p, ...patch } : p)),
                defaultProviderId
            )
        },
        [providers, selected, onChange, defaultProviderId]
    )

    const addProvider = useCallback(
        (presetId: string) => {
            const created = createProviderFromPreset(presetId)
            const next = [...providers, created]
            onChange(next, defaultProviderId ?? created.id)
            setSelectedId(created.id)
        },
        [providers, onChange, defaultProviderId]
    )

    const removeProvider = useCallback(
        (id: string) => {
            const next = providers.filter((p) => p.id !== id)
            const nextDefault = defaultProviderId === id ? next[0]?.id : defaultProviderId
            onChange(next, nextDefault)
            void dropCachedModels(id)
            if (selectedId === id) {
                setSelectedId(next[0]?.id)
            }
        },
        [providers, onChange, defaultProviderId, selectedId]
    )

    const loadModels = useCallback(async () => {
        if (!selected) {
            return
        }
        setLoadingModels(true)
        try {
            // A custom endpoint is unreachable until the extension holds host
            // permission for it, and the failure would otherwise surface as an
            // unexplained network error.
            await ensureHostPermission(selected)
            const { models: found, error, baseURL } = await listModels(selected)
            if (found.length === 0) {
                // Leave the picker showing whatever it had. Wiping it would
                // disagree with the cache, which is not overwritten either, so
                // the old list would reappear on the next visit anyway — and a
                // flaky network is no reason to take the picker away.
                toast.error(error ? `${t('Could not list models')}: ${error}` : t('Could not list models'))
                return
            }
            // A successful listing replaces the list outright: it is what the
            // endpoint serves now, not an addition to what it served before.
            setModels(found)
            // The base that answered is the one the endpoint actually serves, so
            // adopting it here is what spares the user from having to know
            // whether this host wants the version prefix in the URL.
            if (baseURL && selected.baseURL?.trim()) {
                update({ baseURL })
                toast.success(t('Base URL corrected to {{url}}', { url: baseURL }))
            }
            await putCachedModels(baseURL ? { ...selected, baseURL } : selected, found)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e))
        } finally {
            setLoadingModels(false)
        }
    }, [selected, update, t])

    const refreshCatalog = useCallback(async () => {
        setRefreshing(true)
        try {
            const { models: count } = await refreshModelCapabilities()
            setSnapshot(await getCapabilitySnapshotDate())
            toast.success(t('Updated capabilities for {{count}} models', { count }))
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e))
        } finally {
            setRefreshing(false)
        }
    }, [t])

    return (
        <div className={styles.root}>
            <div className={styles.list}>
                {providers.map((provider) => (
                    <div
                        key={provider.id}
                        className={`${styles.row} ${provider.id === selectedId ? styles.rowActive : ''}`}
                        onClick={() => {
                            setSelectedId(provider.id)
                        }}
                    >
                        <div className={styles.rowMain}>
                            <div className={styles.rowName}>
                                <ProviderIcon provider={provider} size={14} style={{ flexShrink: 0 }} />
                                {provider.name || t('Unnamed provider')}
                            </div>
                            <div className={styles.rowMeta}>
                                {provider.protocol}
                                {provider.model ? ` · ${provider.model}` : ` · ${t('no model')}`}
                            </div>
                        </div>
                        {provider.id === defaultProviderId ? (
                            <Tag closeable={false} hierarchy={TAG_HIERARCHY.primary} kind='accent'>
                                {t('Default')}
                            </Tag>
                        ) : (
                            <Button
                                size='mini'
                                kind='tertiary'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onChange(providers, provider.id)
                                }}
                            >
                                {t('Set default')}
                            </Button>
                        )}
                        <Button
                            size='mini'
                            kind='tertiary'
                            onClick={(e) => {
                                e.stopPropagation()
                                removeProvider(provider.id)
                            }}
                        >
                            <RiDeleteBin5Line size={13} />
                        </Button>
                    </div>
                ))}
                {providers.length === 0 && (
                    <div className={styles.caption}>{t('No providers configured yet. Add one below.')}</div>
                )}
            </div>

            <div className={styles.inlineRow}>
                <div className={styles.field} style={{ flex: 1 }}>
                    <div className={styles.label}>{t('Add provider')}</div>
                    <Select
                        size='compact'
                        clearable={false}
                        placeholder={t('Choose a preset or a custom endpoint') ?? ''}
                        options={PROVIDER_PRESETS.map((p) => ({ id: p.id, label: p.name }))}
                        value={[]}
                        onChange={(params) => {
                            const id = params.value[0]?.id
                            if (id) {
                                addProvider(String(id))
                            }
                        }}
                        mapOptionToNode={({ option }) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ProviderIcon presetId={String(option.id)} size={14} style={{ flexShrink: 0 }} />
                                <span>{option.label}</span>
                            </div>
                        )}
                    />
                </div>
                <Button size='compact' kind='secondary' onClick={() => addProvider('custom-openai')}>
                    <IoMdAdd size={14} />
                </Button>
            </div>

            {selected && (
                <div className={styles.editor}>
                    <div className={styles.field}>
                        <div className={styles.label}>{t('Name')}</div>
                        <Input
                            size='compact'
                            value={selected.name}
                            onChange={(e) => update({ name: (e.target as HTMLInputElement).value })}
                        />
                    </div>

                    <div className={styles.field}>
                        <div className={styles.label}>{t('Protocol')}</div>
                        <Select
                            size='compact'
                            clearable={false}
                            searchable={false}
                            options={PROTOCOLS.map((id) => ({ id, label: protocolLabel(id) }))}
                            value={[{ id: selected.protocol, label: protocolLabel(selected.protocol) }]}
                            onChange={(params) => update({ protocol: params.value[0]?.id as ProviderProtocol })}
                        />
                        <div className={styles.caption}>
                            {t(
                                'Determines the request format. Any OpenAI-compatible service works with “openai-compatible” plus its base URL.'
                            )}
                        </div>
                    </div>

                    <div className={styles.field}>
                        <div className={styles.label}>{t('Base URL')}</div>
                        <Input
                            size='compact'
                            value={selected.baseURL ?? ''}
                            placeholder={t('Leave empty to use the protocol default') ?? ''}
                            onChange={(e) => update({ baseURL: (e.target as HTMLInputElement).value })}
                            onBlur={() => {
                                // Only the unambiguous cleanups — a missing
                                // scheme, a pasted `/chat/completions`. Whether
                                // the host wants a version prefix is decided by
                                // asking it, in "List models".
                                const normalized = normalizeBaseURL(selected.baseURL, selected.protocol)
                                if (normalized && normalized !== selected.baseURL) {
                                    update({ baseURL: normalized })
                                }
                            }}
                        />
                        <div className={styles.caption}>
                            {t('Leave empty for the protocol default. “List models” corrects a missing /v1 for you.')}
                        </div>
                    </div>

                    <div className={styles.field}>
                        <div className={styles.label}>{t('API Key')}</div>
                        <Input
                            size='compact'
                            type='password'
                            value={selected.apiKey ?? ''}
                            onChange={(e) => update({ apiKey: (e.target as HTMLInputElement).value })}
                        />
                    </div>

                    <div className={styles.field}>
                        <div className={styles.label}>{t('Model')}</div>
                        <div className={styles.inlineRow}>
                            <div style={{ flex: 1 }}>
                                {models.length > 0 ? (
                                    <Select
                                        size='compact'
                                        clearable={false}
                                        // A cached listing is not a closed set:
                                        // a model released since the last fetch
                                        // still has to be typeable.
                                        creatable
                                        options={models.map((m) => ({
                                            id: m.id,
                                            label: m.reasoning ? `${m.id} · ${t('reasoning')}` : m.id,
                                        }))}
                                        value={selected.model ? [{ id: selected.model }] : []}
                                        onChange={(params) => update({ model: String(params.value[0]?.id ?? '') })}
                                    />
                                ) : (
                                    <Input
                                        size='compact'
                                        value={selected.model}
                                        placeholder={t('Model id') ?? ''}
                                        onChange={(e) => update({ model: (e.target as HTMLInputElement).value })}
                                    />
                                )}
                            </div>
                            <Button size='compact' kind='secondary' isLoading={loadingModels} onClick={loadModels}>
                                {t('List models')}
                            </Button>
                        </div>
                    </div>

                    <ReasoningField config={selected} onChange={(reasoning) => update({ reasoning })} />

                    <JSONField
                        label={t('Provider options')}
                        caption={t(
                            'Passed to the SDK verbatim. Use this to drive a model the catalog does not know yet, without waiting for an update.'
                        )}
                        value={selected.providerOptions}
                        onChange={(providerOptions) =>
                            update({ providerOptions: providerOptions as ProviderConfig['providerOptions'] })
                        }
                    />

                    <JSONField
                        label={t('Extra headers')}
                        caption={t('Merged into every request to this provider.')}
                        value={selected.headers}
                        onChange={(headers) => update({ headers: headers as Record<string, string> | undefined })}
                    />
                </div>
            )}

            <div className={styles.footer}>
                <span>
                    {t('Model capabilities from models.dev')}
                    {snapshot ? ` · ${snapshot.date}` : ''}
                    {snapshot?.source === 'baked' ? ` · ${t('bundled')}` : ''}
                </span>
                <Button size='mini' kind='tertiary' isLoading={refreshing} onClick={refreshCatalog}>
                    <IoRefreshSharp size={12} />
                    &nbsp;{t('Refresh')}
                </Button>
            </div>
        </div>
    )
}
