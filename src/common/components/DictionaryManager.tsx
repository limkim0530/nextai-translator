import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'baseui/button'
import { Input } from 'baseui/input'
import { Select } from 'baseui/select'
import { Tag, HIERARCHY as TAG_HIERARCHY } from 'baseui/tag'
import { Checkbox } from 'baseui/checkbox'
import { createUseStyles } from 'react-jss'
import { RiDeleteBin5Line } from 'react-icons/ri'
import { RxExternalLink } from 'react-icons/rx'
import { useTheme } from '../hooks/useTheme'
import type { IThemedStyleProps } from '../types'
import type { ProviderConfig } from '../providers/types'
import {
    DICTIONARY_PRESETS,
    createDictionaryProviderFromPreset,
    findDictionaryPreset,
    type DictionaryPreset,
    type DictionaryProtocol,
    type DictionaryProviderConfig,
    type WordLookupPreview,
} from '../dictionary'
import { getDictionaryAdapter } from '../dictionary/adapters'

const DICTIONARY_PROTOCOLS: DictionaryProtocol[] = [
    'free-dictionary',
    'datamuse',
    'google',
    'microsoft',
    'youdao',
    'llm',
]

const useStyles = createUseStyles({
    root: (props: IThemedStyleProps) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        color: props.theme.colors.contentPrimary,
    }),
    toggleRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '6px',
    },
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
    labelRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: (props: IThemedStyleProps) => ({
        fontSize: '12px',
        fontWeight: 500,
        color: props.theme.colors.contentSecondary,
    }),
    requiredStar: (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentNegative ?? '#d44',
        marginLeft: '2px',
    }),
    errorCaption: (props: IThemedStyleProps) => ({
        fontSize: '11px',
        lineHeight: 1.4,
        color: props.theme.colors.contentNegative ?? '#d44',
        marginTop: '2px',
    }),
    docsLink: (props: IThemedStyleProps) => ({
        'display': 'inline-flex',
        'alignItems': 'center',
        'gap': '4px',
        'fontSize': '11px',
        'color': props.theme.colors.linkText ?? props.theme.colors.primary,
        'textDecoration': 'none',
        ':hover': {
            textDecoration: 'underline',
        },
    }),
    caption: (props: IThemedStyleProps) => ({
        fontSize: '11px',
        lineHeight: 1.5,
        color: props.theme.colors.contentTertiary,
    }),
    testBox: (props: IThemedStyleProps) => ({
        marginTop: '6px',
        padding: '10px',
        borderRadius: '6px',
        background: props.theme.colors.backgroundTertiary ?? props.theme.colors.backgroundSecondary,
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    }),
    testResult: (props: IThemedStyleProps) => ({
        padding: '8px',
        borderRadius: '4px',
        background: props.theme.colors.backgroundPrimary,
        border: `1px solid ${props.theme.colors.borderOpaque}`,
    }),
})

export interface IDictionaryManagerProps {
    enabled?: boolean
    providers: DictionaryProviderConfig[]
    defaultProviderId?: string
    aiProviders?: ProviderConfig[]
    targetLang?: string
    onEnabledChange: (enabled: boolean) => void
    onChange: (providers: DictionaryProviderConfig[], defaultProviderId?: string) => void
}

