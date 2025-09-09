import { createOpenAI } from "@ai-sdk/openai";

export const providerName = "openai" as const;

interface OpenAIModelsResponse {
	object: string;
	data: {
		id: string;
		object: string;
		created: number;
		owned_by: string;
	}[];
}

export function createProvider(apiKey: string, baseURL?: string) {
	const openai = createOpenAI({
		apiKey,
		baseURL: baseURL ? `${baseURL}/v1` : "https://api.openai.com/v1",
		name: providerName,
	});

	return openai;
}

export async function isProviderAlive(
	apiKey: string,
	baseURL: string = "https://api.openai.com",
) {
	try {
		const response = await fetch(`${baseURL}/v1/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		return response.ok && response.status === 200;
	} catch (error) {
		console.error("Error checking OpenAI availability:", error);
		return false;
	}
}

export async function listModels(
	apiKey: string,
	baseURL: string = "https://api.openai.com",
): Promise<string[]> {
	try {
		const response = await fetch(`${baseURL}/v1/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		if (!response.ok) {
			throw new Error(`Error fetching models: ${response.statusText}`);
		}
		const data = (await response.json()) as OpenAIModelsResponse;
		return data.data.map((model) => model.id).sort();
	} catch (error) {
		console.error("Error fetching OpenAI models:", error);
		return [];
	}
}
