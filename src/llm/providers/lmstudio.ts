import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const providerName = "lmstudio" as const;

interface LMStudioModelsResponse {
	object: string;
	data: {
		id: string;
		object: string;
		created: number;
		owned_by: string;
	}[];
}

export function createProvider(baseURL: string = "http://localhost:1234") {
	const lmstudio = createOpenAICompatible({
		name: providerName,
		baseURL: `${baseURL}/v1`,
	});

	return lmstudio;
}

export async function isProviderAlive(
	baseURL: string = "http://localhost:1234",
) {
	try {
		const response = await fetch(`${baseURL}/v1/models`);
		return response.ok && response.status === 200;
	} catch (error) {
		console.error("Error checking LM Studio availability:", error);
		return false;
	}
}

export async function listModels(
	baseURL: string = "http://localhost:1234",
): Promise<string[]> {
	try {
		const response = await fetch(`${baseURL}/v1/models`);
		if (!response.ok) {
			throw new Error(`Error fetching models: ${response.statusText}`);
		}
		const data = (await response.json()) as LMStudioModelsResponse;
		console.log(data);
		return data.data.map((model) => model.id);
	} catch (error) {
		console.error("Error fetching LM Studio models:", error);
		return [];
	}
}
