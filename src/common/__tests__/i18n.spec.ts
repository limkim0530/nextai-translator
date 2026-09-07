import { describe, expect, it } from 'vitest'
import en from '../i18n/locales/en/translation.json'
import ja from '../i18n/locales/ja/translation.json'
import ko from '../i18n/locales/ko/translation.json'
import th from '../i18n/locales/th/translation.json'
import tr from '../i18n/locales/tr/translation.json'
import zhHans from '../i18n/locales/zh-Hans/translation.json'
import zhHant from '../i18n/locales/zh-Hant/translation.json'

const locales: Record<string, Record<string, string>> = {
    en,
    'zh-Hans': zhHans,
    'zh-Hant': zhHant,
    ja,
    ko,
    th,
    tr,
}

describe('i18n locale completeness and synchronization', () => {
    const enKeys = Object.keys(en)

    it('has translation resources for all 7 supported locales', () => {
        expect(Object.keys(locales)).toEqual(['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'th', 'tr'])
    })

    Object.entries(locales).forEach(([lang, translations]) => {
        describe(`locale: ${lang}`, () => {
            const langKeys = Object.keys(translations)

            it('matches the exact key count of the reference en locale', () => {
                expect(langKeys.length).toBe(enKeys.length)
            })

            it('has no missing keys compared to reference en locale', () => {
                const missingKeys = enKeys.filter((k) => !(k in translations))
                expect(missingKeys).toEqual([])
            })

            it('has no extra keys not present in reference en locale', () => {
                const extraKeys = langKeys.filter((k) => !(k in en))
                expect(extraKeys).toEqual([])
            })

            it('contains no empty or whitespace-only translation strings', () => {
                const emptyKeys = langKeys.filter((k) => !translations[k] || translations[k].trim() === '')
                expect(emptyKeys).toEqual([])
            })
        })
    })

    it('preserves i18next template placeholders (e.g. {{name}}) across all locales', () => {
        const doubleBraceRegex = /\{\{([^}]+)\}\}/g

        for (const key of enKeys) {
            const enValue = en[key as keyof typeof en]
            const enPlaceholders = [...enValue.matchAll(doubleBraceRegex)].map((m) => m[1]).sort()
            if (enPlaceholders.length === 0) continue

            for (const [lang, translations] of Object.entries(locales)) {
                const localizedValue = translations[key]
                const localizedPlaceholders = [...localizedValue.matchAll(doubleBraceRegex)].map((m) => m[1]).sort()
                expect(localizedPlaceholders, `Mismatch in placeholder for key "${key}" in locale "${lang}"`).toEqual(
                    enPlaceholders
                )
            }
        }
    })

    it('includes essential UI interaction keys across all locales', () => {
        const requiredKeys = [
            'Pin',
            'Unpin',
            'Stop',
            'Retry',
            'Restore',
            'Search',
            'Add to favorites',
            'Remove from favorites',
            'Quick Translator Hotkey',
            'Lookup test failed',
            'Word Hover Definition / Dictionary',
            'Enable Word Hover Definition',
            'Azure Translator',
        ]

        for (const [lang, translations] of Object.entries(locales)) {
            for (const reqKey of requiredKeys) {
                expect(translations[reqKey], `Key "${reqKey}" must exist in locale "${lang}"`).toBeDefined()
            }
        }
    })
})
