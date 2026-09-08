import type { ComponentType } from 'react'
import type { IconBaseProps } from 'react-icons'
import { RiOpenaiFill, RiCloudLine, RiTwitterXFill } from 'react-icons/ri'
import { VscAzure } from 'react-icons/vsc'
import { SiHuggingface, SiGooglegemini, SiMistralai, SiPerplexity, SiQwen } from 'react-icons/si'

import { CerebrasIcon } from './icons/CerebrasIcon'
import { ChatGLMIcon } from './icons/ChatGLMIcon'
import { ClaudeIcon } from './icons/ClaudeIcon'
import { CohereIcon } from './icons/CohereIcon'
import { DeepSeekIcon } from './icons/DeepSeekIcon'
import { GroqIcon } from './icons/GroqIcon'
import { KimiIcon } from './icons/KimiIcon'
import { LiteLLMIcon } from './icons/LiteLLMIcon'
import { MinimaxIcon } from './icons/MinimaxIcon'
import { MoonshotIcon } from './icons/MoonshotIcon'
import { OllamaIcon } from './icons/OllamaIcon'
import { OpenRouterIcon } from './icons/OpenRouterIcon'
import { TeamoRouterIcon } from './icons/TeamoRouterIcon'
import type { ProviderConfig } from '../providers/types'

export function getProviderIconComponent(
    target?:
        string | ProviderConfig | { name?: string; protocol?: string; catalogKey?: string; baseURL?: string } | null
): ComponentType<IconBaseProps> {
    if (!target) return RiCloudLine

    if (typeof target === 'string') {
        const id = target.toLowerCase()
        if (id.includes('litellm')) return LiteLLMIcon
        if (id.includes('openrouter')) return OpenRouterIcon
        if (id.includes('teamorouter')) return TeamoRouterIcon
        if (id.includes('deepseek')) return DeepSeekIcon
        if (id.includes('groq')) return GroqIcon
        if (id.includes('ollama')) return OllamaIcon
        if (id.includes('anthropic') || id.includes('claude')) return ClaudeIcon
        if (id.includes('gemini')) return SiGooglegemini
        if (id.includes('google')) return SiGooglegemini
        if (id.includes('cerebras')) return CerebrasIcon
        if (id.includes('cohere')) return CohereIcon
        if (id.includes('kimi')) return KimiIcon
        if (id.includes('moonshot')) return MoonshotIcon
        if (id.includes('minimax')) return MinimaxIcon
        if (id.includes('mistral')) return SiMistralai
        if (id.includes('perplexity')) return SiPerplexity
        if (id.includes('qwen') || id.includes('alibaba')) return SiQwen
        if (id.includes('xai') || id.includes('grok')) return RiTwitterXFill
        if (id.includes('zhipu') || id.includes('chatglm') || id.includes('glm')) return ChatGLMIcon
        if (id.includes('azure')) return VscAzure
        if (id.includes('huggingface')) return SiHuggingface
        if (id.includes('openai')) return RiOpenaiFill
        return RiCloudLine
    }

    const { name = '', protocol = '', catalogKey = '', baseURL = '' } = target
    const lowerName = name.toLowerCase()
    const lowerBase = baseURL.toLowerCase()
    const lowerKey = catalogKey.toLowerCase()
    const lowerProto = protocol.toLowerCase()

    if (lowerName.includes('litellm') || lowerBase.includes(':4000') || lowerKey.includes('litellm')) return LiteLLMIcon
    if (lowerName.includes('openrouter') || lowerBase.includes('openrouter') || lowerKey.includes('openrouter'))
        return OpenRouterIcon
    if (lowerName.includes('teamorouter') || lowerBase.includes('teamorouter') || lowerKey.includes('teamorouter'))
        return TeamoRouterIcon
    if (lowerName.includes('deepseek') || lowerProto === 'deepseek' || lowerKey.includes('deepseek'))
        return DeepSeekIcon
    if (lowerName.includes('groq') || lowerProto === 'groq' || lowerKey.includes('groq')) return GroqIcon
    if (
        lowerName.includes('ollama') ||
        lowerProto === 'ollama' ||
        lowerKey.includes('ollama') ||
        lowerBase.includes(':11434')
    )
        return OllamaIcon
    if (
        lowerName.includes('anthropic') ||
        lowerName.includes('claude') ||
        lowerProto === 'anthropic' ||
        lowerKey.includes('anthropic')
    )
        return ClaudeIcon
    if (
        lowerName.includes('gemini') ||
        lowerKey.includes('gemini') ||
        lowerName.includes('google') ||
        lowerProto === 'google' ||
        lowerKey.includes('google')
    )
        return SiGooglegemini
    if (lowerName.includes('cerebras') || lowerProto === 'cerebras' || lowerKey.includes('cerebras'))
        return CerebrasIcon
    if (lowerName.includes('cohere') || lowerProto === 'cohere' || lowerKey.includes('cohere')) return CohereIcon
    if (lowerName.includes('kimi') || lowerKey.includes('kimi')) return KimiIcon
    if (lowerName.includes('moonshot') || lowerProto === 'moonshotai' || lowerKey.includes('moonshot'))
        return MoonshotIcon
    if (lowerName.includes('minimax') || lowerKey.includes('minimax')) return MinimaxIcon
    if (lowerName.includes('mistral') || lowerProto === 'mistral' || lowerKey.includes('mistral')) return SiMistralai
    if (lowerName.includes('perplexity') || lowerProto === 'perplexity' || lowerKey.includes('perplexity'))
        return SiPerplexity
    if (
        lowerName.includes('qwen') ||
        lowerName.includes('alibaba') ||
        lowerProto === 'alibaba' ||
        lowerKey.includes('alibaba')
    )
        return SiQwen
    if (lowerName.includes('xai') || lowerName.includes('grok') || lowerProto === 'xai' || lowerKey.includes('xai'))
        return RiTwitterXFill
    if (
        lowerName.includes('zhipu') ||
        lowerName.includes('glm') ||
        lowerName.includes('chatglm') ||
        lowerKey.includes('zhipu') ||
        lowerKey.includes('glm')
    )
        return ChatGLMIcon
    if (lowerName.includes('azure') || lowerProto === 'azure' || lowerKey.includes('azure')) return VscAzure
    if (lowerName.includes('huggingface') || lowerKey.includes('huggingface')) return SiHuggingface
    if (
        lowerName.includes('openai') ||
        lowerProto === 'openai' ||
        lowerProto === 'openai-compatible' ||
        lowerKey.includes('openai')
    )
        return RiOpenaiFill

    return RiCloudLine
}

export interface ProviderIconProps extends IconBaseProps {
    provider?: ProviderConfig | { name?: string; protocol?: string; catalogKey?: string; baseURL?: string } | null
    presetId?: string
}

export function ProviderIcon({ provider, presetId, style, className, ...rest }: ProviderIconProps) {
    const Component = getProviderIconComponent(presetId ?? provider)
    return (
        <span
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                verticalAlign: 'middle',
                flexShrink: 0,
                ...style,
            }}
        >
            <Component {...rest} />
        </span>
    )
}
