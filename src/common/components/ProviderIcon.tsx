import type { ComponentType } from 'react'
import type { IconBaseProps } from 'react-icons'
import { RiOpenaiFill } from 'react-icons/ri'
import { FaGoogle } from 'react-icons/fa'
import { VscAzure } from 'react-icons/vsc'
import { SiHuggingface } from 'react-icons/si'
import { TbCloudNetwork } from 'react-icons/tb'

import { CerebrasIcon } from './icons/CerebrasIcon'
import { ChatGLMIcon } from './icons/ChatGLMIcon'
import { ClaudeIcon } from './icons/ClaudeIcon'
import { CohereIcon } from './icons/CohereIcon'
import { DeepSeekIcon } from './icons/DeepSeekIcon'
import { GroqIcon } from './icons/GroqIcon'
import { KimiIcon } from './icons/KimiIcon'
import { LiteLLMIcon } from './icons/LiteLLMIcon'
import { MoonshotIcon } from './icons/MoonshotIcon'
import { OllamaIcon } from './icons/OllamaIcon'
import { OpenRouterIcon } from './icons/OpenRouterIcon'
import { TeamoRouterIcon } from './icons/TeamoRouterIcon'
import type { ProviderConfig } from '../providers/types'

export function getProviderIconComponent(
    target?:
        string | ProviderConfig | { name?: string; protocol?: string; catalogKey?: string; baseURL?: string } | null
): ComponentType<IconBaseProps> {
    if (!target) return TbCloudNetwork

    if (typeof target === 'string') {
        const id = target.toLowerCase()
        if (id.includes('litellm')) return LiteLLMIcon
        if (id.includes('openai')) return RiOpenaiFill
        if (id.includes('anthropic') || id.includes('claude')) return ClaudeIcon
        if (id.includes('google') || id.includes('gemini')) return FaGoogle
        if (id.includes('deepseek')) return DeepSeekIcon
        if (id.includes('groq')) return GroqIcon
        if (id.includes('ollama')) return OllamaIcon
        if (id.includes('openrouter')) return OpenRouterIcon
        if (id.includes('teamorouter')) return TeamoRouterIcon
        if (id.includes('cerebras')) return CerebrasIcon
        if (id.includes('cohere')) return CohereIcon
        if (id.includes('kimi')) return KimiIcon
        if (id.includes('moonshot')) return MoonshotIcon
        if (id.includes('zhipu') || id.includes('chatglm') || id.includes('glm')) return ChatGLMIcon
        if (id.includes('azure')) return VscAzure
        if (id.includes('huggingface')) return SiHuggingface
        return TbCloudNetwork
    }

    const { name = '', protocol = '', catalogKey = '', baseURL = '' } = target
    const lowerName = name.toLowerCase()
    const lowerBase = baseURL.toLowerCase()
    const lowerKey = catalogKey.toLowerCase()
    const lowerProto = protocol.toLowerCase()

    if (lowerName.includes('litellm') || lowerBase.includes(':4000') || lowerKey.includes('litellm')) return LiteLLMIcon
    if (lowerName.includes('openai') || lowerProto === 'openai' || lowerKey === 'openai') return RiOpenaiFill
    if (
        lowerName.includes('anthropic') ||
        lowerName.includes('claude') ||
        lowerProto === 'anthropic' ||
        lowerKey === 'anthropic'
    )
        return ClaudeIcon
    if (
        lowerName.includes('google') ||
        lowerName.includes('gemini') ||
        lowerProto === 'google' ||
        lowerKey === 'google'
    )
        return FaGoogle
    if (lowerName.includes('deepseek') || lowerProto === 'deepseek' || lowerKey === 'deepseek') return DeepSeekIcon
    if (lowerName.includes('groq') || lowerProto === 'groq' || lowerKey === 'groq') return GroqIcon
    if (
        lowerName.includes('ollama') ||
        lowerProto === 'ollama' ||
        lowerKey === 'ollama' ||
        lowerBase.includes(':11434')
    )
        return OllamaIcon
    if (lowerName.includes('openrouter') || lowerBase.includes('openrouter') || lowerKey === 'openrouter')
        return OpenRouterIcon
    if (lowerName.includes('teamorouter') || lowerBase.includes('teamorouter')) return TeamoRouterIcon
    if (lowerName.includes('cerebras') || lowerProto === 'cerebras' || lowerKey === 'cerebras') return CerebrasIcon
    if (lowerName.includes('cohere') || lowerProto === 'cohere' || lowerKey === 'cohere') return CohereIcon
    if (lowerName.includes('kimi') || lowerKey.includes('kimi')) return KimiIcon
    if (lowerName.includes('moonshot') || lowerProto === 'moonshotai' || lowerKey === 'moonshotai') return MoonshotIcon
    if (lowerName.includes('zhipu') || lowerName.includes('glm') || lowerKey.includes('zhipu')) return ChatGLMIcon
    if (lowerName.includes('azure') || lowerProto === 'azure' || lowerKey === 'azure') return VscAzure
    if (lowerName.includes('huggingface') || lowerKey === 'huggingface') return SiHuggingface

    return TbCloudNetwork
}

export interface ProviderIconProps extends IconBaseProps {
    provider?: ProviderConfig | { name?: string; protocol?: string; catalogKey?: string; baseURL?: string } | null
    presetId?: string
}

export function ProviderIcon({ provider, presetId, ...rest }: ProviderIconProps) {
    const Component = getProviderIconComponent(presetId ?? provider)
    return <Component {...rest} />
}
