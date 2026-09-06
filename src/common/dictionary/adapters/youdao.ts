import { v4 as uuidv4 } from 'uuid'
import type {
    DictionaryAdapter,
    DictionaryLookupOptions,
    DictionaryProviderConfig,
    WordLookupMeaning,
    WordLookupPreview,
} from '../types'
import { getUniversalFetch } from '../../universal-fetch'

async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function truncateForYoudao(q: string): string {
    const len = q.length
    if (len <= 20) return q
    return q.substring(0, 10) + len + q.substring(len - 10, len)
}

interface YoudaoResponse {
    errorCode?: string
    query?: string
    translation?: string[]
    basic?: {
        'phonetic'?: string
        'us-phonetic'?: string
        'uk-phonetic'?: string
        'explains'?: string[]
    }
}

export function parseYoudaoResponse(payload: unknown, fallbackWord: string): WordLookupPreview | null {
    const data = payload as YoudaoResponse
    if (!data || data.errorCode !== '0') {
        return null
    }

    const basic = data.basic
    const phoneticRaw = basic?.['us-phonetic'] || basic?.phonetic || basic?.['uk-phonetic']
    const phonetic = phoneticRaw ? (phoneticRaw.startsWith('/') ? phoneticRaw : `/${phoneticRaw}/`) : undefined

    const meanings: WordLookupMeaning[] = []
    if (Array.isArray(basic?.explains)) {
        for (const exp of basic!.explains) {
            if (typeof exp !== 'string') continue
            // e.g. "n. 苹果，苹果树"
            const match = exp.match(/^([a-zA-Z]+\.)\s*(.*)$/)
            if (match) {
                meanings.push({
                    partOfSpeech: match[1],
                    definition: match[2].trim(),
                })
            } else {
                meanings.push({
                    definition: exp.trim(),
                })
            }
            if (meanings.length >= 3) break
        }
    }

    if (meanings.length === 0 && Array.isArray(data.translation) && data.translation.length > 0) {
        meanings.push({
            definition: data.translation.join('；'),
        })
    }

    if (meanings.length === 0) {
        return null
    }

    return {
        word: data.query || fallbackWord,
        phonetic,
        meanings,
        sourceName: '有道词典',
        sourceUrl: `https://dict.youdao.com/w/${encodeURIComponent(fallbackWord)}`,
    }
}

export const youdaoAdapter: DictionaryAdapter = {
    async lookup(
        word: string,
        config: DictionaryProviderConfig,
        options?: DictionaryLookupOptions
    ): Promise<WordLookupPreview | null> {
        if (!config.apiKey || !config.apiSecret) {
            throw new Error('Youdao dictionary requires both appKey (apiKey) and appSecret (apiSecret)')
        }

        const appKey = config.apiKey.trim()
        const appSecret = config.apiSecret.trim()
        const salt = uuidv4()
        const curtime = Math.round(Date.now() / 1000).toString()
        const signStr = appKey + truncateForYoudao(word) + salt + curtime + appSecret
        const sign = await sha256(signStr)

        const from = 'auto'
        const to = options?.targetLang === 'en' ? 'en' : 'zh-CHS'
        const params = new URLSearchParams({
            q: word,
            appKey,
            salt,
            from,
            to,
            sign,
            signType: 'v3',
            curtime,
        })

        const baseUrl = config.baseURL?.trim() || 'https://openapi.youdao.com/api'
        const fetcher = getUniversalFetch()
        const response = await fetcher(`${baseUrl}?${params.toString()}`, {
            method: 'GET',
            signal: options?.signal,
        })

        if (!response.ok) {
            throw new Error(`Youdao API lookup failed with status ${response.status}`)
        }

        const data = await response.json()
        return parseYoudaoResponse(data, word)
    },
}
