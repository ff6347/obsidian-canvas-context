import {
	App,
	PluginSettingTab,
	Setting,
	ButtonComponent,
	Notice,
} from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import { AddModelModal } from "./add-model-modal.ts";
import { ApiKeyModal } from "./api-key-modal.ts";
import { providers } from "../llm/providers/providers.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { getProviderDocs, getModelPageUrl } from "../llm/providers/providers.ts";
import { maskApiKey as _maskApiKey, resolveApiKey as _resolveApiKey, computeDisplayName as _computeDisplayName } from "../lib/settings-utils.ts";

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

// Re-export utilities for convenience
export { 
	maskApiKey, 
	resolveApiKey, 
	computeDisplayName 
} from "../lib/settings-utils.ts";

export class CanvasContextSettingTab extends PluginSettingTab {
	plugin: CanvasContextPlugin;

	constructor(app: App, plugin: CanvasContextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private resolveApiKey(config: ModelConfiguration): string | undefined {
		return _resolveApiKey(config, this.plugin.settings.apiKeys);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Default Model Selection
		new Setting(containerEl)
			.setName("Default Model")
			.setDesc("Select the default model for inference (fallback model)")
			.addDropdown((dropdown) => {
				dropdown.addOption("", "Select a model");

				// Add all enabled model configurations
				this.plugin.settings.modelConfigurations
					.filter((config) => config.enabled)
					.forEach((config) => {
						dropdown.addOption(config.id, config.name);
					});

				dropdown
					.setValue(this.plugin.settings.currentModel)
					.onChange(async (value) => {
						this.plugin.settings.currentModel = value;
						await this.plugin.saveSettings();
					});
			});

		// API Keys Section
		const apiKeysSection = containerEl.createDiv();
		apiKeysSection.createEl("h3", { text: "API Keys" });
		
		// Add API Key Button
		new Setting(apiKeysSection)
			.setName("Add API Key")
			.setDesc("Add a named API key for cloud providers")
			.addButton((button) => {
				button
					.setButtonText("Add API Key")
					.setCta()
					.onClick(() => {
						const modal = new ApiKeyModal(
							this.app,
							this.plugin,
							undefined,
							() => {
								this.display(); // Refresh the settings page
							},
						);
						modal.open();
					});
			});

		// API Keys List
		if (this.plugin.settings.apiKeys.length === 0) {
			apiKeysSection.createDiv({
				text: "No API keys configured. Cloud providers (OpenAI, OpenRouter) require API keys.",
				cls: "setting-item-description",
			});
		} else {
			this.plugin.settings.apiKeys.forEach((apiKey, index) => {
				this.renderApiKeyConfiguration(apiKeysSection, apiKey, index);
			});
		}

		// Model Configurations Section
		const modelSection = containerEl.createDiv();
		modelSection.createEl("h3", { text: "Model Configurations" });

		// Add Model Button
		new Setting(modelSection)
			.setName("Add Model")
			.setDesc("Add a new model configuration")
			.addButton((button) => {
				button
					.setButtonText("Add Model")
					.setCta()
					.onClick(() => {
						const modal = new AddModelModal(
							this.app,
							this.plugin,
							undefined,
							() => {
								this.display(); // Refresh the settings page
							},
						);
						modal.open();
					});
			});

		// Model List
		if (this.plugin.settings.modelConfigurations.length === 0) {
			modelSection.createDiv({
				text: "No model configurations found. Click 'Add Model' to get started.",
				cls: "setting-item-description",
			});
		} else {
			this.plugin.settings.modelConfigurations.forEach((config, index) => {
				this.renderModelConfiguration(modelSection, config, index);
			});
		}
	}

	renderModelConfiguration(
		containerEl: HTMLElement,
		config: ModelConfiguration,
		index: number,
	) {
		const setting = new Setting(containerEl);

		// Model info
		setting.setName(config.name);
		
		// Create a custom description element with proper line breaks
		const descEl = setting.descEl;
		descEl.empty();
		
		// Add each line as a separate div element
		descEl.createDiv({ text: `Provider: ${config.provider}` });
		descEl.createDiv({ text: `Model: ${config.modelName}` });
		descEl.createDiv({ text: `Base URL: ${config.baseURL}` });
		
		// Show API key information (new system or legacy)
		const resolvedApiKey = this.resolveApiKey(config);
		if (
			(config.provider === "openai" || config.provider === "openrouter") &&
			resolvedApiKey
		) {
			if (config.apiKeyId) {
				const apiKeyConfig = this.plugin.settings.apiKeys.find(key => key.id === config.apiKeyId);
				const keyName = apiKeyConfig?.name || "Unknown Key";
				descEl.createDiv({ text: `API Key: ${keyName} (${_maskApiKey(resolvedApiKey)})` });
			} else {
				// Legacy direct API key
				descEl.createDiv({ text: `API Key: ${_maskApiKey(resolvedApiKey)} (Legacy)` });
			}
		}

		// Enable/Disable toggle
		setting.addToggle((toggle) => {
			toggle.setValue(config.enabled).onChange(async (value) => {
				if (this.plugin.settings.modelConfigurations[index]) {
					this.plugin.settings.modelConfigurations[index].enabled = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to update current model dropdown
				}
			});
		});

		// Model docs button
		const modelPageUrl = getModelPageUrl(config.provider, config.modelName);
		if (modelPageUrl) {
			setting.addButton((button) => {
				button
					.setButtonText("📄 Model")
					.setTooltip(`View ${config.modelName} details`)
					.onClick(() => {
						window.open(modelPageUrl, "_blank");
					});
			});
		}

		// Verify button
		setting.addButton((button) => {
			button
				.setButtonText("Verify")
				.setTooltip("Test connection")
				.onClick(async () => {
					await this.verifyModelConfiguration(config, button);
				});
		});

		// Duplicate button
		setting.addButton((button) => {
			button
				.setButtonText("Duplicate")
				.setTooltip("Duplicate configuration")
				.onClick(() => {
					const duplicatedConfig: ModelConfiguration = {
						...config,
						id: this.plugin.generateId(),
						name: `${config.name} (Copy)`,
						enabled: false, // Start disabled to avoid conflicts
					};
					this.plugin.settings.modelConfigurations.push(duplicatedConfig);
					this.plugin.saveSettings();
					this.display(); // Refresh the settings page
					new Notice("Model configuration duplicated.");
				});
		});

		// Edit button
		setting.addButton((button) => {
			button
				.setButtonText("Edit")
				.setTooltip("Edit configuration")
				.onClick(() => {
					const modal = new AddModelModal(this.app, this.plugin, config, () => {
						this.display(); // Refresh the settings page
					});
					modal.open();
				});
		});

		// Delete button
		setting.addButton((button) => {
			button
				.setButtonText("Delete")
				.setTooltip("Delete configuration")
				.setWarning()
				.onClick(async () => {
					// If this is the current model, clear the selection
					if (this.plugin.settings.currentModel === config.id) {
						this.plugin.settings.currentModel = "";
					}

					// Remove from array
					this.plugin.settings.modelConfigurations.splice(index, 1);
					await this.plugin.saveSettings();
					this.display(); // Refresh the settings page
					new Notice("Model configuration deleted.");
				});
		});
	}

	renderApiKeyConfiguration(
		containerEl: HTMLElement,
		apiKey: ApiKeyConfiguration,
		index: number,
	) {
		const setting = new Setting(containerEl);

		// API Key info
		setting.setName(apiKey.name);
		
		// Create a custom description element with proper line breaks
		const descEl = setting.descEl;
		descEl.empty();
		
		// Add each line as a separate div element
		descEl.createDiv({ text: `Provider: ${apiKey.provider}` });
		descEl.createDiv({ text: `API Key: ${_maskApiKey(apiKey.apiKey)}` });
		if (apiKey.description) {
			descEl.createDiv({ text: `Description: ${apiKey.description}` });
		}

		// Edit button
		setting.addButton((button) => {
			button
				.setButtonText("Edit")
				.setTooltip("Edit API key")
				.onClick(() => {
					const modal = new ApiKeyModal(this.app, this.plugin, apiKey, () => {
						this.display(); // Refresh the settings page
					});
					modal.open();
				});
		});

		// Delete button
		setting.addButton((button) => {
			button
				.setButtonText("Delete")
				.setTooltip("Delete API key")
				.setWarning()
				.onClick(async () => {
					// Check if any models are using this API key
					const modelsUsingKey = this.plugin.settings.modelConfigurations.filter(
						config => config.apiKeyId === apiKey.id
					);

					if (modelsUsingKey.length > 0) {
						const modelNames = modelsUsingKey.map(m => m.name).join(", ");
						new Notice(
							`Cannot delete API key "${apiKey.name}". It's being used by: ${modelNames}`
						);
						return;
					}

					// Remove from array
					this.plugin.settings.apiKeys.splice(index, 1);
					await this.plugin.saveSettings();
					this.display(); // Refresh the settings page
					new Notice("API key deleted.");
				});
		});
	}

	async verifyModelConfiguration(
		config: ModelConfiguration,
		button: ButtonComponent,
	) {
		const originalText = button.buttonEl.textContent;
		button.setButtonText("Verifying...");
		button.setDisabled(true);

		try {
			const providerGenerator =
				providers[config.provider as keyof typeof providers];
			if (!providerGenerator) {
				throw new Error("Provider not found");
			}

			// Resolve API key using new system
			const resolvedApiKey = this.resolveApiKey(config);

			// For OpenAI and OpenRouter, pass the API key as the first parameter
			const models =
				(config.provider === "openai" || config.provider === "openrouter") &&
				resolvedApiKey
					? await providerGenerator.listModels(resolvedApiKey, config.baseURL)
					: await providerGenerator.listModels(config.baseURL);
			new Notice(
				`${config.name}: Connection successful! Found ${models.length} models.`,
			);
			button.setButtonText("✓");
		} catch (error) {
			console.error("Connection verification failed:", error);
			new Notice(
				`${config.name}: Connection failed. Please check the configuration.`,
			);
			button.setButtonText("✗");
		}

		setTimeout(() => {
			button.setButtonText(originalText || "Verify");
			button.setDisabled(false);
		}, 2000);
	}
}
