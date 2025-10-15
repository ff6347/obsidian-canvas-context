import type { CurrentProviderType } from "../../types/llm-types.ts";
import {
	createProvider as createOllamaProvider,
	listModels as listOllamaModels,
	providerName as ollamaProviderName,
} from "./ollama.ts";
import {
	createProvider as createLMStudioProvider,
	listModels as listLMStudioModels,
	providerName as lmstudioProviderName,
} from "./lmstudio.ts";
import {
	createProvider as createOpenAIProvider,
	listModels as listOpenAIModels,
	providerName as openaiProviderName,
} from "./openai.ts";
import {
	createProvider as createOpenRouterProvider,
	listModels as listOpenRouterModels,
	providerName as openrouterProviderName,
} from "./openrouter.ts";

interface ProviderDocumentation {
	displayName: string;
	docsUrl: string;
	modelsUrl: string;
	description: string;
	requiresApiKey: boolean;
}

export const providers = {
	ollama: {
		name: ollamaProviderName,
		createProvider: createOllamaProvider,
		listModels: listOllamaModels,
		displayName: "Ollama",
		docsUrl: "https://ollama.com",
		modelsUrl: "https://ollama.com/library",
		description: "Local AI models for privacy-focused inference",
		requiresApiKey: false,
	},
	lmstudio: {
		name: lmstudioProviderName,
		createProvider: createLMStudioProvider,
		listModels: listLMStudioModels,
		displayName: "LM Studio",
		docsUrl: "https://lmstudio.ai",
		modelsUrl: "https://lmstudio.ai/models",
		description: "Easy-to-use desktop app for running LLMs locally",
		requiresApiKey: false,
	},
	openai: {
		name: openaiProviderName,
		createProvider: createOpenAIProvider,
		listModels: listOpenAIModels,
		displayName: "OpenAI",
		docsUrl: "https://platform.openai.com/docs",
		modelsUrl: "https://platform.openai.com/docs/models",
		description: "Leading AI models including GPT-5 and ChatGPT",
		requiresApiKey: true,
	},
	openrouter: {
		name: openrouterProviderName,
		createProvider: createOpenRouterProvider,
		listModels: listOpenRouterModels,
		displayName: "OpenRouter",
		docsUrl: "https://openrouter.ai/docs",
		modelsUrl: "https://openrouter.ai/models",
		description: "Universal API for 500+ AI models from top providers",
		requiresApiKey: true,
	},
} as const;

// Re-export from types directory

export function getProviderDocs(
	provider: CurrentProviderType | undefined,
): ProviderDocumentation | null {
	if (!provider) {
		return null;
	}
	const providerConfig = providers[provider as keyof typeof providers];
	if (!providerConfig) {
		return null;
	}

	const { displayName, docsUrl, modelsUrl, description, requiresApiKey } =
		providerConfig;
	return { displayName, docsUrl, modelsUrl, description, requiresApiKey };
}

export function getModelPageUrl(
	provider: CurrentProviderType | undefined,
	modelName?: string,
): string | null {
	const docs = getProviderDocs(provider);
	if (!docs) {
		return null;
	}

	switch (provider) {
		case "ollama":
			return modelName
				? `https://ollama.com/library/${modelName}`
				: docs.modelsUrl;
		case "lmstudio":
			return docs.modelsUrl;
		case "openai":
			return docs.modelsUrl;
		case "openrouter":
			return modelName ? `https://openrouter.ai/${modelName}` : docs.modelsUrl;
		default:
			return docs.modelsUrl;
	}
}
