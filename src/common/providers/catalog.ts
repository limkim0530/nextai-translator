import type { ProviderProtocol } from './types'

/**
 * A built-in starting point for a provider instance.
 *
 * These are conveniences, not a closed list: a preset only prefills the
 * protocol, endpoint and catalog key that a user would otherwise type by hand.
 * Anything reachable over one of the supported protocols can be added without a
 * preset, which is what makes the provider list open-ended.
 */
export interface ProviderPreset {
    /** Stable preset id, used to look up the icon. */
    id: string
    name: string
    protocol: ProviderProtocol
    /** Left undefined when the SDK package already defaults to the right host. */
    baseURL?: string
    /** models.dev provider key for capability lookup. */
    catalogKey?: string
    defaultModel?: string
    /** Endpoints that legitimately take no credentials. */
    keyless?: boolean
    docsURL?: string
}

/**
 * `catalogKey` deliberately differs from `id` in places: it must match the key
 * models.dev publishes, not our label, or the exact-match lookup silently falls
 * through to the weaker cross-host index.
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        protocol: 'openai',
        catalogKey: 'openai',
        defaultModel: 'gpt-5.1',
        docsURL: 'https://platform.openai.com/api-keys',
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        protocol: 'anthropic',
        catalogKey: 'anthropic',
        defaultModel: 'claude-sonnet-4-5',
        docsURL: 'https://console.anthropic.com/settings/keys',
    },
    {
        id: 'google',
        name: 'Google Gemini',
        protocol: 'google',
        catalogKey: 'google',
        defaultModel: 'gemini-2.5-flash',
        docsURL: 'https://aistudio.google.com/apikey',
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        protocol: 'deepseek',
        catalogKey: 'deepseek',
        defaultModel: 'deepseek-chat',
        docsURL: 'https://platform.deepseek.com/api_keys',
    },
    {
        id: 'xai',
        name: 'xAI Grok',
        protocol: 'xai',
        catalogKey: 'xai',
        defaultModel: 'grok-4',
    },
    {
        id: 'azure',
        name: 'Azure OpenAI',
        protocol: 'azure',
        catalogKey: 'azure',
    },
    {
        id: 'bedrock',
        name: 'Amazon Bedrock',
        protocol: 'bedrock',
        catalogKey: 'amazon-bedrock',
    },
    {
        id: 'groq',
        name: 'Groq',
        protocol: 'groq',
        catalogKey: 'groq',
        defaultModel: 'llama-3.3-70b-versatile',
    },
    {
        id: 'mistral',
        name: 'Mistral',
        protocol: 'mistral',
        catalogKey: 'mistral',
        defaultModel: 'mistral-large-latest',
    },
    {
        id: 'cohere',
        name: 'Cohere',
        protocol: 'cohere',
        catalogKey: 'cohere',
        defaultModel: 'command-a-03-2025',
    },
    {
        id: 'cerebras',
        name: 'Cerebras',
        protocol: 'cerebras',
        catalogKey: 'cerebras',
        defaultModel: 'llama-3.3-70b',
    },
    {
        id: 'fireworks',
        name: 'Fireworks',
        protocol: 'fireworks',
        catalogKey: 'fireworks-ai',
    },
    {
        id: 'togetherai',
        name: 'Together AI',
        protocol: 'togetherai',
        catalogKey: 'togetherai',
    },
    {
        id: 'deepinfra',
        name: 'DeepInfra',
        protocol: 'deepinfra',
        catalogKey: 'deepinfra',
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        protocol: 'perplexity',
        catalogKey: 'perplexity',
        defaultModel: 'sonar',
    },
    {
        id: 'alibaba',
        name: 'Alibaba Qwen',
        protocol: 'alibaba',
        catalogKey: 'alibaba',
        defaultModel: 'qwen-plus',
    },
    {
        id: 'moonshotai',
        name: 'Moonshot',
        protocol: 'moonshotai',
        catalogKey: 'moonshotai',
        defaultModel: 'kimi-k2',
    },
    {
        id: 'huggingface',
        name: 'Hugging Face',
        protocol: 'huggingface',
        catalogKey: 'huggingface',
    },
    {
        id: 'replicate',
        name: 'Replicate',
        protocol: 'replicate',
    },
    {
        id: 'vercel',
        name: 'Vercel AI Gateway',
        protocol: 'vercel',
    },
    {
        id: 'ollama',
        name: 'Ollama',
        protocol: 'ollama',
        // The origin, not `/api`: the client appends its own `/api/chat`.
        baseURL: 'http://127.0.0.1:11434',
        catalogKey: 'ollama',
        keyless: true,
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        protocol: 'openai-compatible',
        baseURL: 'https://openrouter.ai/api/v1',
        catalogKey: 'openrouter',
    },
    {
        id: 'siliconflow',
        name: 'SiliconFlow',
        protocol: 'openai-compatible',
        baseURL: 'https://api.siliconflow.cn/v1',
        catalogKey: 'siliconflow',
    },
    {
        id: 'minimax',
        name: 'MiniMax',
        protocol: 'openai-compatible',
        baseURL: 'https://api.minimax.chat/v1',
        catalogKey: 'minimax',
    },
    {
        id: 'zhipu',
        name: 'Zhipu GLM',
        protocol: 'openai-compatible',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        catalogKey: 'zhipuai',
    },
    {
        id: 'volcengine',
        name: 'Volcengine Doubao',
        protocol: 'openai-compatible',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        catalogKey: 'volcengine',
    },
    {
        id: 'litellm',
        name: 'LiteLLM',
        protocol: 'openai-compatible',
        baseURL: 'http://localhost:4000/v1',
        docsURL: 'https://docs.litellm.ai',
    },
    {
        id: 'lmstudio',
        name: 'LM Studio',
        protocol: 'openai-compatible',
        baseURL: 'http://127.0.0.1:1234/v1',
        keyless: true,
    },
    {
        id: 'custom-openai',
        name: 'Custom (OpenAI-compatible)',
        protocol: 'openai-compatible',
    },
    {
        id: 'custom-responses',
        name: 'Custom (OpenAI Responses)',
        protocol: 'open-responses',
    },
]

export function getPreset(id: string): ProviderPreset | undefined {
    return PROVIDER_PRESETS.find((preset) => preset.id === id)
}
