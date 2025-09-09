import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const providerName = "openrouter" as const;

interface OpenRouterModelsResponse {
	data: {
		id: string;
		name: string;
		description: string;
		pricing: {
			prompt: string;
			completion: string;
		};
		context_length: number;
		architecture: {
			modality: string;
			tokenizer: string;
			instruct_type: string;
		};
		top_provider: {
			context_length: number;
			max_completion_tokens: number;
			is_moderated: boolean;
		};
		per_request_limits: {
			prompt_tokens: string;
			completion_tokens: string;
		};
	}[];
}

export function createProvider(apiKey: string, baseURL?: string) {
	const openrouter = createOpenRouter({
		apiKey,
		baseUrl: baseURL || "https://openrouter.ai/api/v1",
	});

	return openrouter;
}

export async function isProviderAlive(
	apiKey: string,
	baseURL: string = "https://openrouter.ai/api/v1",
) {
	try {
		const response = await fetch(`${baseURL}/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"HTTP-Referer": "https://obsidian.md", // Required by OpenRouter
				"X-Title": "Obsidian Canvas Context Plugin", // Required by OpenRouter
			},
		});
		return response.ok && response.status === 200;
	} catch (error) {
		console.error("Error checking OpenRouter availability:", error);
		return false;
	}
}

export async function listModels(
	apiKey: string,
	baseURL: string = "https://openrouter.ai/api/v1",
): Promise<string[]> {
	try {
		const response = await fetch(`${baseURL}/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"HTTP-Referer": "https://obsidian.md", // Required by OpenRouter
				"X-Title": "Obsidian Canvas Context Plugin", // Required by OpenRouter
			},
		});
		if (!response.ok) {
			throw new Error(`Error fetching models: ${response.statusText}`);
		}
		const data = (await response.json()) as OpenRouterModelsResponse;
		return data.data.map((model) => model.id).sort();
	} catch (error) {
		console.error("Error fetching OpenRouter models:", error);
		return [];
	}
}