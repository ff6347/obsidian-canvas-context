import { App, PluginSettingTab, Setting } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
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

		new Setting(containerEl)
			.setName("LLM Model")
			.setDesc("The Model for the LLM")
			.addDropdown((dropdown) => {
				dropdown.addOption("", "Select a model");
				const providerGenerator =
					providers[
						this.plugin.settings.currentProvider as keyof typeof providers
					];
				if (providerGenerator) {
					const listModels = providerGenerator.listModels;
					listModels(
						this.plugin.settings[
							this.plugin.settings.currentProvider as keyof typeof providers
						].baseURL,
					)
						.then((fetchedModels) => {
							fetchedModels.forEach((model) => {
								dropdown.addOption(model, model);
							});
							dropdown.setValue(this.plugin.settings.currentModel);
						})
						.catch((error) => {
							console.error("Error fetching models:", error);
							new Setting(containerEl)
								.setName("Error")
								.setDesc(
									"Failed to fetch models from the provider. Please check the Base URL and ensure the provider is running.",
								);
						});
				} else {
					dropdown.setValue("");
				}
				dropdown.onChange(async (value) => {
					this.plugin.settings.currentModel = value;
					await this.plugin.saveSettings();
				});
			});
		// .addText((text) =>
		// 	text
		// 		.setPlaceholder("The model name")
		// 		.setValue(this.plugin.settings.currentModel)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.currentModel = value;
		// 			await this.plugin.saveSettings();
		// 		}),
		// );

		new Setting(containerEl)
			.setName("LLM Provider")
			.setDesc("The Provider for the LLM")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("", "Select a provider")
					.addOption("ollama", "Ollama")
					.addOption("lmstudio", "LM Studio")
					.setValue(this.plugin.settings.currentProvider)
					.onChange(async (value) => {
						this.plugin.settings.currentProvider = value as any;
						await this.plugin.saveSettings();
						this.display(); // Refresh to show/hide provider-specific settings
					});
			});

		new Setting(containerEl)
			.setName("Base URL Ollama")
			.setDesc("The Base URL for the ollama LLM Provider")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:11434")
					.setValue(this.plugin.settings.ollama.baseURL)
					.onChange(async (value) => {
						this.plugin.settings.ollama.baseURL = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Base URL LM Studio")
			.setDesc("The Base URL for the lmstudio LLM Provider")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:1234")
					.setValue(this.plugin.settings.lmstudio.baseURL)
					.onChange(async (value) => {
						this.plugin.settings.lmstudio.baseURL = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
