import { App, Modal, Setting, Notice, ButtonComponent } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { ApiKeyConfiguration } from "./settings.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { getProviderDocs } from "../llm/providers/providers.ts";

export class ApiKeyModal extends Modal {
	plugin: CanvasContextPlugin;
	apiKeyConfig: Partial<ApiKeyConfiguration>;
	isEditing: boolean;
	onSave: () => void;

	constructor(
		app: App,
		plugin: CanvasContextPlugin,
		apiKeyConfig?: ApiKeyConfiguration,
		onSave?: () => void,
	) {
		super(app);
		this.plugin = plugin;
		this.isEditing = !!apiKeyConfig;
		this.apiKeyConfig = apiKeyConfig
			? { ...apiKeyConfig }
			: {
					name: "",
					provider: undefined,
					apiKey: "",
					description: "",
				};
		this.onSave = onSave || (() => {});
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: this.isEditing ? "Edit API Key" : "Add API Key",
		});

		// Display Name
		new Setting(contentEl)
			.setName("Display Name")
			.setDesc(
				"A friendly name to identify this API key (e.g., 'Personal OpenAI', 'Work Account')",
			)
			.addText((text) => {
				text
					.setPlaceholder("e.g., Personal OpenAI")
					.setValue(this.apiKeyConfig.name || "")
					.onChange((value) => {
						this.apiKeyConfig.name = value;
					});
			});

		// Provider
		const providerSetting = new Setting(contentEl)
			.setName("Provider")
			.setDesc("The provider this API key is for")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("", "Select a provider")
					.addOption("openai", "OpenAI")
					.addOption("openrouter", "OpenRouter")
					.setValue(this.apiKeyConfig.provider || "")
					.onChange((value) => {
						this.apiKeyConfig.provider =
							value === "" ? undefined : (value as CurrentProviderType);
						this.updateProviderDocsLink();
					});
			});

		// Add provider documentation link button
		this.addProviderDocsButton(providerSetting);

		// API Key
		new Setting(contentEl)
			.setName("API Key")
			.setDesc("Your API key for the selected provider")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("sk-...")
					.setValue(this.apiKeyConfig.apiKey || "")
					.onChange((value) => {
						this.apiKeyConfig.apiKey = value;
					});
			});

		// Description (optional)
		new Setting(contentEl)
			.setName("Description")
			.setDesc("Optional description or notes about this API key")
			.addTextArea((text) => {
				text
					.setPlaceholder("Optional description...")
					.setValue(this.apiKeyConfig.description || "")
					.onChange((value) => {
						this.apiKeyConfig.description = value;
					});
				text.inputEl.rows = 3;
			});

		// Action buttons
		const buttonContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";
		buttonContainer.style.marginTop = "20px";

		new ButtonComponent(buttonContainer).setButtonText("Cancel").onClick(() => {
			this.close();
		});

		new ButtonComponent(buttonContainer)
			.setButtonText(this.isEditing ? "Update" : "Add API Key")
			.setCta()
			.onClick(async () => {
				await this.saveApiKey();
			});
	}

	providerDocsButton: ButtonComponent | null = null;

	addProviderDocsButton(providerSetting: Setting) {
		providerSetting.addButton((button) => {
			this.providerDocsButton = button;
			button
				.setButtonText("📚 Docs")
				.setTooltip("View provider documentation")
				.onClick(() => {
					const docs = getProviderDocs(this.apiKeyConfig.provider!);
					if (docs) {
						window.open(docs.docsUrl, "_blank");
					}
				});
		});
		this.updateProviderDocsLink();
	}

	updateProviderDocsLink() {
		if (!this.providerDocsButton) return;

		const docs = getProviderDocs(this.apiKeyConfig.provider!);
		if (docs) {
			this.providerDocsButton.setDisabled(false);
			this.providerDocsButton.setTooltip(
				`View ${docs.displayName} documentation`,
			);
		} else {
			this.providerDocsButton.setDisabled(true);
			this.providerDocsButton.setTooltip("Select a provider first");
		}
	}

	async saveApiKey() {
		// Validate required fields
		if (
			!this.apiKeyConfig.name ||
			!this.apiKeyConfig.provider ||
			!this.apiKeyConfig.apiKey
		) {
			new Notice("Please fill in all required fields.");
			return;
		}

		// Validate provider
		if (
			this.apiKeyConfig.provider !== "openai" &&
			this.apiKeyConfig.provider !== "openrouter"
		) {
			new Notice(
				"API keys are only supported for OpenAI and OpenRouter providers.",
			);
			return;
		}

		// Check for duplicate names
		const existingKeys = this.plugin.settings.apiKeys.filter(
			(key) =>
				key.id !== this.apiKeyConfig.id && key.name === this.apiKeyConfig.name,
		);
		if (existingKeys.length > 0) {
			new Notice(`API key name "${this.apiKeyConfig.name}" is already in use.`);
			return;
		}

		// Generate ID if this is a new API key
		if (!this.apiKeyConfig.id) {
			this.apiKeyConfig.id = this.plugin.generateId();
		}

		const apiKeyConfig = this.apiKeyConfig as ApiKeyConfiguration;

		if (this.isEditing) {
			// Update existing API key
			const index = this.plugin.settings.apiKeys.findIndex(
				(key) => key.id === apiKeyConfig.id,
			);
			if (index !== -1) {
				this.plugin.settings.apiKeys[index] = apiKeyConfig;
			}
		} else {
			// Add new API key
			this.plugin.settings.apiKeys.push(apiKeyConfig);
		}

		await this.plugin.saveSettings();
		new Notice(this.isEditing ? "API key updated!" : "API key added!");
		this.onSave();
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
