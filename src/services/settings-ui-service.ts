import { Setting } from "obsidian";
import { AddModelModal } from "../ui/add-model-modal.ts";
import { ApiKeyModal } from "../ui/api-key-modal.ts";
import type { App } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type {
	ApiKeyConfiguration,
	ModelConfiguration,
} from "src/types/settings-types.ts";

export class SettingsUIService {
	constructor(
		private app: App,
		private plugin: CanvasContextPlugin,
		private getSettings: () => {
			currentModel: string;
			modelConfigurations: ModelConfiguration[];
			apiKeys: ApiKeyConfiguration[];
		},
		private saveSettings: () => Promise<void>,
		private refreshDisplay: () => void,
	) {}

	createDefaultModelSelection(containerEl: HTMLElement) {
		// Default Model Selection
		new Setting(containerEl)
			.setName("Default Model")
			.setDesc("Select the default model for inference (fallback model)")
			.addDropdown((dropdown) => {
				dropdown.addOption("", "Select a model");

				// Add all enabled model configurations
				this.getSettings()
					.modelConfigurations.filter((config) => config.enabled)
					.forEach((config) => {
						dropdown.addOption(config.id, config.name);
					});

				dropdown
					.setValue(this.getSettings().currentModel)
					.onChange(async (value) => {
						const settings = this.getSettings();
						(settings as { currentModel: string }).currentModel = value;
						await this.saveSettings();
					});
			});
	}

	createApiKeysSection(containerEl: HTMLElement) {
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
								this.refreshDisplay(); // Refresh the settings page
							},
						);
						modal.open();
					});
			});

		return apiKeysSection;
	}

	createModelConfigurationsSection(containerEl: HTMLElement) {
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
								this.refreshDisplay(); // Refresh the settings page
							},
						);
						modal.open();
					});
			});

		return modelSection;
	}

	createEmptyApiKeysMessage(containerEl: HTMLElement) {
		containerEl.createDiv({
			text: "No API keys configured. Cloud providers (OpenAI, OpenRouter) require API keys.",
			cls: "setting-item-description",
		});
	}

	createEmptyModelsMessage(containerEl: HTMLElement) {
		containerEl.createDiv({
			text: "No model configurations found. Click 'Add Model' to get started.",
			cls: "setting-item-description",
		});
	}
}
