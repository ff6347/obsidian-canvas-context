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
} as const;

export type ProvidersType = typeof providers;
export type ProviderKey = keyof ProvidersType;
export type ProviderConfig = ProvidersType[ProviderKey];
