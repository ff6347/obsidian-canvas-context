import { App, Modal, Setting, Notice, ButtonComponent } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { ModelConfiguration, ApiKeyConfiguration } from "./settings.ts";
import { computeDisplayName } from "../lib/settings-utils.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { providers } from "../llm/providers/providers.ts";
import { getProviderDocs } from "../llm/providers/providers.ts";

export class AddModelModal extends Modal {
	plugin: CanvasContextPlugin;
	modelConfig: Partial<ModelConfiguration>;
	isEditing: boolean;
	onSave: () => void;
	availableModels: string[] = [];
	isLoadingModels: boolean = false;
	modelDropdown: HTMLSelectElement | null = null;
	apiKeySetting: Setting | null = null;
	apiKeyDropdown: HTMLSelectElement | null = null;
	providerDocsButton: ButtonComponent | null = null;
	baseURLInput: HTMLInputElement | null = null;
	nameInput: HTMLInputElement | null = null;

	constructor(
		app: App,
		plugin: CanvasContextPlugin,
		modelConfig?: ModelConfiguration,
		onSave?: () => void,
	) {
		super(app);
		this.plugin = plugin;
		this.isEditing = !!modelConfig;
		this.modelConfig = modelConfig
			? { ...modelConfig }
			: {
					name: "",
					provider: undefined,
					modelName: "",
					baseURL: "",
					enabled: true,
				};
		this.onSave = onSave || (() => {});
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: this.isEditing
				? "Edit Model Configuration"
				: "Add Model Configuration",
		});

		// Model Name
		// Display Name with Custom Toggle
		const nameSetting = new Setting(contentEl)
			.setName("Display Name")
			.setDesc("Auto-computed from provider:model, or set custom name")
			.addText((text) => {
				this.nameInput = text.inputEl;
				text.setValue(this.getDisplayName()).onChange((value) => {
					if (this.modelConfig.useCustomDisplayName) {
						this.modelConfig.name = value;
					}
				});
			})
			.addToggle((toggle) => {
				toggle
					.setValue(this.modelConfig.useCustomDisplayName || false)
					.setTooltip("Enable to set custom display name")
					.onChange((value) => {
						this.modelConfig.useCustomDisplayName = value;
						if (value) {
							// Switching to custom - enable input and keep current value
							this.updateNameFieldState();
						} else {
							// Switching to auto - recompute and disable input
							this.modelConfig.name = this.getDisplayName();
							this.updateNameFieldState();
						}
					});
			});

		// Initialize name field state
		this.updateNameFieldState();

		// Provider
		const providerSetting = new Setting(contentEl)
			.setName("Provider")
			.setDesc("The LLM provider")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("", "Select a provider")
					.addOption("ollama", "Ollama")
					.addOption("lmstudio", "LM Studio")
					.addOption("openai", "OpenAI")
					.addOption("openrouter", "OpenRouter")
					.setValue(this.modelConfig.provider || "")
					.onChange((value) => {
						this.modelConfig.provider =
							value === "" ? undefined : (value as CurrentProviderType);
						// Clear model name since available models change with provider
						this.modelConfig.modelName = "";
						// Clear available models and reset dropdown
						this.availableModels = [];
						if (this.modelDropdown) {
							this.modelDropdown.innerHTML = "";
							const defaultOption = this.modelDropdown.createEl("option", {
								value: "",
								text: "Select a model",
							});
							this.modelDropdown.appendChild(defaultOption);
						}
						if (this.baseURLInput) {
							this.updateBaseURLPlaceholder(this.baseURLInput);
						}
						// Show/hide API key field based on provider
						this.updateApiKeyFieldVisibility();
						// Update API key dropdown options
						this.updateApiKeyDropdown();
						// Update display name if in auto mode
						this.updateNameFieldState();
						// Update provider documentation link
						this.updateProviderDocsLink();
						// Load models when provider and required params are available
						if (this.canLoadModels()) {
							this.loadModels();
						}
					});
			});

		// Add provider documentation link button
		this.addProviderDocsButton(providerSetting);

		// Base URL
		new Setting(contentEl)
			.setName("Base URL")
			.setDesc("The base URL for the provider")
			.addText((text) => {
				this.baseURLInput = text.inputEl;
				text.setValue(this.modelConfig.baseURL || "").onChange((value) => {
					this.modelConfig.baseURL = value;
					// Load models when provider and required params are available
					if (this.canLoadModels()) {
						this.loadModels();
					}
				});
				this.updateBaseURLPlaceholder(this.baseURLInput);
			});

		// API Key Selection (for cloud providers)
		this.apiKeySetting = new Setting(contentEl)
			.setName("API Key")
			.setDesc("Select a named API key from the centralized store")
			.addDropdown((dropdown) => {
				this.apiKeyDropdown = dropdown.selectEl;
				this.updateApiKeyDropdown();

				dropdown.onChange((value) => {
					if (value === "") {
						// No API key selected
						delete this.modelConfig.apiKeyId;
					} else {
						// Selected a named API key
						this.modelConfig.apiKeyId = value;
					}

					// Load models when provider and required params are available
					if (this.canLoadModels()) {
						this.loadModels();
					}
				});
			});

		// Initially hide API key field
		this.updateApiKeyFieldVisibility();

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
					// Update display name if in auto mode
					this.updateNameFieldState();
				});

				// Load models if provider and required params are available
				if (this.canLoadModels()) {
					this.loadModels();
				}
			});

		// Verify Connection Button
		new Setting(contentEl)
			.setName("Connection Test")
			.setDesc("Test the connection to the provider")
			.addButton((button) => {
				button.setButtonText("Verify Connection").onClick(async () => {
					await this.verifyConnection(button);
				});
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
				lmstudio: "http://localhost:1234",
				openai: "https://api.openai.com",
				openrouter: "https://openrouter.ai/api/v1",
			};
			const placeholder =
				placeholders[this.modelConfig.provider as keyof typeof placeholders] ||
				"";
			baseURLInput.placeholder = placeholder;

			// Update the baseURL to match the provider, unless user has manually customized it
			// Check if current value matches any of the default placeholder values
			const currentValue = this.modelConfig.baseURL;
			const isDefaultValue =
				currentValue && Object.values(placeholders).includes(currentValue);

			if (!this.modelConfig.baseURL || isDefaultValue) {
				this.modelConfig.baseURL = placeholder;
				baseURLInput.value = placeholder;
			}
		}
	}

	async verifyConnection(button: ButtonComponent) {
		if (!this.canLoadModels()) {
			new Notice("Please fill in all required fields first.");
			return;
		}

		button.setButtonText("Verifying...");
		button.setDisabled(true);

		try {
			const providerGenerator =
				providers[this.modelConfig.provider as keyof typeof providers];
			if (!providerGenerator) {
				throw new Error("Provider not found");
			}

			// For OpenAI and OpenRouter, pass the API key as the first parameter
			const resolvedApiKey = this.getResolvedApiKey();
			const models =
				(this.modelConfig.provider === "openai" ||
					this.modelConfig.provider === "openrouter") &&
				resolvedApiKey
					? await providerGenerator.listModels(
							resolvedApiKey,
							this.modelConfig.baseURL!,
						)
					: await providerGenerator.listModels(this.modelConfig.baseURL!);
			new Notice(`Connection successful! Found ${models.length} models.`);
			button.setButtonText("✓ Connected");
		} catch (error) {
			console.error("Connection verification failed:", error);
			new Notice(
				"Connection failed. Please check the base URL and ensure the provider is running.",
			);
			button.setButtonText("✗ Failed");
		}

		setTimeout(() => {
			button.setButtonText("Verify Connection");
			button.setDisabled(false);
		}, 2000);
	}

	async saveModel() {
		// Validate required fields
		if (
			!this.modelConfig.name ||
			!this.modelConfig.provider ||
			!this.modelConfig.modelName ||
			!this.modelConfig.baseURL
		) {
			new Notice("Please fill in all required fields.");
			return;
		}

		// Validate API key for OpenAI and OpenRouter
		if (
			(this.modelConfig.provider === "openai" ||
				this.modelConfig.provider === "openrouter") &&
			!this.getResolvedApiKey()
		) {
			new Notice("API Key is required for OpenAI and OpenRouter providers.");
			return;
		}

		// Generate ID if this is a new model
		if (!this.modelConfig.id) {
			this.modelConfig.id = this.plugin.generateId();
		}

		const modelConfig = this.modelConfig as ModelConfiguration;

		if (this.isEditing) {
			// Update existing model
			const index = this.plugin.settings.modelConfigurations.findIndex(
				(config) => config.id === modelConfig.id,
			);
			if (index !== -1) {
				this.plugin.settings.modelConfigurations[index] = modelConfig;
			}
		} else {
			// Add new model
			this.plugin.settings.modelConfigurations.push(modelConfig);
		}

		await this.plugin.saveSettings();
		new Notice(
			this.isEditing
				? "Model configuration updated!"
				: "Model configuration added!",
		);
		this.onSave();
		this.close();
	}

	async loadModels() {
		if (!this.canLoadModels() || !this.modelDropdown) {
			return;
		}

		if (this.isLoadingModels) {
			return; // Already loading
		}

		this.isLoadingModels = true;

		// Clear existing options except the first one
		this.modelDropdown.innerHTML = "";
		const defaultOption = this.modelDropdown.createEl("option", {
			value: "",
			text: "Loading models...",
		});
		this.modelDropdown.appendChild(defaultOption);
		this.modelDropdown.disabled = true;

		try {
			const providerGenerator =
				providers[this.modelConfig.provider as keyof typeof providers];
			if (!providerGenerator) {
				throw new Error("Provider not found");
			}

			// For OpenAI and OpenRouter, pass the API key as the first parameter
			const resolvedApiKey = this.getResolvedApiKey();
			const models =
				(this.modelConfig.provider === "openai" ||
					this.modelConfig.provider === "openrouter") &&
				resolvedApiKey
					? await providerGenerator.listModels(
							resolvedApiKey,
							this.modelConfig.baseURL!,
						)
					: await providerGenerator.listModels(this.modelConfig.baseURL!);
			this.availableModels = models;

			// Populate dropdown with models
			this.modelDropdown.innerHTML = "";
			const selectOption = this.modelDropdown.createEl("option", {
				value: "",
				text: "Select a model",
			});
			this.modelDropdown.appendChild(selectOption);

			models.forEach((model) => {
				const option = this.modelDropdown!.createEl("option", {
					value: model,
					text: model,
				});
				this.modelDropdown!.appendChild(option);
			});

			// Restore selected value if it exists in the list
			if (
				this.modelConfig.modelName &&
				models.includes(this.modelConfig.modelName)
			) {
				this.modelDropdown.value = this.modelConfig.modelName;
			}

			this.modelDropdown.disabled = false;
		} catch (error) {
			console.error("Error loading models:", error);
			this.modelDropdown.innerHTML = "";
			const errorOption = this.modelDropdown.createEl("option", {
				value: "",
				text: "Failed to load models",
			});
			this.modelDropdown.appendChild(errorOption);
			this.modelDropdown.disabled = false;
		}

		this.isLoadingModels = false;
	}

	updateApiKeyFieldVisibility() {
		if (!this.apiKeySetting) return;

		if (
			this.modelConfig.provider === "openai" ||
			this.modelConfig.provider === "openrouter"
		) {
			this.apiKeySetting.settingEl.style.display = "";
		} else {
			this.apiKeySetting.settingEl.style.display = "none";
		}
	}

	canLoadModels(): boolean {
		if (!this.modelConfig.provider || !this.modelConfig.baseURL) {
			return false;
		}

		// For OpenAI and OpenRouter, also require API key
		if (
			(this.modelConfig.provider === "openai" ||
				this.modelConfig.provider === "openrouter") &&
			!this.getResolvedApiKey()
		) {
			return false;
		}

		return true;
	}

	addProviderDocsButton(providerSetting: Setting) {
		providerSetting.addButton((button) => {
			this.providerDocsButton = button;
			button
				.setButtonText("📚 Docs")
				.setTooltip("View provider documentation")
				.onClick(() => {
					const docs = getProviderDocs(this.modelConfig.provider!);
					if (docs) {
						window.open(docs.docsUrl, "_blank");
					}
				});
		});
		this.updateProviderDocsLink();
	}

	updateProviderDocsLink() {
		if (!this.providerDocsButton) return;

		const docs = getProviderDocs(this.modelConfig.provider!);
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

	updateApiKeyDropdown() {
		if (!this.apiKeyDropdown) return;

		// Clear existing options
		this.apiKeyDropdown.innerHTML = "";

		// Add default option
		const defaultOption = this.apiKeyDropdown.createEl("option", {
			value: "",
			text: "Select an API key",
		});
		this.apiKeyDropdown.appendChild(defaultOption);

		// Add named API keys for the current provider
		if (
			this.modelConfig.provider === "openai" ||
			this.modelConfig.provider === "openrouter"
		) {
			const relevantKeys = this.plugin.settings.apiKeys.filter(
				(key) => key.provider === this.modelConfig.provider,
			);

			relevantKeys.forEach((key) => {
				const option = this.apiKeyDropdown!.createEl("option", {
					value: key.id,
					text: key.name,
				});
				this.apiKeyDropdown!.appendChild(option);
			});

			// Set current value
			if (this.modelConfig.apiKeyId) {
				this.apiKeyDropdown.value = this.modelConfig.apiKeyId;
			}
		}
	}

	getResolvedApiKey(): string | undefined {
		if (this.modelConfig.apiKeyId) {
			const apiKeyConfig = this.plugin.settings.apiKeys.find(
				(key) => key.id === this.modelConfig.apiKeyId,
			);
			return apiKeyConfig?.apiKey;
		}
		return undefined;
	}

	getDisplayName(): string {
		// If using custom name and it exists, return it
		if (this.modelConfig.useCustomDisplayName && this.modelConfig.name) {
			return this.modelConfig.name;
		}
		// Otherwise compute from provider:model
		return computeDisplayName(
			this.modelConfig.provider,
			this.modelConfig.modelName || "",
		);
	}

	updateNameFieldState(): void {
		if (!this.nameInput) return;

		const shouldUseCustom = this.modelConfig.useCustomDisplayName || false;

		// Update field state
		this.nameInput.disabled = !shouldUseCustom;
		this.nameInput.style.opacity = shouldUseCustom ? "1" : "0.6";

		// Update value and placeholder
		if (shouldUseCustom) {
			this.nameInput.placeholder = "Enter custom display name";
			// Keep current value if it exists, otherwise use computed value
			if (!this.modelConfig.name) {
				this.modelConfig.name = this.getDisplayName();
				this.nameInput.value = this.modelConfig.name;
			}
		} else {
			this.nameInput.placeholder = "Auto-computed from provider:model";
			// Always show computed value when in auto mode
			const computedName = computeDisplayName(
				this.modelConfig.provider,
				this.modelConfig.modelName || "",
			);
			this.nameInput.value = computedName;
			this.modelConfig.name = computedName;
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
