import type { CurrentProviderType } from "./llm-types.ts";

export interface ApiKeyConfiguration {
	id: string;
	name: string; // User-friendly name like "Personal OpenAI", "Work Account"
	provider: CurrentProviderType | undefined;
	apiKey: string;
	description?: string;
}

export interface ModelConfiguration {
	id: string;
	name: string;
	provider: CurrentProviderType | undefined;
	modelName: string;
	baseURL: string;
	enabled: boolean;
	apiKeyId?: string; // Reference to ApiKeyConfiguration.id
	useCustomDisplayName?: boolean; // default false - when false, name is auto-computed from provider:model
}

export interface CanvasContextSettings {
	currentModel: string;
	modelConfigurations: ModelConfiguration[];
	apiKeys: ApiKeyConfiguration[];
}
