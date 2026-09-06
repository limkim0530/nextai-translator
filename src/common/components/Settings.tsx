import React, { useCallback, useEffect, useRef, useState } from 'react'
import _ from 'underscore'
import { Tabs, Tab, StyledTabList, StyledTabPanel } from 'baseui/tabs-motion'
import icon from '../assets/images/icon-large.png'
import beams from '../assets/images/beams.jpg'
import * as utils from '../utils'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider } from 'baseui'
import { Input } from 'baseui/input'
import { createForm } from './Form'
import { TranslateMode } from '../translate'
import { Button, ButtonProps } from 'baseui/button'
import { Select, Value, Option } from 'baseui/select'
import { Checkbox } from 'baseui/checkbox'
import { LangCode, supportedLanguages } from '../lang'
import { useRecordHotkeys } from 'react-hotkeys-hook'
import { createUseStyles } from 'react-jss'
import clsx from 'clsx'
import { ISettings, IThemedStyleProps, LanguageDetectionEngine, ProxyProtocol, ThemeType } from '../types'
import { useTheme } from '../hooks/useTheme'
import { IoCloseCircle, IoSettingsOutline } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'
import AppConfig from '../../../package.json'
import { useSettings } from '../hooks/useSettings'
import { defaultTTSProvider, langCode2TTSLang, ttsLangTestTextMap } from '../tts'
import { RiDeleteBin5Line, RiCloudLine, RiBook2Line } from 'react-icons/ri'
import { IoMdAdd } from 'react-icons/io'
import { MdSave } from 'react-icons/md'
import { TTSProvider } from '../tts/types'
import { fetchEdgeVoices } from '../tts/edge-tts'
import { fetchLocalVoices } from '../tts/local-tts'
import { useThemeType } from '../hooks/useThemeType'
import { Slider } from 'baseui/slider'
import { useLiveQuery } from 'dexie-react-hooks'
import { actionService } from '../services/action'
import { GlobalSuspense } from './GlobalSuspense'

import { ProviderManager } from './ProviderManager'
import { DictionaryManager } from './DictionaryManager'
import { validateProviders, type ProviderConfig } from '../providers'
import type { DictionaryProviderConfig } from '../dictionary/types'
import { PiTextbox } from 'react-icons/pi'
import { BsKeyboard } from 'react-icons/bs'
import { Cell, Grid } from 'baseui/layout-grid'

import useSWR from 'swr'

import { Skeleton } from 'baseui/skeleton'
import { SpeakerIcon } from './SpeakerIcon'
import Toaster, { toast } from './Toaster'
import { RxSpeakerLoud } from 'react-icons/rx'

import { Textarea } from 'baseui/textarea'
import { ProxyTester } from './ProxyTester'
import { isMacOS } from '../utils'
import NumberInput from './NumberInput'
import { GiPlatform } from 'react-icons/gi'
import { ActionManager } from './ActionManager'

const langOptions: Value = supportedLanguages.reduce((acc, [id, label]) => {
    return [
        ...acc,
        {
            id,
            label,
        } as Option,
    ]
}, [] as Value)

interface ILanguageSelectorProps {
    value?: string
    onChange?: (value: string) => void
    onBlur?: () => void
}

const linkStyle = {
    color: 'inherit',
    opacity: 0.8,
    cursor: 'pointer',
    outline: 'none',
}

function LanguageSelector({ value, onChange, onBlur }: ILanguageSelectorProps) {
    return (
        <Select
            onBlur={onBlur}
            size='compact'
            clearable={false}
            options={langOptions}
            value={value ? [{ id: value }] : []}
            onChange={({ value }) => {
                const selected = value[0]
                onChange?.(selected?.id as string)
            }}
        />
    )
}

interface ITranslateModeSelectorProps {
    value?: TranslateMode | 'nop'
    onChange?: (value: TranslateMode | 'nop') => void
    onBlur?: () => void
}

function TranslateModeSelector({ value, onChange, onBlur }: ITranslateModeSelectorProps) {
    const actions = useLiveQuery(() => actionService.list())
    const { t } = useTranslation()

    return (
        <Select
            size='compact'
            onBlur={onBlur}
            searchable={false}
            clearable={false}
            value={
                value && [
                    {
                        id: value,
                    },
                ]
            }
            onChange={(params) => {
                onChange?.(params.value[0].id as TranslateMode | 'nop')
            }}
            options={
                [
                    { label: t('Nop'), id: 'nop' },
                    ...(actions?.map((item) => ({
                        label: item.mode ? t(item.name) : item.name,
                        id: item.mode ? item.mode : String(item.id),
                    })) ?? []),
                ] as {
                    label: string
                    id: string
                }[]
            }
        />
    )
}

interface IThemeTypeSelectorProps {
    value?: ThemeType
    onChange?: (value: ThemeType) => void
    onBlur?: () => void
}

function ThemeTypeSelector({ value, onChange, onBlur }: IThemeTypeSelectorProps) {
    const { t } = useTranslation()

    return (
        <Select
            size='compact'
            onBlur={onBlur}
            searchable={false}
            clearable={false}
            value={
                value
                    ? [
                          {
                              id: value,
                          },
                      ]
                    : []
            }
            onChange={(params) => {
                onChange?.(params.value[0].id as ThemeType)
            }}
            options={[
                { label: t('Follow the System'), id: 'followTheSystem' },
                { label: t('Dark'), id: 'dark' },
                { label: t('Light'), id: 'light' },
            ]}
        />
    )
}

interface ILanguageDetectionEngineSelectorProps {
    value?: LanguageDetectionEngine
    onChange?: (value: LanguageDetectionEngine) => void
    onBlur?: () => void
}

function LanguageDetectionEngineSelector({ value, onChange, onBlur }: ILanguageDetectionEngineSelectorProps) {
    const { t } = useTranslation()

    return (
        <Select
            size='compact'
            onBlur={onBlur}
            searchable={false}
            clearable={false}
            value={
                value
                    ? [
                          {
                              id: value,
                          },
                      ]
                    : []
            }
            onChange={(params) => {
                onChange?.(params.value[0].id as LanguageDetectionEngine)
            }}
            options={[
                { label: t('Baidu'), id: 'baidu' },
                { label: t('Google'), id: 'google' },
                { label: t('Bing'), id: 'bing' },
                { label: t('Local'), id: 'local' },
            ]}
        />
    )
}

