/* oxlint-disable eslint/max-lines eslint/max-lines-per-function */
import { App, ButtonComponent, Modal, Setting } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { ModelValidationService } from "../services/model-validation-service.ts";
import { ModelFormService } from "../services/model-form-service.ts";
import { ModelConfigService } from "../services/model-config-service.ts";
import type { ModelConfiguration } from "src/types/settings-types.ts";
interface ModelFormElements {
	nameInput: HTMLInputElement | null;
	modelDropdown: HTMLSelectElement | null;
	apiKeySetting: Setting | null;
	apiKeyDropdown: HTMLSelectElement | null;
	providerDocsButton: ButtonComponent | null;
	baseURLInput: HTMLInputElement | null;
}

export class AddModelModal extends Modal {
	plugin: CanvasContextPlugin;
	modelConfig: Partial<ModelConfiguration>;
	isEditing: boolean;
	onSave: () => void;
	availableModels: string[] = [];
	isLoadingModels: { value: boolean } = { value: false };
	formElements: ModelFormElements = {
		nameInput: null,
		modelDropdown: null,
		apiKeySetting: null,
		apiKeyDropdown: null,
		providerDocsButton: null,
		baseURLInput: null,
	};

	// Services
	private validationService: ModelValidationService;
	private formService: ModelFormService;
	private configService: ModelConfigService;

	constructor(
		app: App,
		plugin: CanvasContextPlugin,
		modelConfig?: ModelConfiguration,
		onSave?: () => void,
	) {
		super(app);
		this.plugin = plugin;
		this.isEditing = !!modelConfig;
		this.onSave =
			onSave ||
			(() => {
				console.warn("No onSave callback provided");
			});

		// Initialize services
		this.configService = new ModelConfigService(
			() => this.plugin.settings,
			() => this.plugin.saveSettings(),
			(length) => this.plugin.generateId(length),
			this.plugin.notificationAdapter,
		);

		this.validationService = new ModelValidationService(
			(config) => this.configService.getResolvedApiKey(config),
			this.plugin.notificationAdapter,
		);

		this.formService = new ModelFormService(
			this.plugin.settings.apiKeys,
			(config) => {
				this.modelConfig = { ...this.modelConfig, ...config };
			},
		);

		// Initialize model config
		this.modelConfig = modelConfig
			? { ...modelConfig }
			: this.configService.createDefaultConfig();
	}

