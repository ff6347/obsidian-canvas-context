import { Notice } from "obsidian";
import type { ModelConfiguration } from "../ui/settings.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";

export interface ApiKeyConfiguration {
	id: string;
	name: string;
	provider: CurrentProviderType | undefined;
	apiKey: string;
}

export interface CanvasContextSettings {
	currentModel: string;
	modelConfigurations: ModelConfiguration[];
	apiKeys: ApiKeyConfiguration[];
}

export class ModelConfigService {
	constructor(
		private getSettings: () => CanvasContextSettings,
		private saveSettings: () => Promise<void>,
		private generateId: (length?: number) => string,
	) {}

	getResolvedApiKey(config: Partial<ModelConfiguration>): string | undefined {
		if (config.apiKeyId) {
			const apiKeyConfig = this.getSettings().apiKeys.find(
				(key) => key.id === config.apiKeyId,
			);
			return apiKeyConfig?.apiKey;
		}
		return undefined;
	}

	async saveModel(
		config: Partial<ModelConfiguration>,
		isEditing: boolean,
		onSuccess: () => void,
	): Promise<void> {
		// Generate ID if this is a new model
		if (!config.id) {
			config.id = this.generateId();
		}

		const modelConfig = config as ModelConfiguration;
		const settings = this.getSettings();

		if (isEditing) {
			// Update existing model
			const index = settings.modelConfigurations.findIndex(
				(c) => c.id === modelConfig.id,
			);
			if (index !== -1) {
				settings.modelConfigurations[index] = modelConfig;
			}
		} else {
			// Add new model
			settings.modelConfigurations.push(modelConfig);
		}

		await this.saveSettings();
		// oxlint-disable-next-line no-new
		new Notice(
			isEditing
				? "Model configuration updated!"
				: "Model configuration added!",
		);
		onSuccess();
	}

	createDefaultConfig(): Partial<ModelConfiguration> {
		return {
			name: "",
			provider: undefined,
			modelName: "",
			baseURL: "",
			enabled: true,
		};
	}

	updateBaseURLForProvider(
		config: Partial<ModelConfiguration>,
		provider: CurrentProviderType,
	): Partial<ModelConfiguration> {
		const placeholders = {
			ollama: "http://localhost:11434",
			lmstudio: "http://localhost:1234",
			openai: "https://api.openai.com",
			openrouter: "https://openrouter.ai/api/v1",
		};

		const newBaseURL = placeholders[provider as keyof typeof placeholders] || "";

		// Update the baseURL to match the provider, unless user has manually customized it
		const currentValue = config.baseURL;
		const isDefaultValue =
			currentValue && Object.values(placeholders).includes(currentValue);

		if (!config.baseURL || isDefaultValue) {
			return { ...config, baseURL: newBaseURL };
		}

		return config;
	}

	getApiKeysForProvider(provider: CurrentProviderType | undefined): ApiKeyConfiguration[] {
		if (!provider || (provider !== "openai" && provider !== "openrouter")) {
			return [];
		}

		return this.getSettings().apiKeys.filter((key) => key.provider === provider);
	}
}