const useTTSSettingsStyles = createUseStyles({
    label: (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentPrimary,
        fontWeight: 500,
    }),
    voiceSelector: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
    },
    formControl: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    tickBar: (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentPrimary,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '16px',
        paddingLeft: '16px',
    }),
})

interface ISpeakerButtonProps extends ButtonProps {
    iconSize?: number
    provider?: TTSProvider
    lang: LangCode
    voice: string
    rate?: number
    volume?: number
    text?: string
}

function SpeakerButton({
    iconSize = 13,
    provider,
    text: text_,
    lang,
    voice,
    rate,
    volume,
    ...buttonProps
}: ISpeakerButtonProps) {
    const text = text_ ?? ttsLangTestTextMap[lang]

    return (
        <Button
            type='button'
            shape='circle'
            size='mini'
            {...buttonProps}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const target = e.target as HTMLButtonElement
                target.querySelector('div')?.click()
            }}
        >
            <SpeakerIcon
                size={iconSize}
                provider={provider}
                text={text}
                lang={lang}
                voice={voice}
                rate={rate}
                volume={volume}
            />
        </Button>
    )
}

interface ITTSVoicesSettingsProps {
    value?: ISettings['tts']
    onChange?: (value: ISettings['tts']) => void
    onBlur?: () => void
}

const ttsProviderOptions: {
    label: string
    id: TTSProvider
}[] = [
    { label: 'Local TTS (MeloTTS / Kokoro)', id: 'LocalTTS' },
    // Edge TTS is hidden while its public endpoint is unusable; stored
    // 'EdgeTTS' selections are migrated to 'LocalTTS' in getSettings.
    { label: 'System Default', id: 'WebSpeech' },
]

