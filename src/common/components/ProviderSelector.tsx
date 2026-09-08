import { useTranslation } from 'react-i18next'
import { useSettings } from '../hooks/useSettings'
import { Select } from './ui'

export interface IProviderSelectorProps {
    value?: string
    onChange?: (value: string) => void
}

/**
 * Picks one of the user's configured provider instances by id.
 *
 * Ids rather than vendor names, so an action can target one of several
 * instances of the same vendor — a second key, a different endpoint, or the
 * same model at a different thinking level.
 */
export function ProviderSelector({ value, onChange }: IProviderSelectorProps) {
    const { t } = useTranslation()
    const { settings } = useSettings()

    const options = (settings?.providers ?? []).map((provider) => ({
        id: provider.id,
        label: provider.model ? `${provider.name} · ${provider.model}` : provider.name,
    }))

    return (
        <Select
            size='compact'
            searchable={false}
            clearable
            placeholder={options.length ? t('Use the default provider') : t('No providers configured')}
            value={value ? [{ id: value }] : []}
            onChange={(params) => {
                onChange?.(String(params.value[0]?.id ?? ''))
            }}
            options={options}
        />
    )
}
