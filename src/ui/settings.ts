import {
	App,
	PluginSettingTab,
	Setting,
	ButtonComponent,
	Notice,
} from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { ModelConfiguration } from "../main.ts";
import { AddModelModal } from "./add-model-modal.ts";
import { providers } from "../llm/providers/providers.ts";
export class CanvasContextSettingTab extends PluginSettingTab {
	plugin: CanvasContextPlugin;

	constructor(app: App, plugin: CanvasContextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
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
		setting.setDesc(
			`${config.provider} • ${config.modelName} • ${config.baseURL}`,
		);

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

		// Verify button
		setting.addButton((button) => {
			button
				.setButtonText("Verify")
				.setTooltip("Test connection")
				.onClick(async () => {
					await this.verifyModelConfiguration(config, button);
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

			const models = await providerGenerator.listModels(config.baseURL);
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