function TTSVoicesSettings({ value, onChange, onBlur }: ITTSVoicesSettingsProps) {
    console.debug('render tts voices settings')

    const { t } = useTranslation()
    const { theme, themeType } = useTheme()

    const styles = useTTSSettingsStyles({ theme, themeType, isDesktopApp: utils.isDesktopApp() })

    const [showLangSelector, setShowLangSelector] = useState(false)

    const [supportedVoices, setSupportedVoices] = useState<SpeechSynthesisVoice[]>([])

    const provider = value?.provider ?? defaultTTSProvider

    const { data: localVoices, isLoading: isLocalVoicesLoading } = useSWR(
        provider === 'LocalTTS' ? 'localTTSVoices' : null,
        fetchLocalVoices
    )

    const { data: edgeVoices, isLoading: isEdgeVoicesLoading } = useSWR(
        provider === 'EdgeTTS' ? 'edgeVoices' : null,
        fetchEdgeVoices
    )

    const { data: webSpeechVoices, isLoading: isWebSpeechVoicesLoading } = useSWR(
        provider === 'WebSpeech' ? 'webSpeechVoices' : null,
        async () => {
            return speechSynthesis.getVoices()
        }
    )

    const isVoicesLoading = isLocalVoicesLoading || isEdgeVoicesLoading || isWebSpeechVoicesLoading

    useEffect(() => {
        switch (provider) {
            case 'LocalTTS':
                setSupportedVoices(localVoices ?? [])
                break
            case 'EdgeTTS':
                setSupportedVoices(edgeVoices ?? [])
                break
            case 'WebSpeech':
                setSupportedVoices(webSpeechVoices ?? [])
                break
            default:
                setSupportedVoices(edgeVoices ?? [])
                break
        }
    }, [edgeVoices, localVoices, provider, webSpeechVoices])

    const getLangOptions = useCallback(
        (lang: string) => {
            return supportedLanguages.reduce((acc, [langCode, label]) => {
                const ttsLang = langCode2TTSLang[langCode]
                if (ttsLang && supportedVoices.find((v) => v.lang === ttsLang)) {
                    if (value?.voices?.find((item) => item.lang === langCode) && langCode !== lang) {
                        return acc
                    }
                    return [
                        ...acc,
                        {
                            id: langCode,
                            label,
                        } as Option,
                    ]
                }
                return acc
            }, [] as Value)
        },
        [value?.voices, supportedVoices]
    )

    const getVoiceOptions = useCallback(
        (lang: LangCode) => {
            const ttsLang = langCode2TTSLang[lang]
            return supportedVoices
                .filter((v) => v.lang.split('-')[0] === lang || v.lang === ttsLang)
                .filter((v, idx, items) => items.findIndex((item) => item.name === v.name) === idx)
                .map((sv) => ({
                    id: sv.voiceURI,
                    label: (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                            }}
                            key={sv.voiceURI}
                        >
                            <SpeakerButton
                                shape='round'
                                kind='secondary'
                                iconSize={12}
                                overrides={{
                                    Root: {
                                        style: {
                                            padding: '4px',
                                        },
                                    },
                                }}
                                provider={value?.provider}
                                lang={lang}
                                voice={sv.voiceURI}
                                volume={value?.volume}
                                rate={value?.rate}
                            />
                            {sv.name}
                        </div>
                    ),
                    lang: sv.lang,
                }))
        },
        [supportedVoices, value?.provider, value?.rate, value?.volume]
    )

    const handleDeleteLang = useCallback(
        (lang: string) => {
            const voices = value?.voices ?? []
            const newVoices = voices.filter((item) => {
                return item.lang !== lang
            })
            onChange?.({ ...value, voices: newVoices })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    const handleChangeLang = useCallback(
        (prevLang: LangCode, newLang: LangCode) => {
            const voices = value?.voices ?? []
            const newVoices = voices.map((item) => {
                if (item.lang === prevLang) {
                    return {
                        lang: newLang,
                        voice: '',
                    }
                }
                return item
            })
            onChange?.({ ...value, voices: newVoices })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    const handleAddLang = useCallback(
        (lang: LangCode) => {
            const voices = value?.voices ?? []
            onChange?.({
                ...value,
                voices: [
                    ...voices,
                    {
                        lang,
                        voice: '',
                    },
                ],
            })
            setShowLangSelector(false)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    const handleChangeVoice = useCallback(
        (lang: string, voice: string) => {
            const voices = value?.voices ?? []
            const newVoices = voices.map((item) => {
                if (item.lang === lang) {
                    return {
                        ...item,
                        voice,
                    }
                }
                return item
            })
            onChange?.({ ...value, voices: newVoices })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    const handleChangeProvider = useCallback(
        (provider: TTSProvider) => {
            onChange?.({ ...value, provider })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value]
    )

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                marginTop: 20,
            }}
        >
            <div className={styles.formControl}>
                <label className={styles.label}>{t('Provider')}</label>
                <Select
                    size='compact'
                    clearable={false}
                    searchable={false}
                    options={ttsProviderOptions}
                    value={[{ id: value?.provider ?? defaultTTSProvider }]}
                    onChange={({ option }) => handleChangeProvider(option?.id as TTSProvider)}
                    onBlur={onBlur}
                />
            </div>
            <div className={styles.formControl}>
                <label className={styles.label}>{t('Rate')}</label>
                <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={[value?.rate ?? 10]}
                    onChange={(params) => onChange?.({ ...value, rate: params.value[0] })}
                    overrides={{
                        ThumbValue: () => null,
                        InnerThumb: () => null,
                        TickBar: () => (
                            <div className={styles.tickBar}>
                                <div>{t('Slow')}</div>
                                <div>{t('Fast')}</div>
                            </div>
                        ),
                    }}
                />
            </div>
            <div className={styles.formControl}>
                <label className={styles.label}>{t('Volume')}</label>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[value?.volume ?? 100]}
                    onChange={(params) => onChange?.({ ...value, volume: params.value[0] })}
                    overrides={{
                        ThumbValue: () => null,
                        InnerThumb: () => null,
                        TickBar: () => (
                            <div className={styles.tickBar}>
                                <div>{t('Quiet')}</div>
                                <div>{t('Loud')}</div>
                            </div>
                        ),
                    }}
                />
            </div>
            <div className={styles.formControl}>
                <label className={styles.label}>{t('Voice')}</label>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    {isVoicesLoading && <Skeleton rows={6} height='300px' width='100%' animation />}
                    {!isVoicesLoading &&
                        (value?.voices ?? []).map(({ lang, voice }) => {
                            const langOptions = getLangOptions(lang)
                            const selectedLang = langOptions.find((opt) => opt.id === lang)
                            const voiceOptions = getVoiceOptions(lang)
                            const selectedVoice = voiceOptions.find((opt) => opt.id === voice)
                            return (
                                <div className={styles.voiceSelector} key={lang}>
                                    <Select
                                        key={`lang-${lang}`}
                                        size='mini'
                                        clearable={false}
                                        options={langOptions}
                                        placeholder={t('Please select a language')}
                                        overrides={{
                                            Root: {
                                                style: {
                                                    width: '115px',
                                                    flexShrink: 0,
                                                },
                                            },
                                        }}
                                        onChange={({ option }) => handleChangeLang(lang, option?.id as LangCode)}
                                        value={selectedLang ? [{ id: selectedLang.id }] : undefined}
                                    />
                                    <Select
                                        size='mini'
                                        options={voiceOptions}
                                        placeholder={t('Please select a voice')}
                                        overrides={{
                                            Root: {
                                                style: {
                                                    flexShrink: 1,
                                                    minWidth: '215px',
                                                },
                                            },
                                        }}
                                        value={selectedVoice ? [{ id: selectedVoice.id }] : undefined}
                                        onChange={({ option }) => handleChangeVoice(lang, option?.id as string)}
                                        clearable={false}
                                        onBlur={onBlur}
                                        autoFocus={!selectedVoice}
                                    />
                                    <Button
                                        shape='circle'
                                        size='mini'
                                        overrides={{
                                            Root: {
                                                style: {
                                                    flexShrink: 0,
                                                },
                                            },
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleDeleteLang(lang)
                                        }}
                                    >
                                        <RiDeleteBin5Line size={12} />
                                    </Button>
                                </div>
                            )
                        })}
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 10,
                    }}
                >
                    {showLangSelector && (
                        <Select
                            size='mini'
                            placeholder={t('Please select a language')}
                            clearable={false}
                            options={getLangOptions('')}
                            onChange={({ option }) => handleAddLang(option?.id as LangCode)}
                            autoFocus
                        />
                    )}
                    <Button
                        type='button'
                        size='mini'
                        overrides={{
                            Root: {
                                style: {
                                    flexShrink: 0,
                                },
                            },
                        }}
                        startEnhancer={() => <IoMdAdd size={12} />}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowLangSelector(true)
                        }}
                    >
                        {t('Add')}
                    </Button>
                </div>
            </div>
        </div>
    )
}

interface IProxyProtocolProps {
    value?: ProxyProtocol
    onChange?: (value: ProxyProtocol) => void
    onBlur?: () => void
}

function ProxyProtocolSelector({ value, onChange, onBlur }: IProxyProtocolProps) {
    const options = [
        { label: 'HTTP', id: 'HTTP' },
        { label: 'HTTPS', id: 'HTTPS' },
    ]

    return (
        <Select
            size='compact'
            onBlur={onBlur}
            searchable={false}
            clearable={false}
            value={
                value
                    ? [
                          {
                              id: value,
                              label: options.find((option) => option.id === value)?.label || 'HTTP',
                          },
                      ]
                    : undefined
            }
            onChange={(params) => {
                onChange?.(params.value[0].id as ProxyProtocol)
            }}
            options={options}
        />
    )
}

interface Ii18nSelectorProps {
    value?: string
    onChange?: (value: string) => void
    onBlur?: () => void
}

function Ii18nSelector({ value, onChange, onBlur }: Ii18nSelectorProps) {
    const { i18n } = useTranslation()

    const options = [
        { label: 'English', id: 'en' },
        { label: '简体中文', id: 'zh-Hans' },
        { label: '繁體中文', id: 'zh-Hant' },
        { label: '日本語', id: 'ja' },
        { label: '한국어', id: 'ko' },
        { label: 'ไทย', id: 'th' },
        { label: 'Türkçe', id: 'tr' },
    ]

    return (
        <Select
            size='compact'
            onBlur={onBlur}
            searchable={false}
            clearable={false}
            value={
                value
                    ? [
                          {
                              id: value,
                              label: options.find((option) => option.id === value)?.label || 'en',
                          },
                      ]
                    : undefined
            }
            onChange={(params) => {
                onChange?.(params.value[0].id as string)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(i18n as any).changeLanguage(params.value[0].id as string)
            }}
            options={options}
        />
    )
}

