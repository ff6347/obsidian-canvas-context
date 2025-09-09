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
	availableModels: string[] = [];
	isLoadingModels: boolean = false;
	modelDropdown: HTMLSelectElement | null = null;

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
						// Load models when provider and baseURL are available
						if (this.modelConfig.provider && this.modelConfig.baseURL) {
							this.loadModels();
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
						// Load models when provider and baseURL are available
						if (this.modelConfig.provider && this.modelConfig.baseURL) {
							this.loadModels();
						}
					});
				this.updateBaseURLPlaceholder(baseURLInput);
			});

		// Model Name
		new Setting(contentEl)
			.setName("Model Name")
			.setDesc("Select from available models")
			.addDropdown((dropdown) => {
				this.modelDropdown = dropdown.selectEl;
				dropdown.addOption("", "Select a model");
				
				// Set current value if available
				if (this.modelConfig.modelName) {
					dropdown.setValue(this.modelConfig.modelName);
				}
				
				dropdown.onChange((value) => {
					this.modelConfig.modelName = value;
					// Auto-populate display name if empty
					if (!this.modelConfig.name && value) {
						this.modelConfig.name = `${this.modelConfig.provider} - ${value}`;
						this.updateDisplayName();
					}
				});
				
				// Load models if provider and baseURL are available
				if (this.modelConfig.provider && this.modelConfig.baseURL) {
					this.loadModels();
				}
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

	async loadModels() {
		if (!this.modelConfig.provider || !this.modelConfig.baseURL || !this.modelDropdown) {
			return;
		}

		if (this.isLoadingModels) {
			return; // Already loading
		}

		this.isLoadingModels = true;
		
		// Clear existing options except the first one
		this.modelDropdown.innerHTML = '';
		const defaultOption = this.modelDropdown.createEl('option', { value: '', text: 'Loading models...' });
		this.modelDropdown.appendChild(defaultOption);
		this.modelDropdown.disabled = true;

		try {
			const providerGenerator = providers[this.modelConfig.provider as keyof typeof providers];
			if (!providerGenerator) {
				throw new Error("Provider not found");
			}

			const models = await providerGenerator.listModels(this.modelConfig.baseURL);
			this.availableModels = models;

			// Populate dropdown with models
			this.modelDropdown.innerHTML = '';
			const selectOption = this.modelDropdown.createEl('option', { value: '', text: 'Select a model' });
			this.modelDropdown.appendChild(selectOption);
			
			models.forEach(model => {
				const option = this.modelDropdown!.createEl('option', { value: model, text: model });
				this.modelDropdown!.appendChild(option);
			});

			// Restore selected value if it exists in the list
			if (this.modelConfig.modelName && models.includes(this.modelConfig.modelName)) {
				this.modelDropdown.value = this.modelConfig.modelName;
			}

			this.modelDropdown.disabled = false;
			
		} catch (error) {
			console.error("Error loading models:", error);
			this.modelDropdown.innerHTML = '';
			const errorOption = this.modelDropdown.createEl('option', { value: '', text: 'Failed to load models' });
			this.modelDropdown.appendChild(errorOption);
			this.modelDropdown.disabled = false;
		}

		this.isLoadingModels = false;
	}

	updateDisplayName() {
		const nameInput = this.contentEl.querySelector('input[type="text"]') as HTMLInputElement;
		if (nameInput && this.modelConfig.name) {
			nameInput.value = this.modelConfig.name;
		}
	}

	generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substring(2);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}