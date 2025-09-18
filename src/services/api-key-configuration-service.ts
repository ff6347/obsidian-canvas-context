import { Notice, Setting } from "obsidian";
import type { ApiKeyConfiguration, ModelConfiguration } from "../ui/settings.ts";
import { maskApiKey } from "../lib/settings-utils.ts";
import { ApiKeyModal } from "../ui/api-key-modal.ts";
import type { App } from "obsidian";
import type CanvasContextPlugin from "../main.ts";

export class ApiKeyConfigurationService {
	constructor(
		private app: App,
		private plugin: CanvasContextPlugin,
		private getSettings: () => { apiKeys: ApiKeyConfiguration[]; modelConfigurations: ModelConfiguration[] },
		private saveSettings: () => Promise<void>,
		private refreshDisplay: () => void,
	) {}

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
		descEl.createDiv({ text: `API Key: ${maskApiKey(apiKey.apiKey)}` });
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
						this.refreshDisplay(); // Refresh the settings page
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
					await this.deleteApiKey(apiKey, index);
				});
		});
	}

	private async deleteApiKey(apiKey: ApiKeyConfiguration, index: number) {
		const settings = this.getSettings();

		// Check if any models are using this API key
		const modelsUsingKey = settings.modelConfigurations.filter(
			(config) => config.apiKeyId === apiKey.id,
		);

		if (modelsUsingKey.length > 0) {
			const modelNames = modelsUsingKey.map((m) => m.name).join(", ");
			// oxlint-disable-next-line no-new
			new Notice(
				`Cannot delete API key "${apiKey.name}". It's being used by: ${modelNames}`,
			);
			return;
		}

		// Remove from array
		settings.apiKeys.splice(index, 1);
		await this.saveSettings();
		this.refreshDisplay(); // Refresh the settings page
		// oxlint-disable-next-line no-new
		new Notice("API key deleted.");
	}
}