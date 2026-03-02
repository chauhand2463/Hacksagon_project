// Local LLM Server using Ollama (runs locally, no API keys needed)
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate'

interface LLMOptions {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    responseFormat?: { type: 'json_object' };
}

export async function callLLM(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMOptions
) {
    const { temperature = 0.1, maxTokens = 1500, model = 'mistral' } = options || {}

    try {
        const response = await fetch(OLLAMA_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: `System: ${systemPrompt}\n\nUser: ${userPrompt}`,
                temperature: temperature,
                max_tokens: maxTokens,
                stream: false,
            }),
        })

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const content = data?.response?.trim()
        
        if (!content) {
            throw new Error('Empty response from Ollama')
        }

        // Try to parse JSON from the response
        try {
            // Sometimes the model returns JSON directly, sometimes wrapped in text
            const parsed = JSON.parse(content)
            return { data: parsed, provider: 'ollama' }
        } catch {
            // If not JSON, try to extract JSON from the text
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                return { data: JSON.parse(jsonMatch[0]), provider: 'ollama' }
            }
            // Return as a simple response
            return { data: { text: content }, provider: 'ollama' }
        }

    } catch (e: any) {
        console.error('Ollama call failed:', e)
        throw new Error(`Local LLM failed: ${e.message}. Make sure Ollama is running with 'ollama serve'`)
    }
}

export async function checkOllamaStatus(): Promise<{ available: boolean; models: string[] }> {
    try {
        const response = await fetch('http://localhost:11434/api/tags')
        if (response.ok) {
            const data = await response.json()
            const models = data.models?.map((m: any) => m.name) || []
            return { available: true, models }
        }
    } catch (e) {
        console.error('Ollama not available:', e)
    }
    return { available: false, models: [] }
}