interface AutoTranslateCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function AutoTranslateCheckbox({ value, onChange, onBlur }: AutoTranslateCheckboxProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

interface MyCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function MyCheckbox({ value, onChange, onBlur }: MyCheckboxProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

interface RestorePreviousPositionCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function RestorePreviousPositionCheckbox({ value, onChange, onBlur }: RestorePreviousPositionCheckboxProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}
interface SelectInputElementsProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function SelectInputElementsCheckbox({ value, onChange, onBlur }: SelectInputElementsProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

interface ReadSelectedWordsFromInputElementsProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function ReadSelectedWordsFromInputElementsCheckbox({
    value,
    onChange,
    onBlur,
}: ReadSelectedWordsFromInputElementsProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

interface RunAtStartupCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function RunAtStartupCheckbox({ value, onChange, onBlur }: RunAtStartupCheckboxProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

interface UseCompactLookupCheckboxProps {
    value?: boolean
    onChange?: (value: boolean) => void
    onBlur?: () => void
}

function UseCompactLookupCheckbox({ value, onChange, onBlur }: UseCompactLookupCheckboxProps) {
    return (
        <Checkbox
            checkmarkType='toggle_round'
            checked={value}
            onChange={(e) => {
                onChange?.(e.target.checked)
                onBlur?.()
            }}
        />
    )
}

const useStyles = createUseStyles({
    footer: (props: IThemedStyleProps) =>
        props.isDesktopApp
            ? {
                  zIndex: 999,
                  color: props.theme.colors.contentSecondary,
                  position: 'fixed',
                  width: '100%',
                  height: '42px',
                  cursor: 'pointer',
                  left: '0',
                  bottom: '0',
                  paddingLeft: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  background: props.themeType === 'dark' ? 'rgba(31, 31, 31, 0.65)' : 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderTop: `1px solid ${props.themeType === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  transition: 'background 0.3s ease',
              }
            : {
                  color: props.theme.colors.contentSecondary,
                  position: 'absolute',
                  cursor: 'pointer',
                  bottom: '16px',
                  left: '6px',
                  lineHeight: '1',
              },
})

const useHotkeyRecorderStyles = createUseStyles({
    'hotkeyRecorder': (props: IThemedStyleProps) => ({
        position: 'relative',
        height: '34px',
        lineHeight: '34px',
        padding: '0 14px',
        borderRadius: '10px',
        width: '300px',
        cursor: 'pointer',
        border: '1px dashed transparent',
        backgroundColor: props.themeType === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        color: props.theme.colors.primary,
        transition: 'all 0.2s ease',
    }),
    'clearHotkey': {
        position: 'absolute',
        top: '10px',
        right: '12px',
    },
    'caption': (props: IThemedStyleProps) => ({
        marginTop: '4px',
        fontSize: '11px',
        color: props.theme.colors.contentTertiary,
    }),
    'recording': {
        animation: '$recording 2s infinite',
    },
    '@keyframes recording': {
        '0%': {
            backgroundColor: 'transparent',
        },
        '50%': {
            backgroundColor: 'rgba(128,128,128,0.12)',
            borderColor: 'rgba(128,128,128,0.4)',
        },
        '100%': {
            backgroundColor: 'transparent',
        },
    },
})

interface IHotkeyRecorderProps {
    value?: string
    onChange?: (value: string) => void
    onBlur?: () => void
    testId?: string
}

function HotkeyRecorder({ value, onChange, onBlur, testId }: IHotkeyRecorderProps) {
    const { theme, themeType } = useTheme()

    const { t } = useTranslation()

    const styles = useHotkeyRecorderStyles({ themeType, theme })
    const [keys, { start, stop, isRecording }] = useRecordHotkeys()

    const [hotKeys, setHotKeys] = useState<string[]>([])
    useEffect(() => {
        if (value) {
            setHotKeys(
                value
                    .replace(/-/g, '+')
                    .split('+')
                    .map((k) => k.trim())
                    .filter(Boolean)
            )
        }
    }, [value])

    useEffect(() => {
        let keys_ = Array.from(keys)
        if (keys_ && keys_.length > 0) {
            keys_ = keys_.map((k) => (k.toLowerCase() === 'meta' ? 'CommandOrControl' : k))
            setHotKeys(keys_)
            onChange?.(keys_.join('+'))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keys])

    useEffect(() => {
        if (!isRecording) {
            onChange?.(hotKeys.join('+'))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hotKeys, isRecording])

    useEffect(() => {
        const stopRecording = () => {
            if (isRecording) {
                stop()
                onBlur?.()
            }
        }
        document.addEventListener('click', stopRecording)
        return () => {
            document.removeEventListener('click', stopRecording)
        }
    }, [isRecording, onBlur, stop])

    function clearHotkey() {
        onChange?.('')
        setHotKeys([])
    }

    return (
        <div>
            <div
                onClick={(e) => {
                    e.stopPropagation()
                    e.currentTarget.focus()
                    if (!isRecording) {
                        start()
                    } else {
                        stop()
                    }
                }}
                data-testid={testId}
                className={clsx(styles.hotkeyRecorder, {
                    [styles.recording]: isRecording,
                })}
            >
                {hotKeys.join(' + ')}
                {!isRecording && hotKeys.length > 0 ? (
                    <IoCloseCircle
                        className={styles.clearHotkey}
                        onClick={(e: React.MouseEvent<SVGElement>) => {
                            e.stopPropagation()
                            clearHotkey()
                        }}
                    />
                ) : null}
            </div>
            <div className={styles.caption}>
                {isRecording ? t('Please press the hotkey you want to set.') : t('Click above to set hotkeys.')}
            </div>
        </div>
    )
}

interface IProviderSelectorProps {
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

const { Form, FormItem, useForm } = createForm<ISettings>()

interface IInnerSettingsProps {
    showFooter?: boolean
    onSave?: (oldSettings: ISettings) => void
}

interface ISettingsProps extends IInnerSettingsProps {
    engine: Styletron
}

export function Settings({ engine, ...props }: ISettingsProps) {
    const { theme } = useTheme()
    return (
        <StyletronProvider value={engine}>
            <BaseProvider theme={theme}>
                <GlobalSuspense>
                    <InnerSettings {...props} />
                </GlobalSuspense>
            </BaseProvider>
        </StyletronProvider>
    )
}

export function InnerSettings({ onSave, showFooter = false }: IInnerSettingsProps) {
    const isTauri = utils.isTauri()
    const trackTauriEvent = useCallback(
        async (eventName: string, payload?: Record<string, string | number>) => {
            if (!isTauri) {
                return
            }
            try {
                const { trackEvent } = await import('@aptabase/tauri')
                await trackEvent(eventName, payload)
            } catch (error) {
                console.error(`Failed to track event ${eventName}`, error)
            }
        },
        [isTauri]
    )

    useEffect(() => {
        void trackTauriEvent('screen_view', { name: 'Settings' })
    }, [trackTauriEvent])

    const { theme, themeType } = useTheme()

    const { refreshThemeType } = useThemeType()

    const { t, i18n } = useTranslation()

    const [loading, setLoading] = useState(false)
    const { settings, setSettings } = useSettings()
    const [values, setValues] = useState<ISettings>(settings)
    const [prevValues, setPrevValues] = useState<ISettings>(values)
    const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>()
    const [showProviderErrors, setShowProviderErrors] = useState(false)

    const valuesRef = useRef(values)
    useEffect(() => {
        valuesRef.current = values
    }, [values])
    const prevValuesRef = useRef(prevValues)
    useEffect(() => {
        prevValuesRef.current = prevValues
    }, [prevValues])

    const [form] = useForm()

    useEffect(() => {
        form.setFieldsValue(values)
    }, [form, values])

    useEffect(() => {
        if (settings) {
            ;(async () => {
                if (isTauri) {
                    const { isEnabled: autostartIsEnabled } = await import('@tauri-apps/plugin-autostart')
                    settings.runAtStartup = await autostartIsEnabled()
                }
                // A settings refresh (SWR revalidates at arbitrary moments)
                // must never clobber unsaved in-progress edits: overwriting
                // `values` here resets the whole form, which reverted a model
                // picked in the combobox back to its stored value.
                if (!_.isEqual(valuesRef.current, prevValuesRef.current)) {
                    return
                }
                setValues(settings)
                setPrevValues(settings)

                // Set i18n language based on settings
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (settings.i18n && (i18n as any).language !== settings.i18n) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (i18n as any).changeLanguage(settings.i18n)
                }
            })()
        }
    }, [isTauri, settings, i18n])

    /**
     * `onValuesChange` reports the registered fields only — `getFieldsValue()`
     * projects the store through the mounted `FormItem`s. Anything the form
     * holds but does not render as a field, the provider list above all, is
     * therefore absent, and replacing `values` with it blanked the provider
     * editor out on every unrelated edit (a theme switch, a language change).
     * Merging keeps those keys; the settings on disk were never affected,
     * because `setSettings` writes a partial.
     */
    const onChange = useCallback((_changes: Partial<ISettings>, values_: ISettings) => {
        setValues((prev) => ({ ...prev, ...values_ }))
    }, [])

    /**
     * The provider list edits itself outside the form, so it has to write back
     * through the form as well as persist: leaving it out of `form` would make
     * the next unrelated field change overwrite it with the stale value.
     */
    const handleProvidersChange = useCallback(
        (providers: ProviderConfig[], defaultProviderId?: string) => {
            const nextDefault =
                defaultProviderId && providers.some((p) => p.id === defaultProviderId)
                    ? defaultProviderId
                    : providers[0]?.id
            form.setFieldsValue({ providers, defaultProviderId: nextDefault })
            setValues((prev) => {
                const next = { ...prev, providers, defaultProviderId: nextDefault }
                if (validateProviders(providers).length === 0) {
                    void utils.setSettings({ providers, defaultProviderId: nextDefault })
                    setShowProviderErrors(false)
                }
                return next
            })
        },
        [form]
    )

    const handleDictionaryChange = useCallback(
        (providers: DictionaryProviderConfig[], defaultProviderId?: string) => {
            const nextDefault =
                defaultProviderId && providers.some((p) => p.id === defaultProviderId)
                    ? defaultProviderId
                    : providers[0]?.id
            setValues((prev) => {
                const nextDict = {
                    ...(prev.dictionary || {}),
                    enabled: prev.dictionary?.enabled ?? true,
                    providers,
                    defaultProviderId: nextDefault,
                }
                form.setFieldsValue({ dictionary: nextDict })
                void utils.setSettings({ dictionary: nextDict })
                return { ...prev, dictionary: nextDict }
            })
        },
        [form]
    )

    const handleDictionaryEnabledChange = useCallback(
        (enabled: boolean) => {
            setValues((prev) => {
                const nextDict = {
                    ...(prev.dictionary || {}),
                    enabled,
                    providers: prev.dictionary?.providers ?? [],
                    defaultProviderId: prev.dictionary?.defaultProviderId,
                }
                form.setFieldsValue({ dictionary: nextDict })
                void utils.setSettings({ dictionary: nextDict })
                return { ...prev, dictionary: nextDict }
            })
        },
        [form]
    )

    const onSubmit = useCallback(
        async (submitted: ISettings) => {
            setLoading(true)
            const oldSettings = await utils.getSettings()
            // Same projection as `onChange`: what the form hands back covers the
            // rendered fields only, so save it over the state that also holds
            // the provider list rather than in place of it.
            const data: ISettings = { ...valuesRef.current, ...submitted }

            const providerErrors = validateProviders(data.providers ?? [])
            if (providerErrors.length > 0) {
                const first = providerErrors[0]
                setSelectedProviderId(first.providerId)
                setShowProviderErrors(true)
                toast.error(
                    t('Provider "{{name}}" is missing required fields', {
                        name: first.providerName,
                    })
                )
                setLoading(false)
                return
            }

            if (isTauri) {
                try {
                    const {
                        enable: autostartEnable,
                        disable: autostartDisable,
                        isEnabled: autostartIsEnabled,
                    } = await import('@tauri-apps/plugin-autostart')
                    if (data.runAtStartup) {
                        await autostartEnable()
                    } else {
                        await autostartDisable()
                    }
                    data.runAtStartup = await autostartIsEnabled()
                } catch (e) {
                    console.log('err', e)
                }
            }
            await utils.setSettings(data)

            if (data.themeType) {
                refreshThemeType()
            }

            void trackTauriEvent('save_settings')

            toast(t('Saved'), {
                icon: '👍',
                duration: 3000,
            })
            setShowProviderErrors(false)
            setLoading(false)
            setSettings(data)
            onSave?.(oldSettings)
        },
        [isTauri, onSave, setSettings, refreshThemeType, t, trackTauriEvent]
    )

    const onBlur = useCallback(async () => {
        if (!_.isEqual(values, prevValues)) {
            const dataToSave =
                validateProviders(values.providers ?? []).length === 0
                    ? values
                    : {
                          ...values,
                          providers: prevValues.providers,
                          defaultProviderId: prevValues.defaultProviderId,
                      }
            await utils.setSettings(dataToSave)
            setPrevValues(values)
        }
    }, [prevValues, values])

    const isDesktopApp = utils.isDesktopApp()

    const styles = useStyles({ theme, themeType, isDesktopApp })

    const [isScrolledToBottom, setIsScrolledToBottom] = useState(false)

    useEffect(() => {
        if (!showFooter) {
            return undefined
        }
        const isOnBottom = () => {
            const scrollTop = document.documentElement.scrollTop

            const windowHeight = window.innerHeight

            const documentHeight = document.documentElement.scrollHeight

            return scrollTop + windowHeight >= documentHeight
        }

        setIsScrolledToBottom(isOnBottom())

        const onScroll = () => {
            setIsScrolledToBottom(isOnBottom())
        }

        window.addEventListener('scroll', onScroll)
        window.addEventListener('resize', onScroll)
        const observer = new MutationObserver(onScroll)
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        })
        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            observer.disconnect()
        }
    }, [showFooter])

    const [activeTab, setActiveTab] = useState('general')

    const [isScrolled, setIsScrolled] = useState(window.scrollY > 0)

    useEffect(() => {
        const onScroll = () => {
            setIsScrolled(window.scrollY > 0)
        }
        window.addEventListener('scroll', onScroll)
        return () => {
            window.removeEventListener('scroll', onScroll)
        }
    }, [])

    const tabsOverrides = {
        Root: {
            style: {
                '& button:hover': {
                    background: 'transparent !important',
                },
            },
        },
        TabList: {
            style: {
                'overflowX': 'auto',
                'scrollbarWidth': 'none',
                '::-webkit-scrollbar': {
                    display: 'none',
                },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component: function TabsListOverride(props: any) {
                return (
                    <Grid
                        behavior='fluid'
                        overrides={{
                            Grid: {
                                style: {
                                    flexWrap: 'nowrap',
                                    maxWidth: '100%',
                                },
                            },
                        }}
                    >
                        <Cell
                            span={12}
                            overrides={{
                                Cell: {
                                    style: {
                                        minWidth: 0,
                                        maxWidth: '100%',
                                    },
                                },
                            }}
                        >
                            <StyledTabList
                                {...props}
                                onWheel={(e: React.WheelEvent<HTMLDivElement>) => {
                                    props.onWheel?.(e)
                                    if (e.deltaY && !e.deltaX) {
                                        e.currentTarget.scrollLeft += e.deltaY
                                    }
                                }}
                            />
                        </Cell>
                    </Grid>
                )
            },
        },
    }

    const tabOverrides = {
        TabPanel: {
            style: {
                padding: '0px',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component: function TabsListOverride(props: any) {
                return (
                    <Grid>
                        <Cell span={[1, 2, 3]}>
                            <StyledTabPanel {...props} />
                        </Cell>
                    </Grid>
                )
            },
        },
        Tab: {
            style: {
                'color': theme.colors.black,
                'background': 'transparent',
                'whiteSpace': 'nowrap',
                'flexShrink': 0,
                'paddingLeft': '14px',
                'paddingRight': '14px',
                ':hover': {
                    background: 'rgba(255, 255, 255, 0.35) !important',
                },
                ':active': {
                    background: 'rgba(255, 255, 255, 0.45) !important',
                },
            },
        },
    }

    console.debug('render settings')

    // The popup card (content script, and the userscript that shares its entry)
    // caps its own height and there is no window scroll behind it, so the pane has
    // to be the scroll container. `flex: 1` + `min-height: 0` bound it to the height
    // the card actually leaves for it — see `InnerContainer`.
    const inPopupCard = utils.isBrowserExtensionContentScript() || utils.isUserscript()

    return (
        <div
            style={{
                width: '100%',
                boxSizing: 'border-box',
                paddingTop: utils.isBrowserExtensionOptions() ? undefined : '136px',
                // The translator's 42px footer floats over the pane; without room for
                // it the last setting can never be scrolled clear of it.
                paddingBottom: utils.isBrowserExtensionOptions() ? undefined : inPopupCard ? '52px' : '32px',
                background: isDesktopApp ? 'transparent' : theme.colors.backgroundPrimary,
                minWidth: isDesktopApp ? 450 : 400,
                flex: inPopupCard ? '1 1 auto' : undefined,
                minHeight: inPopupCard ? 0 : undefined,
                overflowY: inPopupCard ? 'auto' : undefined,
            }}
            onScroll={inPopupCard ? (e) => setIsScrolled(e.currentTarget.scrollTop > 0) : undefined}
            data-testid='settings-container'
        >
            <nav
                style={{
                    position: utils.isBrowserExtensionOptions() ? 'sticky' : 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: 999,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: `url(${utils.getAssetUrl(beams)}) no-repeat center center`,
                    boxSizing: 'border-box',
                    boxShadow: isScrolled ? theme.lighting.shadow600 : undefined,
                }}
                data-tauri-drag-region
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        color: '#333',
                        gap: 10,
                        padding: '15px 25px 0 25px',
                    }}
                >
                    <img width='22' src={utils.getAssetUrl(icon)} alt='logo' />
                    <h2
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        NextAI Translator
                        {AppConfig?.version ? (
                            <a
                                href='https://github.com/nextai-translator/nextai-translator/releases'
                                target='_blank'
                                rel='noreferrer'
                                style={linkStyle}
                            >
                                {AppConfig.version}
                            </a>
                        ) : null}
                    </h2>
                    <div
                        style={{
                            flexGrow: 1,
                        }}
                    />
                </div>
                <Tabs
                    overrides={tabsOverrides}
                    activeKey={activeTab}
                    onChange={({ activeKey }) => {
                        setActiveTab(activeKey as string)
                    }}
                    fill='fixed'
                    renderAll
                >
                    <Tab
                        title={t('General')}
                        key='general'
                        artwork={() => {
                            return <IoSettingsOutline size={16} />
                        }}
                        overrides={tabOverrides}
                    />
                    <Tab
                        title={t('Actions')}
                        key='actions'
                        artwork={() => {
                            return <GiPlatform size={16} />
                        }}
                        overrides={tabOverrides}
                    />
                    <Tab
                        title={t('Dictionary')}
                        key='dictionary'
                        artwork={() => {
                            return <RiBook2Line size={16} />
                        }}
                        overrides={tabOverrides}
                    />
                    {isTauri && (
                        <Tab
                            title={t('Proxy')}
                            key='proxy'
                            artwork={() => {
                                return <RiCloudLine size={16} />
                            }}
                            overrides={tabOverrides}
                        />
                    )}
                    <Tab
                        title={t('TTS')}
                        key='tts'
                        artwork={() => {
                            return <RxSpeakerLoud size={16} />
                        }}
                        overrides={tabOverrides}
                    />
                    {isDesktopApp && (
                        <Tab
                            title={t('Writing')}
                            key='writing'
                            artwork={() => {
                                return <PiTextbox size={16} />
                            }}
                            overrides={tabOverrides}
                        />
                    )}
                    <Tab
                        title={t('Shortcuts')}
                        key='shortcuts'
                        artwork={() => {
                            return <BsKeyboard size={16} />
                        }}
                        overrides={{
                            ...tabOverrides,
                            Tab: {
                                ...tabOverrides.Tab,
                                props: {
                                    'data-testid': 'shortcuts',
                                },
                            },
                        }}
                    />
                </Tabs>
            </nav>

            <Form
                autoComplete='off'
                autoCapitalize='off'
                form={form}
                style={{
                    padding: '20px 25px',
                    paddingBottom: utils.isBrowserExtensionOptions() ? 0 : undefined,
                }}
                onFinish={onSubmit}
                initialValues={values}
                onValuesChange={onChange}
            >
                <div>
                    <div
                        style={{
                            display: activeTab === 'general' ? 'block' : 'none',
                        }}
                    >
                        <FormItem name='i18n' label={t('i18n')}>
                            <Ii18nSelector onBlur={onBlur} />
                        </FormItem>
                        <div style={{ marginBottom: '14px' }}>
                            <div
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    marginBottom: '6px',
                                    color: theme.colors.contentSecondary,
                                }}
                            >
                                {t('Providers')}
                            </div>
                            <ProviderManager
                                providers={values.providers ?? []}
                                defaultProviderId={values.defaultProviderId}
                                selectedId={selectedProviderId}
                                onSelectId={setSelectedProviderId}
                                showErrors={showProviderErrors}
                                onChange={handleProvidersChange}
                            />
                        </div>
                        <FormItem name='defaultTranslateMode' label={t('Default Action')}>
                            <TranslateModeSelector onBlur={onBlur} />
                        </FormItem>
                        <FormItem name='defaultTargetLanguage' label={t('Default target language')}>
                            <LanguageSelector onBlur={onBlur} />
                        </FormItem>
                        <FormItem name='languageDetectionEngine' label={t('Language detection engine')}>
                            <LanguageDetectionEngineSelector onBlur={onBlur} />
                        </FormItem>
                        <FormItem name='themeType' label={t('Theme')}>
                            <ThemeTypeSelector onBlur={onBlur} />
                        </FormItem>
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='enableBackgroundBlur'
                            label={t('Window background blur')}
                            caption={t(
                                "If the window background blur effect is enabled, please ensure to set the 'Theme' to 'Follow the System', as it is currently not possible to manually switch between light and dark themes when the window background blur is active."
                            )}
                        >
                            <MyCheckbox onBlur={onBlur} />
                        </FormItem>
                        <FormItem
                            name='fontSize'
                            label={t('Font size')}
                            caption={t('Controls the font size of the input box and the translation text.')}
                        >
                            <NumberInput min={8} max={40} step={1} />
                        </FormItem>
                        <FormItem
                            name='uiFontSize'
                            label={t('UI font size')}
                            caption={t('Controls the font size of the app interface (toolbar, menus, labels).')}
                        >
                            <NumberInput min={8} max={24} step={1} />
                        </FormItem>
                        <FormItem
                            name='alwaysShowIcons'
                            label={t('Show icon when text is selected')}
                            caption={
                                isDesktopApp && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        {t(
                                            'It is highly recommended to disable this feature and use the Clip Extension'
                                        )}
                                        <a
                                            href='https://github.com/nextai-translator/nextai-translator/blob/main/CLIP-EXTENSIONS.md'
                                            target='_blank'
                                            rel='noreferrer'
                                            style={linkStyle}
                                        >
                                            {t('Clip Extension')}
                                        </a>
                                    </div>
                                )
                            }
                        >
                            <MyCheckbox onBlur={onBlur} />
                        </FormItem>
                        <FormItem name='autoTranslate' label={t('Auto Translate')}>
                            <AutoTranslateCheckbox onBlur={onBlur} />
                        </FormItem>
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='restorePreviousPosition'
                            label={t('Fixed Position')}
                        >
                            <RestorePreviousPositionCheckbox onBlur={onBlur} />
                        </FormItem>
                        <FormItem name='selectInputElementsText' label={t('Word selection in input')}>
                            <SelectInputElementsCheckbox onBlur={onBlur} />
                        </FormItem>
                        {isTauri && (
                            <FormItem name='runAtStartup' label={t('Run at startup')}>
                                <RunAtStartupCheckbox onBlur={onBlur} />
                            </FormItem>
                        )}
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='hideTheIconInTheDock'
                            label={isMacOS ? t('Hide the icon in the Dock bar') : t('Hide the icon in the taskbar')}
                        >
                            <MyCheckbox onBlur={onBlur} />
                        </FormItem>
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='autoHideWindowWhenOutOfFocus'
                            label={t('Auto hide window when out of focus')}
                        >
                            <MyCheckbox onBlur={onBlur} />
                        </FormItem>
                        <FormItem
                            name='useCompactLookup'
                            label={t('Compact inline lookup mode')}
                            caption={t(
                                'When enabled, text selection translation shows a compact popup with only the translated result'
                            )}
                        >
                            <UseCompactLookupCheckbox onBlur={onBlur} />
                        </FormItem>
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='automaticCheckForUpdates'
                            label={t('Automatic check for updates')}
                        >
                            <MyCheckbox onBlur={onBlur} />
                        </FormItem>
                    </div>
                    <div
                        style={{
                            display: activeTab === 'actions' ? 'block' : 'none',
                        }}
                    >
                        <ActionManager embedded />
                    </div>
                    <div
                        style={{
                            display: activeTab === 'dictionary' ? 'block' : 'none',
                        }}
                    >
                        <DictionaryManager
                            enabled={values.dictionary?.enabled ?? true}
                            providers={values.dictionary?.providers ?? []}
                            defaultProviderId={values.dictionary?.defaultProviderId}
                            aiProviders={values.providers ?? []}
                            targetLang={values.defaultTargetLanguage}
                            onEnabledChange={handleDictionaryEnabledChange}
                            onChange={handleDictionaryChange}
                        />
                    </div>
                    <div
                        style={{
                            display: isTauri && activeTab === 'proxy' ? 'block' : 'none',
                        }}
                    >
                        <FormItem name={['proxy', 'enabled']} label={t('Enabled')}>
                            <MyCheckbox />
                        </FormItem>
                        <FormItem name={['proxy', 'protocol']} label={t('Protocol')}>
                            <ProxyProtocolSelector />
                        </FormItem>
                        <FormItem name={['proxy', 'server']} label={t('Server')}>
                            <Input size='compact' />
                        </FormItem>
                        <FormItem name={['proxy', 'port']} label={t('Port')}>
                            <Input type='number' size='compact' />
                        </FormItem>
                        <FormItem name={['proxy', 'basicAuth', 'username']} label={t('Username')}>
                            <Input size='compact' />
                        </FormItem>
                        <FormItem name={['proxy', 'basicAuth', 'password']} label={t('Password')}>
                            <Input type='password' size='compact' />
                        </FormItem>
                        <FormItem name={['proxy', 'noProxy']} label={t('No proxy')}>
                            <Textarea size='compact' />
                        </FormItem>
                        <ProxyTester proxy={values.proxy} />
                    </div>
                    <div
                        style={{
                            display: activeTab === 'tts' ? 'block' : 'none',
                        }}
                    >
                        <FormItem
                            name='readSelectedWordsFromInputElementsText'
                            label={t('Read the selected words in input')}
                        >
                            <ReadSelectedWordsFromInputElementsCheckbox onBlur={onBlur} />
                        </FormItem>
                        <FormItem name='tts' label={t('TTS')}>
                            <TTSVoicesSettings onBlur={onBlur} />
                        </FormItem>
                    </div>
                    <div
                        style={{
                            display: isDesktopApp && activeTab === 'writing' ? 'block' : 'none',
                        }}
                    >
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='writingTargetLanguage'
                            label={t('Writing target language')}
                        >
                            <LanguageSelector onBlur={onBlur} />
                        </FormItem>
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='writingHotkey'
                            label={t('Writing Hotkey')}
                            caption={t(
                                'Press this shortcut key in the input box of any application, and the text already entered in the input box will be automatically translated into the writing target language.'
                            )}
                        >
                            <HotkeyRecorder onBlur={onBlur} testId='writing-hotkey-recorder' />
                        </FormItem>
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='writingNewlineHotkey'
                            label={t('Writing line break shortcut')}
                            caption={t('When writing, which key should be pressed when encountering a line break?')}
                        >
                            <HotkeyRecorder onBlur={onBlur} testId='writing-newline-hotkey-recorder' />
                        </FormItem>
                    </div>
                    <div
                        style={{
                            display: activeTab === 'shortcuts' ? 'block' : 'none',
                        }}
                    >
                        <FormItem name='hotkey' label={t('Hotkey')}>
                            <HotkeyRecorder onBlur={onBlur} testId='hotkey-recorder' />
                        </FormItem>
                        <FormItem name='displayWindowHotkey' label={t('Display window Hotkey')}>
                            <HotkeyRecorder onBlur={onBlur} testId='display-window-hotkey-recorder' />
                        </FormItem>
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='ocrHotkey'
                            label={t('OCR Hotkey')}
                        >
                            <HotkeyRecorder onBlur={onBlur} testId='ocr-hotkey-recorder' />
                        </FormItem>
                        <FormItem
                            style={{
                                display: isDesktopApp ? 'block' : 'none',
                            }}
                            name='quickTranslatorHotkey'
                            label={t('Quick Translator Hotkey')}
                            caption={t(
                                'Open a non-activating panel that auto-detects the word or sentence you are reading.'
                            )}
                        >
                            <HotkeyRecorder onBlur={onBlur} testId='quick-translator-hotkey-recorder' />
                        </FormItem>
                    </div>
                </div>
                <div
                    style={{
                        position: utils.isBrowserExtensionOptions() ? 'sticky' : 'fixed',
                        bottom: '7px',
                        right: '25px',
                        paddingBottom: utils.isBrowserExtensionOptions() ? '10px' : undefined,
                        display: activeTab === 'actions' ? 'none' : 'flex',
                        alignItems: 'center',
                        flexDirection: 'row',
                        zIndex: 1000,
                        gap: 10,
                    }}
                >
                    <div
                        style={{
                            marginRight: 'auto',
                        }}
                    />
                    <Button isLoading={loading} size='mini' startEnhancer={<MdSave size={14} />}>
                        {t('Save')}
                    </Button>
                </div>
                <Toaster />
            </Form>
            {showFooter && (
                <div
                    className={styles.footer}
                    style={{
                        boxShadow: isScrolledToBottom ? undefined : theme.lighting.shadow700,
                    }}
                />
            )}
        </div>
    )
}
