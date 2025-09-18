import {
	App,
	PluginSettingTab,
} from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { resolveApiKey } from "../lib/settings-utils.ts";
import { ModelConfigurationService } from "../services/model-configuration-service.ts";
import { ApiKeyConfigurationService } from "../services/api-key-configuration-service.ts";
import { SettingsUIService } from "../services/settings-ui-service.ts";

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

export const DEFAULT_SETTINGS: CanvasContextSettings = {
	currentModel: "",
	modelConfigurations: [],
	apiKeys: [],
};

export class CanvasContextSettingTab extends PluginSettingTab {
	override plugin: CanvasContextPlugin;

	// Services
	private modelConfigurationService!: ModelConfigurationService;
	private apiKeyConfigurationService!: ApiKeyConfigurationService;
	private settingsUIService!: SettingsUIService;

	constructor(app: App, plugin: CanvasContextPlugin) {
		super(app, plugin);
		this.plugin = plugin;

		// Initialize services
		this.modelConfigurationService = new ModelConfigurationService(
			this.app,
			this.plugin,
			() => this.plugin.settings,
			() => this.plugin.saveSettings(),
			() => this.plugin.generateId(),
			(config) => this.resolveApiKey(config),
			() => this.display(),
		);

		this.apiKeyConfigurationService = new ApiKeyConfigurationService(
			this.app,
			this.plugin,
			() => this.plugin.settings,
			() => this.plugin.saveSettings(),
			() => this.display(),
		);

		this.settingsUIService = new SettingsUIService(
			this.app,
			this.plugin,
			() => this.plugin.settings,
			() => this.plugin.saveSettings(),
			() => this.display(),
		);
	}

	private resolveApiKey(config: ModelConfiguration): string | undefined {
		return resolveApiKey(config, this.plugin.settings.apiKeys);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Default Model Selection
		this.settingsUIService.createDefaultModelSelection(containerEl);

		// API Keys Section
		const apiKeysSection = this.settingsUIService.createApiKeysSection(containerEl);

		// API Keys List
		if (this.plugin.settings.apiKeys.length === 0) {
			this.settingsUIService.createEmptyApiKeysMessage(apiKeysSection);
		} else {
			this.plugin.settings.apiKeys.forEach((apiKey, index) => {
				this.apiKeyConfigurationService.renderApiKeyConfiguration(apiKeysSection, apiKey, index);
			});
		}

		// Model Configurations Section
		const modelSection = this.settingsUIService.createModelConfigurationsSection(containerEl);

		// Model List
		if (this.plugin.settings.modelConfigurations.length === 0) {
			this.settingsUIService.createEmptyModelsMessage(modelSection);
		} else {
			this.plugin.settings.modelConfigurations.forEach((config, index) => {
				this.modelConfigurationService.renderModelConfiguration(modelSection, config, index);
			});
		}
	}

}
