import { useCallback, useEffect, useMemo, useState } from 'react'
import { Select } from 'baseui/select'
import { Button } from 'baseui/button'
import { MdRefresh } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../hooks/useSettings'
import { getCachedModels, putCachedModels } from '../providers/model-cache'
import { listModels, listModelsFromCatalog, type ModelOption } from '../providers/models'

export interface IActionModelSelectorProps {
    providerId?: string
    value?: string
    onChange?: (value: string) => void
    onBlur?: () => void
}

export function ActionModelSelector({ providerId, value, onChange, onBlur }: IActionModelSelectorProps) {
    const { t } = useTranslation()
    const { settings } = useSettings()
    const [models, setModels] = useState<ModelOption[]>([])
    const [loading, setLoading] = useState(false)

    const provider = useMemo(() => {
        return settings?.providers?.find((p) => p.id === providerId)
    }, [settings?.providers, providerId])

    const loadModels = useCallback(
        async (forceRefresh = false) => {
            if (!provider) {
                setModels([])
                return
            }
            setLoading(true)
            try {
                if (!forceRefresh) {
                    const cached = await getCachedModels(provider)
                    if (cached.length > 0) {
                        setModels(cached)
                        setLoading(false)
                        return
                    }
                }
                const { models: found } = await listModels(provider)
                if (found.length > 0) {
                    setModels(found)
                    await putCachedModels(provider, found)
                } else {
                    const fallback = listModelsFromCatalog(provider)
                    setModels(fallback)
                }
            } catch {
                const fallback = listModelsFromCatalog(provider)
                setModels(fallback)
            } finally {
                setLoading(false)
            }
        },
        [provider]
    )

    useEffect(() => {
        void loadModels(false)
    }, [loadModels])

    const options = useMemo(() => {
        const list: { id: string; label: string }[] = []
        const seen = new Set<string>()

        if (provider?.model) {
            list.push({
                id: provider.model,
                label: `${provider.model} (${t('Default')})`,
            })
            seen.add(provider.model)
        }

        for (const m of models) {
            if (!seen.has(m.id)) {
                list.push({
                    id: m.id,
                    label: m.reasoning ? `${m.id} · ${t('reasoning')}` : m.id,
                })
                seen.add(m.id)
            }
        }

        if (value && !seen.has(value)) {
            list.unshift({
                id: value,
                label: value,
            })
            seen.add(value)
        }

        return list
    }, [provider?.model, models, value, t])

    const placeholder = useMemo(() => {
        const defaultMsg = t('Leave empty to use the provider default') ?? ''
        return provider?.model ? `${defaultMsg} (${provider.model})` : defaultMsg
    }, [provider?.model, t])

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <Select
                    size='compact'
                    clearable
                    creatable
                    searchable
                    isLoading={loading}
                    placeholder={placeholder}
                    options={options}
                    value={value ? [{ id: value, label: options.find((o) => o.id === value)?.label ?? value }] : []}
                    onChange={(params) => {
                        const selected = params.value[0]?.id
                        onChange?.(selected ? String(selected) : '')
                    }}
                    onBlur={onBlur}
                />
            </div>
            {provider && (
                <Button
                    type='button'
                    size='compact'
                    kind='tertiary'
                    isLoading={loading}
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void loadModels(true)
                    }}
                    title={t('Refresh') ?? 'Refresh'}
                >
                    <MdRefresh size={14} />
                </Button>
            )}
        </div>
    )
}
