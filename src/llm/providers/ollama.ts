import { createOllama } from "ollama-ai-provider-v2";

export const providerName = "ollama" as const;

interface OllamaModelsResponse {
	models: {
		name: string;
		model: string;
		modified_at: Date;
		size: number;
		digest: string;
		details: {
			parent_model: string;
			format: string;
			family: string;
			families: string[];
			parameter_size: string;
			quantization_level: string;
		};
	}[];
}
export function createProvider(baseURL: string = "http://localhost:11434") {
	const ollama = createOllama({
		name: providerName,
		baseURL: `${baseURL}/api`,
	});

	return ollama;
}

export async function isProviderAlive(
	baseURL: string = "http://localhost:11434",
) {
	try {
		const response = await fetch(`${baseURL}`);
		return response.ok && response.status === 200;
	} catch (error) {
		console.error("Error checking Ollama availability:", error);
		return false;
	}
}

/**
 *
 * curl http://localhost:11434/api/tags
 */
export async function listModels(
	baseURL: string = "http://localhost:11434",
): Promise<string[]> {
	try {
		const response = await fetch(`${baseURL}/api/tags`);
		if (!response.ok) {
			throw new Error(`Error fetching models: ${response.statusText}`);
		}
		const data = (await response.json()) as OllamaModelsResponse;
		return data.models.map((model) => model.name);
	} catch (error) {
		console.error("Error fetching Ollama models:", error);
		return [];
	}
}
