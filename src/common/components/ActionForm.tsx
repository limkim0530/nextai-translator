import { useTranslation } from 'react-i18next'
import { ICreateActionOption, IUpdateActionOption } from '../internal-services/action'
import { Action } from '../internal-services/db'
import { Input, Textarea, Button } from './ui'
import { createElement, useCallback, useEffect, useState } from 'react'
import * as mdIcons from 'react-icons/md'
import { IconType } from 'react-icons'
import { actionService } from '../services/action'
import { createUseStyles } from '@/common/styles'
import { IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { IconPicker } from './IconPicker'
import { RenderingFormatSelector } from './RenderingFormatSelector'
import { ProviderSelector } from './ProviderSelector'
import { ActionModelSelector } from './ActionModelSelector'
import { DEFAULT_ACTION_ICON } from '../constants'

const useStyles = createUseStyles({
    placeholder: (props: IThemedStyleProps) => ({
        color: props.theme.colors.positive,
    }),
    promptCaptionContainer: () => ({
        'lineHeight': 1.8,
        '& *': {
            '-ms-user-select': 'text',
            '-webkit-user-select': 'text',
            'user-select': 'text',
        },
    }),
    placeholderCaptionContainer: () => ({
        listStyle: 'square',
        margin: 0,
        padding: 0,
        marginTop: 10,
        paddingLeft: 20,
    }),
    formItem: {
        marginBottom: '16px',
    },
    label: {
        marginBottom: '6px',
        fontSize: '13px',
        fontWeight: 500,
    },
    requiredMark: {
        color: '#e53e3e',
        marginLeft: '4px',
    },
    errorMessage: {
        color: '#e53e3e',
        fontSize: '12px',
        marginTop: '4px',
    },
    caption: {
        color: '#666',
        fontSize: '12px',
        marginTop: '4px',
    },
})

export interface IActionFormProps {
    action?: Action
    onSubmit: (action: Action) => void
}

export function ActionForm(props: IActionFormProps) {
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })
    const { t } = useTranslation()

    const [loading, setLoading] = useState(false)
    const [values, setValues] = useState<ICreateActionOption>(() => ({
        name: props.action?.name ?? '',
        icon: props.action?.icon ?? DEFAULT_ACTION_ICON,
        rolePrompt: props.action?.rolePrompt ?? '',
        commandPrompt: props.action?.commandPrompt ?? '',
        outputRenderingFormat: props.action?.outputRenderingFormat,
        providerId: props.action?.providerId,
        apiModel: props.action?.apiModel,
    }))
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (props.action) {
            setValues({
                name: props.action.name ?? '',
                icon: props.action.icon ?? DEFAULT_ACTION_ICON,
                rolePrompt: props.action.rolePrompt ?? '',
                commandPrompt: props.action.commandPrompt ?? '',
                outputRenderingFormat: props.action.outputRenderingFormat,
                providerId: props.action.providerId,
                apiModel: props.action.apiModel,
            })
        }
    }, [props.action])

    const handleChange = <K extends keyof ICreateActionOption>(field: K, val: ICreateActionOption[K]) => {
        setValues((prev) => {
            const next = { ...prev, [field]: val }
            if (field === 'providerId' && val !== prev.providerId) {
                next.apiModel = ''
            }
            return next
        })
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }))
        }
    }

    const handleSubmit = useCallback(
        async (e?: React.SyntheticEvent) => {
            e?.preventDefault()
            e?.stopPropagation()
            const newErrors: Record<string, string> = {}
            if (!props.action?.mode) {
                if (!values.name?.trim()) {
                    newErrors.name = t('Action name is required')
                }
                if (!values.commandPrompt?.trim()) {
                    newErrors.commandPrompt = t('Command prompt is required')
                }
            }
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors)
                return
            }

            setLoading(true)
            try {
                let action: Action
                if (props.action) {
                    const updateOpt: IUpdateActionOption = { ...values }
                    if (!values.providerId) {
                        updateOpt.clearFields = ['providerId', 'apiModel']
                        delete updateOpt.providerId
                        delete updateOpt.apiModel
                    }
                    action = await actionService.update(props.action, updateOpt)
                } else {
                    action = await actionService.create(values)
                }
                props.onSubmit(action)
            } catch (err) {
                console.error('Failed to save action:', err)
                setErrors((prev) => ({
                    ...prev,
                    form: (err as Error)?.message || t('Failed to save action') || 'Failed to save action',
                }))
            } finally {
                setLoading(false)
            }
        },
        [props, values, t]
    )

    const rolePlaceholdersCaption = (
        <ul className={styles.placeholderCaptionContainer}>
            <li>
                <span className={styles.placeholder}>{'${sourceLang}'}</span> {t('represents the source language')}
            </li>
            <li>
                <span className={styles.placeholder}>{'${targetLang}'}</span> {t('represents the target language')}
            </li>
        </ul>
    )

    const commandPlaceholdersCaption = (
        <ul className={styles.placeholderCaptionContainer}>
            <li>
                <span className={styles.placeholder}>{'${sourceLang}'}</span> {t('represents the source language')}
            </li>
            <li>
                <span className={styles.placeholder}>{'${targetLang}'}</span> {t('represents the target language')}
            </li>
            <li>
                <span className={styles.placeholder}>{'${text}'}</span>{' '}
                {t(
                    'represents the original text, which is usually not needed inside the prompt because it is automatically injected'
                )}
            </li>
        </ul>
    )

    const rolePromptCaption = (
        <div className={styles.promptCaptionContainer}>
            <div>{t('Role prompt indicates what role the action represents.')}</div>
            <div>{t('Role prompt example: You are a translator.')}</div>
            <div>{t('Placeholders')}:</div>
            <div>{rolePlaceholdersCaption}</div>
        </div>
    )

    const commandPromptCaption = (
        <div className={styles.promptCaptionContainer}>
            <div>
                {t(
                    'Command prompt indicates what command should be issued to the role represented by the action when the action is executed.'
                )}
            </div>
            <div>
                {t('Command prompt example: Please translate the following text from ${sourceLang} to ${targetLang}.')}
            </div>
            <div>{t('Placeholders')}:</div>
            <div>{commandPlaceholdersCaption}</div>
        </div>
    )

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void handleSubmit(e)
            }}
        >
            {props.action?.mode ? (
                <div
                    style={{
                        padding: '14px 16px',
                        backgroundColor: themeType === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        border: `1px solid ${themeType === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 600,
                            fontSize: '15px',
                        }}
                    >
                        {props.action.icon && (mdIcons as Record<string, IconType>)[props.action.icon] && (
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: theme.colors.accent,
                                }}
                            >
                                {createElement((mdIcons as Record<string, IconType>)[props.action.icon], { size: 18 })}
                            </span>
                        )}
                        <span>{t(props.action.name)}</span>
                        <span
                            style={{
                                fontSize: '11px',
                                background: theme.colors.backgroundTertiary,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                color: theme.colors.contentSecondary,
                                fontWeight: 'normal',
                            }}
                        >
                            {t('built-in')}
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: theme.colors.contentSecondary, lineHeight: 1.6 }}>
                        {t(
                            'Prompts for built-in actions are managed by the system. You can specify a dedicated provider and model.'
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className={styles.formItem}>
                        <div className={styles.label}>
                            {t('Name')}
                            <span className={styles.requiredMark}>*</span>
                        </div>
                        <Input
                            size='compact'
                            value={values.name}
                            onChange={(e) => handleChange('name', e.currentTarget.value)}
                        />
                        {errors.name && <div className={styles.errorMessage}>{errors.name}</div>}
                    </div>

                    <div className={styles.formItem}>
                        <div className={styles.label}>
                            {t('Icon')}
                            <span className={styles.requiredMark}>*</span>
                        </div>
                        <IconPicker value={values.icon} onChange={(icon) => handleChange('icon', icon)} />
                    </div>

                    <div className={styles.formItem}>
                        <div className={styles.label}>{`${t('Role Prompt')} (Optional)`}</div>
                        <Textarea
                            rows={4}
                            size='compact'
                            resize='vertical'
                            value={values.rolePrompt}
                            onChange={(e) => handleChange('rolePrompt', e.currentTarget.value)}
                            overrides={{
                                Root: {
                                    style: {
                                        width: '100%',
                                    },
                                },
                            }}
                        />
                        <div className={styles.caption}>{rolePromptCaption}</div>
                    </div>

                    <div className={styles.formItem}>
                        <div className={styles.label}>
                            {t('Command Prompt')}
                            <span className={styles.requiredMark}>*</span>
                        </div>
                        <Textarea
                            rows={4}
                            size='compact'
                            resize='vertical'
                            value={values.commandPrompt}
                            onChange={(e) => handleChange('commandPrompt', e.currentTarget.value)}
                            overrides={{
                                Root: {
                                    style: {
                                        width: '100%',
                                    },
                                },
                            }}
                        />
                        {errors.commandPrompt && <div className={styles.errorMessage}>{errors.commandPrompt}</div>}
                        <div className={styles.caption}>{commandPromptCaption}</div>
                    </div>

                    <div className={styles.formItem}>
                        <div className={styles.label}>{t('Output rendering format')}</div>
                        <RenderingFormatSelector
                            value={values.outputRenderingFormat}
                            onChange={(format) => handleChange('outputRenderingFormat', format)}
                        />
                    </div>
                </>
            )}

            <div className={styles.formItem}>
                <div className={styles.label}>{`${t('Action Provider')} (Optional)`}</div>
                <ProviderSelector
                    value={values.providerId}
                    onChange={(providerId) => handleChange('providerId', providerId)}
                />
            </div>

            {values?.providerId && (
                <div className={styles.formItem}>
                    <div className={styles.label}>{`${t('Action Model')} (Optional)`}</div>
                    <ActionModelSelector
                        providerId={values.providerId}
                        value={values.apiModel}
                        onChange={(apiModel) => handleChange('apiModel', apiModel)}
                    />
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 10,
                }}
            >
                {errors.form ? (
                    <div className={styles.errorMessage} style={{ marginRight: 'auto' }}>
                        {errors.form}
                    </div>
                ) : (
                    <div style={{ marginRight: 'auto' }} />
                )}
                <Button
                    isLoading={loading}
                    size='compact'
                    type='submit'
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleSubmit(e)
                    }}
                >
                    {t('Submit')}
                </Button>
            </div>
        </form>
    )
}
