import { Setting } from "obsidian";
import { maskApiKey } from "../lib/settings-utils.ts";
import {
	createApiKeySettingConfig,
	generateDeletionSuccessMessage,
	validateApiKeyDeletion,
} from "../lib/api-key-logic.ts";
import { ApiKeyModal } from "../ui/api-key-modal.ts";
import type { App } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { UINotificationAdapter } from "../types/adapter-types.ts";
import type {
	ApiKeyConfiguration,
	ModelConfiguration,
} from "src/types/settings-types.ts";

export class ApiKeyConfigurationService {
	constructor(
		private app: App,
		private plugin: CanvasContextPlugin,
		private getSettings: () => {
			apiKeys: ApiKeyConfiguration[];
			modelConfigurations: ModelConfiguration[];
		},
		private saveSettings: () => Promise<void>,
		private refreshDisplay: () => void,
		private notificationAdapter: UINotificationAdapter,
	) {}

	renderApiKeyConfiguration(
		containerEl: HTMLElement,
		apiKey: ApiKeyConfiguration,
		index: number,
	) {
		const setting = new Setting(containerEl);
		const maskedKey = maskApiKey(apiKey.apiKey);
		const config = createApiKeySettingConfig(apiKey, maskedKey);

		// API Key info
		setting.setName(config.name);

		// Create a custom description element with proper line breaks
		const descEl = setting.descEl;
		descEl.empty();

		// Add each line as a separate div element
		for (const line of config.descriptionLines) {
			descEl.createDiv({ text: line.text });
		}

		// Edit button
		setting.addButton((button) => {
			button
				.setButtonText(config.editButtonConfig.text)
				.setTooltip(config.editButtonConfig.tooltip)
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
				.setButtonText(config.deleteButtonConfig.text)
				.setTooltip(config.deleteButtonConfig.tooltip);

			if (config.deleteButtonConfig.isWarning) {
				button.setWarning();
			}

			button.onClick(async () => {
				await this.deleteApiKey(apiKey, index);
			});
		});
	}

	private async deleteApiKey(apiKey: ApiKeyConfiguration, index: number) {
		const settings = this.getSettings();

		// Use pure function to validate deletion
		const validationResult = validateApiKeyDeletion(
			apiKey,
			settings.modelConfigurations,
		);

		if (!validationResult.canDelete) {
			this.notificationAdapter.show(validationResult.errorMessage!);
			return;
		}

		// Remove from array
		settings.apiKeys.splice(index, 1);
		await this.saveSettings();
		this.refreshDisplay(); // Refresh the settings page

		const successMessage = generateDeletionSuccessMessage();
		this.notificationAdapter.show(successMessage);
	}
}