export function DictionaryManager({
    enabled = true,
    providers,
    defaultProviderId,
    aiProviders = [],
    targetLang = 'zh-Hans',
    onEnabledChange,
    onChange,
}: IDictionaryManagerProps) {
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })

    const [selectedId, setSelectedId] = useState<string | undefined>(defaultProviderId ?? providers[0]?.id)
    const [testWord, setTestWord] = useState('apple')
    const [testLoading, setTestLoading] = useState(false)
    const [testResult, setTestResult] = useState<WordLookupPreview | null | undefined>(undefined)
    const [testError, setTestError] = useState<string | null>(null)

    const selectedConfig = useMemo(
        () => providers.find((p) => p.id === selectedId) ?? providers[0],
        [providers, selectedId]
    )
    const preset = useMemo(
        () => (selectedConfig ? findDictionaryPreset(selectedConfig.protocol) : undefined),
        [selectedConfig]
    )

    const handleUpdate = useCallback(
        (patch: Partial<DictionaryProviderConfig>) => {
            if (!selectedConfig) return
            const updated = providers.map((p) => (p.id === selectedConfig.id ? { ...p, ...patch } : p))
            onChange(updated, defaultProviderId)
        },
        [defaultProviderId, onChange, providers, selectedConfig]
    )

    const handleSetDefault = useCallback(
        (id: string) => {
            onChange(providers, id)
        },
        [onChange, providers]
    )

    const handleDelete = useCallback(
        (id: string) => {
            const next = providers.filter((p) => p.id !== id)
            const nextDefault = defaultProviderId === id ? next[0]?.id : defaultProviderId
            onChange(next, nextDefault)
            if (selectedId === id) {
                setSelectedId(next[0]?.id)
            }
        },
        [defaultProviderId, onChange, providers, selectedId]
    )

    const getDisplayName = useCallback(
        (config?: DictionaryProviderConfig) => {
            if (!config) return ''
            if (!config.name) return ''
            const presetItem = findDictionaryPreset(config.protocol)
            if (presetItem && config.name === presetItem.name) {
                return t(presetItem.name)
            }
            return config.name
        },
        [t]
    )

    const handleAddPreset = useCallback(
        (presetItem: DictionaryPreset) => {
            const newConfig = createDictionaryProviderFromPreset(presetItem.id, {
                name: t(presetItem.name),
            })
            const next = [...providers, newConfig]
            onChange(next, defaultProviderId ?? newConfig.id)
            setSelectedId(newConfig.id)
        },
        [defaultProviderId, onChange, providers, t]
    )

    const handleRunTest = useCallback(
        async (e?: React.SyntheticEvent) => {
            e?.preventDefault()
            e?.stopPropagation()
            if (!selectedConfig || !testWord.trim()) return

            setTestLoading(true)
            setTestResult(undefined)
            setTestError(null)
            try {
                const adapter = getDictionaryAdapter(selectedConfig.protocol)
                const result = await adapter.lookup(testWord.trim(), selectedConfig, {
                    targetLang,
                    providers: aiProviders,
                })
                setTestResult(result)
            } catch (err) {
                setTestError((err as Error).message || t('Lookup test failed'))
            } finally {
                setTestLoading(false)
            }
        },
        [aiProviders, selectedConfig, targetLang, testWord, t]
    )

    return (
        <div className={styles.root}>
            <div className={styles.toggleRow}>
                <Checkbox checked={enabled} onChange={(e) => onEnabledChange(e.currentTarget.checked)}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{t('Enable Word Hover Definition')}</span>
                </Checkbox>
            </div>

            {enabled && (
                <>
                    <div>
                        <div className={styles.label} style={{ marginBottom: '6px' }}>
                            {t('Providers')}
                        </div>
                        <div className={styles.list}>
                            {providers.map((p) => {
                                const isDefault = (defaultProviderId ?? providers[0]?.id) === p.id
                                const isSelected = selectedConfig?.id === p.id
                                return (
                                    <div
                                        key={p.id}
                                        className={`${styles.row} ${isSelected ? styles.rowActive : ''}`}
                                        onClick={() => {
                                            setSelectedId(p.id)
                                            setTestResult(undefined)
                                            setTestError(null)
                                        }}
                                    >
                                        <div className={styles.rowMain}>
                                            <div className={styles.rowName}>
                                                <span>{getDisplayName(p) || t('Unnamed Provider')}</span>
                                                {isDefault && (
                                                    <Tag
                                                        closeable={false}
                                                        hierarchy={TAG_HIERARCHY.primary}
                                                        kind='accent'
                                                        size='small'
                                                    >
                                                        {t('Default')}
                                                    </Tag>
                                                )}
                                            </div>
                                            <div className={styles.rowMeta}>
                                                {p.protocol}
                                                {p.baseURL ? ` · ${p.baseURL}` : ''}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {!isDefault && (
                                                <Button
                                                    type='button'
                                                    kind='tertiary'
                                                    size='mini'
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleSetDefault(p.id)
                                                    }}
                                                >
                                                    {t('Set default')}
                                                </Button>
                                            )}
                                            {providers.length > 1 && (
                                                <Button
                                                    type='button'
                                                    kind='tertiary'
                                                    size='mini'
                                                    title={t('Delete')}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleDelete(p.id)
                                                    }}
                                                >
                                                    <RiDeleteBin5Line size={13} />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {providers.length === 0 && (
                                <div className={styles.caption}>{t('No providers configured yet. Add one below.')}</div>
                            )}
                        </div>
                    </div>

                    <div className={styles.field}>
                        <div className={styles.label}>{t('Add provider')}</div>
                        <Select
                            size='compact'
                            clearable={false}
                            searchable={false}
                            placeholder={t('Choose a preset or a custom endpoint') ?? ''}
                            options={DICTIONARY_PRESETS.map((item) => ({
                                id: item.id,
                                label: t(item.name),
                                item,
                            }))}
                            value={[]}
                            onChange={({ value }) => {
                                if (value[0]?.item) {
                                    handleAddPreset(value[0].item as DictionaryPreset)
                                }
                            }}
                        />
                    </div>

                    {selectedConfig && (
                        <div className={styles.editor}>
                            <div className={styles.field}>
                                <div className={styles.labelRow}>
                                    <span className={styles.label}>
                                        {t('Name')}
                                        <span className={styles.requiredStar}>*</span>
                                    </span>
                                    {preset?.docsURL && (
                                        <a
                                            className={styles.docsLink}
                                            href={preset.docsURL}
                                            target='_blank'
                                            rel='noreferrer'
                                        >
                                            {t('Official Docs')}
                                            <RxExternalLink size={11} />
                                        </a>
                                    )}
                                </div>
                                <Input
                                    size='compact'
                                    value={getDisplayName(selectedConfig)}
                                    error={!selectedConfig.name?.trim()}
                                    onChange={(e) => handleUpdate({ name: e.currentTarget.value })}
                                />
                                {!selectedConfig.name?.trim() && (
                                    <div className={styles.errorCaption}>{t('Name is required')}</div>
                                )}
                            </div>

                            <div className={styles.field}>
                                <div className={styles.label}>{t('Protocol')}</div>
                                <Select
                                    size='compact'
                                    clearable={false}
                                    searchable={false}
                                    options={DICTIONARY_PROTOCOLS.map((id) => ({
                                        id,
                                        label: id,
                                    }))}
                                    value={[
                                        {
                                            id: selectedConfig.protocol,
                                            label: selectedConfig.protocol,
                                        },
                                    ]}
                                    onChange={({ value }) => {
                                        const newProtocol = value[0]?.id as DictionaryProtocol
                                        if (newProtocol && newProtocol !== selectedConfig.protocol) {
                                            const targetPreset = findDictionaryPreset(newProtocol)
                                            handleUpdate({
                                                protocol: newProtocol,
                                                baseURL: targetPreset?.baseURL,
                                            })
                                        }
                                    }}
                                />
                                <div className={styles.caption}>
                                    {t('Determines the dictionary request format and service adapter.')}
                                </div>
                            </div>

                            {/* Base URL for endpoints that support custom endpoints */}
                            {(selectedConfig.protocol === 'free-dictionary' ||
                                selectedConfig.protocol === 'datamuse' ||
                                selectedConfig.protocol === 'youdao' ||
                                selectedConfig.protocol === 'microsoft') && (
                                <div className={styles.field}>
                                    <div className={styles.label}>{t('Base URL')}</div>
                                    <Input
                                        size='compact'
                                        placeholder={preset?.baseURL || 'https://...'}
                                        value={selectedConfig.baseURL ?? ''}
                                        onChange={(e) => handleUpdate({ baseURL: e.currentTarget.value })}
                                    />
                                    <span className={styles.caption}>
                                        {t('Leave empty to use the protocol default')}
                                    </span>
                                </div>
                            )}

                            {selectedConfig.protocol === 'youdao' && (
                                <>
                                    <div className={styles.field}>
                                        <span className={styles.label}>{t('App Key')}</span>
                                        <Input
                                            type='password'
                                            size='compact'
                                            value={selectedConfig.apiKey ?? ''}
                                            onChange={(e) => handleUpdate({ apiKey: e.currentTarget.value })}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <span className={styles.label}>{t('App Secret')}</span>
                                        <Input
                                            type='password'
                                            size='compact'
                                            value={selectedConfig.apiSecret ?? ''}
                                            onChange={(e) => handleUpdate({ apiSecret: e.currentTarget.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {selectedConfig.protocol === 'microsoft' && (
                                <>
                                    <div className={styles.field}>
                                        <div className={styles.labelRow}>
                                            <span className={styles.label}>
                                                {t('API Key')}
                                                <span className={styles.requiredStar}>*</span>
                                            </span>
                                        </div>
                                        <Input
                                            type='password'
                                            size='compact'
                                            placeholder='Ocp-Apim-Subscription-Key'
                                            value={selectedConfig.apiKey ?? ''}
                                            error={!selectedConfig.apiKey?.trim()}
                                            onChange={(e) => handleUpdate({ apiKey: e.currentTarget.value })}
                                        />
                                        <span className={styles.caption}>
                                            {t('Azure Translator Subscription Key (Key 1 or Key 2 from Azure Portal)')}
                                        </span>
                                    </div>
                                    <div className={styles.field}>
                                        <span className={styles.label}>{t('Region')}</span>
                                        <Input
                                            size='compact'
                                            placeholder='global, eastus, southeastasia...'
                                            value={selectedConfig.region ?? ''}
                                            onChange={(e) => handleUpdate({ region: e.currentTarget.value })}
                                        />
                                        <span className={styles.caption}>
                                            {t(
                                                'Required for regional resources (e.g. eastus, global). Matches your Azure resource location.'
                                            )}
                                        </span>
                                    </div>
                                </>
                            )}

                            {selectedConfig.protocol === 'google' && (
                                <div className={styles.field}>
                                    <span className={styles.label}>{t('API Key (Optional)')}</span>
                                    <Input
                                        type='password'
                                        size='compact'
                                        value={selectedConfig.apiKey ?? ''}
                                        onChange={(e) => handleUpdate({ apiKey: e.currentTarget.value })}
                                    />
                                </div>
                            )}

                            {selectedConfig.protocol === 'llm' && (
                                <div className={styles.field}>
                                    <span className={styles.label}>{t('Select AI Provider')}</span>
                                    <Select
                                        clearable={false}
                                        size='compact'
                                        options={aiProviders.map((p) => ({
                                            id: p.id,
                                            label: `${p.name} (${p.model || p.protocol})`,
                                        }))}
                                        value={
                                            selectedConfig.providerId
                                                ? [{ id: selectedConfig.providerId, label: selectedConfig.providerId }]
                                                : []
                                        }
                                        placeholder={t('Use default AI provider')}
                                        onChange={({ value }) => {
                                            handleUpdate({ providerId: value[0]?.id as string })
                                        }}
                                    />
                                </div>
                            )}

                            {/* Testing area */}
                            <div className={styles.testBox}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Input
                                        size='compact'
                                        value={testWord}
                                        placeholder={t('Test word')}
                                        onChange={(e) => setTestWord(e.currentTarget.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleRunTest(e)
                                            }
                                        }}
                                        overrides={{
                                            Root: { style: { flex: 1 } },
                                        }}
                                    />
                                    <Button
                                        type='button'
                                        size='compact'
                                        isLoading={testLoading}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleRunTest(e)
                                        }}
                                    >
                                        {t('Test')}
                                    </Button>
                                </div>

                                {testError && (
                                    <div style={{ color: theme.colors.contentNegative }}>
                                        {t('Test failed: {{error}}', { error: testError })}
                                    </div>
                                )}

                                {testResult !== undefined && !testError && (
                                    <div className={styles.testResult}>
                                        {testResult ? (
                                            <div>
                                                <strong>{testResult.word}</strong>{' '}
                                                {testResult.phonetic ? (
                                                    <span style={{ color: theme.colors.contentSecondary }}>
                                                        {testResult.phonetic}
                                                    </span>
                                                ) : null}
                                                <div style={{ marginTop: '4px' }}>
                                                    {testResult.meanings.map((m, i) => (
                                                        <div key={i} style={{ marginTop: i > 0 ? '6px' : '0' }}>
                                                            {m.partOfSpeech && (
                                                                <span
                                                                    style={{ fontStyle: 'italic', marginRight: '4px' }}
                                                                >
                                                                    {m.partOfSpeech}
                                                                </span>
                                                            )}
                                                            <span>{m.definition}</span>
                                                            {m.example && (
                                                                <div
                                                                    style={{
                                                                        marginTop: '2px',
                                                                        color: theme.colors.contentTertiary,
                                                                        fontSize: '12px',
                                                                        fontStyle: 'italic',
                                                                    }}
                                                                >
                                                                    {m.example}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: theme.colors.contentSecondary }}>
                                                {t('No definition found')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
