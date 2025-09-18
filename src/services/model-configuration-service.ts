import { ButtonComponent, Notice, Setting } from "obsidian";
import type { ModelConfiguration } from "../ui/settings.ts";
import { providers } from "../llm/providers/providers.ts";
import { getModelPageUrl } from "../llm/providers/providers.ts";
import { maskApiKey } from "../lib/settings-utils.ts";
import { AddModelModal } from "../ui/add-model-modal.ts";
import type { App } from "obsidian";
import type CanvasContextPlugin from "../main.ts";

export class ModelConfigurationService {
	constructor(
		private app: App,
		private plugin: CanvasContextPlugin,
		private getSettings: () => { modelConfigurations: ModelConfiguration[]; apiKeys: Array<{ id: string; name: string }> },
		private saveSettings: () => Promise<void>,
		private generateId: () => string,
		private resolveApiKey: (config: ModelConfiguration) => string | undefined,
		private refreshDisplay: () => void,
	) {}

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
				const apiKeyConfig = this.getSettings().apiKeys.find(
					(key) => key.id === config.apiKeyId,
				);
				const keyName = apiKeyConfig?.name || "Unknown Key";
				descEl.createDiv({
					text: `API Key: ${keyName} (${maskApiKey(resolvedApiKey)})`,
				});
			} else {
				// Legacy direct API key
				descEl.createDiv({
					text: `API Key: ${maskApiKey(resolvedApiKey)} (Legacy)`,
				});
			}
		}

		// Enable/Disable toggle
		setting.addToggle((toggle) => {
			toggle.setValue(config.enabled).onChange(async (value) => {
				const settings = this.getSettings();
				if (settings.modelConfigurations[index]) {
					settings.modelConfigurations[index].enabled = value;
					await this.saveSettings();
					this.refreshDisplay(); // Refresh to update current model dropdown
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
					this.duplicateModelConfiguration(config);
				});
		});

		// Edit button
		setting.addButton((button) => {
			button
				.setButtonText("Edit")
				.setTooltip("Edit configuration")
				.onClick(() => {
					const modal = new AddModelModal(this.app, this.plugin, config, () => {
						this.refreshDisplay(); // Refresh the settings page
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
					await this.deleteModelConfiguration(config, index);
				});
		});
	}

	private duplicateModelConfiguration(config: ModelConfiguration) {
		const duplicatedConfig: ModelConfiguration = {
			...config,
			id: this.generateId(),
			name: `${config.name} (Copy)`,
			enabled: false, // Start disabled to avoid conflicts
		};
		const settings = this.getSettings();
		settings.modelConfigurations.push(duplicatedConfig);
		this.saveSettings();
		this.refreshDisplay(); // Refresh the settings page
		// oxlint-disable-next-line no-new
		new Notice("Model configuration duplicated.");
	}

	private async deleteModelConfiguration(config: ModelConfiguration, index: number) {
		const settings = this.getSettings();

		// If this is the current model, clear the selection
		if ((this.plugin.settings as { currentModel: string }).currentModel === config.id) {
			(this.plugin.settings as { currentModel: string }).currentModel = "";
		}

		// Remove from array
		settings.modelConfigurations.splice(index, 1);
		await this.saveSettings();
		this.refreshDisplay(); // Refresh the settings page
		// oxlint-disable-next-line no-new
		new Notice("Model configuration deleted.");
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
			// oxlint-disable-next-line no-new
			new Notice(
				`${config.name}: Connection successful! Found ${models.length} models.`,
			);
			button.setButtonText("✓");
		} catch (error) {
			console.error("Connection verification failed:", error);
			// oxlint-disable-next-line no-new
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