	override onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: this.isEditing
				? "Edit Model Configuration"
				: "Add Model Configuration",
		});

		// Model Name
		// Display Name with Custom Toggle
		new Setting(contentEl)
			.setName("Display Name")
			.setDesc("Auto-computed from provider:model, or set custom name")
			.addText((text) => {
				this.formElements.nameInput = text.inputEl;
				text
					.setValue(this.formService.getDisplayName(this.modelConfig))
					.onChange((value) => {
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
							this.formService.updateNameFieldState(
								this.formElements.nameInput,
								this.modelConfig,
							);
						} else {
							// Switching to auto - recompute and disable input
							this.modelConfig.name = this.formService.getDisplayName(
								this.modelConfig,
							);
							this.formService.updateNameFieldState(
								this.formElements.nameInput,
								this.modelConfig,
							);
						}
					});
			});

		// Initialize name field state
		this.formService.updateNameFieldState(
			this.formElements.nameInput,
			this.modelConfig,
		);

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
						this.formService.clearModelDropdown(
							this.formElements.modelDropdown,
						);
						if (this.formElements.baseURLInput) {
							this.formService.updateBaseURLPlaceholder(
								this.formElements.baseURLInput,
								this.modelConfig.provider,
							);
							this.modelConfig = this.configService.updateBaseURLForProvider(
								this.modelConfig,
								this.modelConfig.provider!,
							);
							if (this.formElements.baseURLInput) {
								this.formElements.baseURLInput.value =
									this.modelConfig.baseURL || "";
							}
						}
						// Show/hide API key field based on provider
						this.formService.updateApiKeyFieldVisibility(
							this.formElements.apiKeySetting,
							this.modelConfig.provider,
						);
						// Update API key dropdown options
						this.formService.updateApiKeyDropdown(
							this.formElements.apiKeyDropdown,
							this.modelConfig.provider,
							this.modelConfig.apiKeyId,
						);
						// Update display name if in auto mode
						this.formService.updateNameFieldState(
							this.formElements.nameInput,
							this.modelConfig,
						);
						// Update provider documentation link
						this.formService.updateProviderDocsLink(
							this.formElements.providerDocsButton,
							this.modelConfig.provider,
						);
						// Load models when provider and required params are available
						if (this.validationService.canLoadModels(this.modelConfig)) {
							this.loadModels();
						}
					});
			});

		// Add provider documentation link button
		this.formElements.providerDocsButton =
			this.formService.addProviderDocsButton(
				providerSetting,
				this.modelConfig.provider,
			);

		// Base URL
		new Setting(contentEl)
			.setName("Base URL")
			.setDesc("The base URL for the provider")
			.addText((text) => {
				this.formElements.baseURLInput = text.inputEl;
				text.setValue(this.modelConfig.baseURL || "").onChange((value) => {
					this.modelConfig.baseURL = value;
					// Load models when provider and required params are available
					if (this.validationService.canLoadModels(this.modelConfig)) {
						this.loadModels();
					}
				});
				this.formService.updateBaseURLPlaceholder(
					this.formElements.baseURLInput,
					this.modelConfig.provider,
				);
			});

		// API Key Selection (for cloud providers)
		this.formElements.apiKeySetting = new Setting(contentEl)
			.setName("API Key")
			.setDesc("Select a named API key from the centralized store")
			.addDropdown((dropdown) => {
				this.formElements.apiKeyDropdown = dropdown.selectEl;
				this.formService.updateApiKeyDropdown(
					this.formElements.apiKeyDropdown,
					this.modelConfig.provider,
					this.modelConfig.apiKeyId,
				);

				dropdown.onChange((value) => {
					if (value === "") {
						// No API key selected
						delete this.modelConfig.apiKeyId;
					} else {
						// Selected a named API key
						this.modelConfig.apiKeyId = value;
					}

					// Load models when provider and required params are available
					if (this.validationService.canLoadModels(this.modelConfig)) {
						this.loadModels();
					}
				});
			});

		// Initially hide API key field
		this.formService.updateApiKeyFieldVisibility(
			this.formElements.apiKeySetting,
			this.modelConfig.provider,
		);

		// Model Name
		new Setting(contentEl)
			.setName("Model Name")
			.setDesc("Select from available models")
			.addDropdown((dropdown) => {
				this.formElements.modelDropdown = dropdown.selectEl;
				dropdown.addOption("", "Select a model");

				// Set current value if available
				if (this.modelConfig.modelName) {
					dropdown.setValue(this.modelConfig.modelName);
				}

				dropdown.onChange((value) => {
					this.modelConfig.modelName = value;
					// Update display name if in auto mode
					this.formService.updateNameFieldState(
						this.formElements.nameInput,
						this.modelConfig,
					);
				});

				// Load models if provider and required params are available
				if (this.validationService.canLoadModels(this.modelConfig)) {
					this.loadModels();
				}
			});

		// Verify Connection Button
		new Setting(contentEl)
			.setName("Connection Test")
			.setDesc("Test the connection to the provider")
			.addButton((button) => {
				button.setButtonText("Verify Connection").onClick(async () => {
					await this.validationService.verifyConnection(
						this.modelConfig,
						button,
					);
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
				if (this.validationService.validateRequiredFields(this.modelConfig)) {
					await this.configService.saveModel(
						this.modelConfig,
						this.isEditing,
						() => {
							this.onSave();
							this.close();
						},
					);
				}
			});
	}

	async loadModels() {
		this.availableModels = await this.validationService.loadModels(
			this.modelConfig,
			this.formElements.modelDropdown!,
			this.isLoadingModels,
		);
	}

	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
