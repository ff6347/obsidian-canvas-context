import { App, Modal, Setting, Notice, ButtonComponent } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { ModelConfiguration } from "../main.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { providers } from "../llm/providers/providers.ts";

export class AddModelModal extends Modal {
	plugin: CanvasContextPlugin;
	modelConfig: Partial<ModelConfiguration>;
	isEditing: boolean;
	onSave: () => void;

	constructor(app: App, plugin: CanvasContextPlugin, modelConfig?: ModelConfiguration, onSave?: () => void) {
		super(app);
		this.plugin = plugin;
		this.isEditing = !!modelConfig;
		this.modelConfig = modelConfig ? { ...modelConfig } : {
			name: "",
			provider: "" as CurrentProviderType,
			modelName: "",
			baseURL: "",
			enabled: true,
		};
		this.onSave = onSave || (() => {});
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: this.isEditing ? "Edit Model Configuration" : "Add Model Configuration" });

		// Model Name
		new Setting(contentEl)
			.setName("Display Name")
			.setDesc("A friendly name for this model configuration")
			.addText((text) => {
				text
					.setPlaceholder("e.g., GPT-4 via Ollama")
					.setValue(this.modelConfig.name || "")
					.onChange((value) => {
						this.modelConfig.name = value;
					});
			});

		// Provider
		new Setting(contentEl)
			.setName("Provider")
			.setDesc("The LLM provider")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("", "Select a provider")
					.addOption("ollama", "Ollama")
					.addOption("lmstudio", "LM Studio")
					.setValue(this.modelConfig.provider || "")
					.onChange((value) => {
						this.modelConfig.provider = value as CurrentProviderType;
						if (baseURLInput) {
							this.updateBaseURLPlaceholder(baseURLInput);
						}
					});
			});

		// Base URL
		let baseURLInput: HTMLInputElement;
		new Setting(contentEl)
			.setName("Base URL")
			.setDesc("The base URL for the provider")
			.addText((text) => {
				baseURLInput = text.inputEl;
				text
					.setValue(this.modelConfig.baseURL || "")
					.onChange((value) => {
						this.modelConfig.baseURL = value;
					});
				this.updateBaseURLPlaceholder(baseURLInput);
			});

		// Model Name
		new Setting(contentEl)
			.setName("Model Name")
			.setDesc("The exact model name as it appears in the provider")
			.addText((text) => {
				text
					.setPlaceholder("e.g., llama3.2:3b")
					.setValue(this.modelConfig.modelName || "")
					.onChange((value) => {
						this.modelConfig.modelName = value;
					});
			});

		// Verify Connection Button
		new Setting(contentEl)
			.setName("Connection Test")
			.setDesc("Test the connection to the provider")
			.addButton((button) => {
				button
					.setButtonText("Verify Connection")
					.onClick(async () => {
						await this.verifyConnection(button);
					});
			});

		// Action buttons
		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";
		buttonContainer.style.marginTop = "20px";

		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => {
				this.close();
			});

		new ButtonComponent(buttonContainer)
			.setButtonText(this.isEditing ? "Update" : "Add Model")
			.setCta()
			.onClick(async () => {
				await this.saveModel();
			});
	}

	updateBaseURLPlaceholder(baseURLInput: HTMLInputElement) {
		if (baseURLInput && this.modelConfig.provider) {
			const placeholders = {
				ollama: "http://localhost:11434",
				lmstudio: "http://localhost:1234"
			};
			const placeholder = placeholders[this.modelConfig.provider as keyof typeof placeholders] || "";
			baseURLInput.placeholder = placeholder;
			if (!this.modelConfig.baseURL) {
				this.modelConfig.baseURL = placeholder;
				baseURLInput.value = placeholder;
			}
		}
	}

	async verifyConnection(button: ButtonComponent) {
		if (!this.modelConfig.provider || !this.modelConfig.baseURL) {
			new Notice("Please select a provider and enter a base URL first.");
			return;
		}

		button.setButtonText("Verifying...");
		button.setDisabled(true);

		try {
			const providerGenerator = providers[this.modelConfig.provider as keyof typeof providers];
			if (!providerGenerator) {
				throw new Error("Provider not found");
			}

			const models = await providerGenerator.listModels(this.modelConfig.baseURL);
			new Notice(`Connection successful! Found ${models.length} models.`);
			button.setButtonText("✓ Connected");
		} catch (error) {
			console.error("Connection verification failed:", error);
			new Notice("Connection failed. Please check the base URL and ensure the provider is running.");
			button.setButtonText("✗ Failed");
		}

		setTimeout(() => {
			button.setButtonText("Verify Connection");
			button.setDisabled(false);
		}, 2000);
	}

	async saveModel() {
		// Validate required fields
		if (!this.modelConfig.name || !this.modelConfig.provider || !this.modelConfig.modelName || !this.modelConfig.baseURL) {
			new Notice("Please fill in all required fields.");
			return;
		}

		// Generate ID if this is a new model
		if (!this.modelConfig.id) {
			this.modelConfig.id = this.generateId();
		}

		const modelConfig = this.modelConfig as ModelConfiguration;

		if (this.isEditing) {
			// Update existing model
			const index = this.plugin.settings.modelConfigurations.findIndex(config => config.id === modelConfig.id);
			if (index !== -1) {
				this.plugin.settings.modelConfigurations[index] = modelConfig;
			}
		} else {
			// Add new model
			this.plugin.settings.modelConfigurations.push(modelConfig);
		}

		await this.plugin.saveSettings();
		new Notice(this.isEditing ? "Model configuration updated!" : "Model configuration added!");
		this.onSave();
		this.close();
	}

	generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}