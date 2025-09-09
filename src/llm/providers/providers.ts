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

export const providers = {
	ollama: {
		name: ollamaProviderName,
		createProvider: createOllamaProvider,
		listModels: listOllamaModels,
	},
	lmstudio: {
		name: lmstudioProviderName,
		createProvider: createLMStudioProvider,
		listModels: listLMStudioModels,
	},
	openai: {
		name: openaiProviderName,
		createProvider: createOpenAIProvider,
		listModels: listOpenAIModels,
	},
	openrouter: {
		name: openrouterProviderName,
		createProvider: createOpenRouterProvider,
		listModels: listOpenRouterModels,
	},
} as const;

export type ProvidersType = typeof providers;
export type ProviderKey = keyof ProvidersType;
export type ProviderConfig = ProvidersType[ProviderKey];
