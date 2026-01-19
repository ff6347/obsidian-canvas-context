import type { CurrentProviderType } from "../../types/llm-types.ts";
import {
	providerName as ollamaProviderName,
	createProvider as createOllamaProvider,
	listModels as listOllamaModels,
} from "./ollama.ts";
import {
	providerName as lmstudioProviderName,
	createProvider as createLMStudioProvider,
	listModels as listLMStudioModels,
} from "./lmstudio.ts";
import {
	providerName as openaiProviderName,
	createProvider as createOpenAIProvider,
	listModels as listOpenAIModels,
} from "./openai.ts";
import {
	providerName as openrouterProviderName,
	createProvider as createOpenRouterProvider,
	listModels as listOpenRouterModels,
} from "./openrouter.ts";
import {
	providerName as googleProviderName,
	createProvider as createGoogleProvider,
	listModels as listGoogleModels,
} from "./google.ts";


export interface ProviderDocumentation {
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
	google: {
		name: googleProviderName,
		createProvider: createGoogleProvider,
		listModels: listGoogleModels,
		displayName: "Google",
		docsUrl: "https://ai.google.dev/gemini-api/docs",
		modelsUrl: "https://ai.google.dev/gemini-api/docs/models",
		description: "Gemini brings reasoning and intelligence to your daily life",
		requiresApiKey: true,
	},
} as const;

export type ProvidersType = typeof providers;
export type ProviderKey = keyof ProvidersType;
export type ProviderConfig = ProvidersType[ProviderKey];

export function getProviderDocs(
	provider: CurrentProviderType | undefined,
): ProviderDocumentation | null {
	if (!provider) return null;
	const providerConfig = providers[provider as keyof typeof providers];
	if (!providerConfig) return null;

	const { name, createProvider, listModels, ...docs } = providerConfig;
	return docs as ProviderDocumentation;
}

export function getModelPageUrl(
	provider: CurrentProviderType | undefined,
	modelName?: string,
): string | null {
	const docs = getProviderDocs(provider);
	if (!docs) return null;

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
		case "google":
			return modelName
				? `${docs.modelsUrl}#${modelName}`
				: docs.modelsUrl;
		default:
			return docs.modelsUrl;
	}
}
