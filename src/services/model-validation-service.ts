import { ButtonComponent, Notice } from "obsidian";
import type { ModelConfiguration } from "../ui/settings.ts";
import { providers } from "../llm/providers/providers.ts";

export class ModelValidationService {
	constructor(
		private getResolvedApiKey: (config: Partial<ModelConfiguration>) => string | undefined,
	) {}

	validateRequiredFields(config: Partial<ModelConfiguration>): boolean {
		if (
			!config.name ||
			!config.provider ||
			!config.modelName ||
			!config.baseURL
		) {
			// oxlint-disable-next-line no-new
			new Notice("Please fill in all required fields.");
			return false;
		}

		// Validate API key for OpenAI and OpenRouter
		if (
			(config.provider === "openai" || config.provider === "openrouter") &&
			!this.getResolvedApiKey(config)
		) {
			// oxlint-disable-next-line no-new
			new Notice("API Key is required for OpenAI and OpenRouter providers.");
			return false;
		}

		return true;
	}

	canLoadModels(config: Partial<ModelConfiguration>): boolean {
		if (!config.provider || !config.baseURL) {
			return false;
		}

		// For OpenAI and OpenRouter, also require API key
		if (
			(config.provider === "openai" || config.provider === "openrouter") &&
			!this.getResolvedApiKey(config)
		) {
			return false;
		}

		return true;
	}

	async verifyConnection(
		config: Partial<ModelConfiguration>,
		button: ButtonComponent,
	): Promise<void> {
		if (!this.canLoadModels(config)) {
			// oxlint-disable-next-line no-new
			new Notice("Please fill in all required fields first.");
			return;
		}

		button.setButtonText("Verifying...");
		button.setDisabled(true);

		try {
			const providerGenerator =
				providers[config.provider as keyof typeof providers];
			if (!providerGenerator) {
				throw new Error("Provider not found");
			}

			// For OpenAI and OpenRouter, pass the API key as the first parameter
			const resolvedApiKey = this.getResolvedApiKey(config);
			const models =
				(config.provider === "openai" || config.provider === "openrouter") &&
				resolvedApiKey
					? await providerGenerator.listModels(resolvedApiKey, config.baseURL!)
					: await providerGenerator.listModels(config.baseURL!);

			// oxlint-disable-next-line no-new
			new Notice(`Connection successful! Found ${models.length} models.`);
			button.setButtonText("✓ Connected");
		} catch (error) {
			console.error("Connection verification failed:", error);
			// oxlint-disable-next-line no-new
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

	async loadModels(
		config: Partial<ModelConfiguration>,
		modelDropdown: HTMLSelectElement,
		isLoadingModels: { value: boolean },
	): Promise<string[]> {
		if (!this.canLoadModels(config) || !modelDropdown) {
			return [];
		}

		if (isLoadingModels.value) {
			return []; // Already loading
		}

		isLoadingModels.value = true;

		// Clear existing options except the first one
		modelDropdown.innerHTML = "";
		const defaultOption = modelDropdown.createEl("option", {
			value: "",
			text: "Loading models...",
		});
		modelDropdown.appendChild(defaultOption);
		modelDropdown.disabled = true;

		try {
			const providerGenerator =
				providers[config.provider as keyof typeof providers];
			if (!providerGenerator) {
				throw new Error("Provider not found");
			}

			// For OpenAI and OpenRouter, pass the API key as the first parameter
			const resolvedApiKey = this.getResolvedApiKey(config);
			const models =
				(config.provider === "openai" || config.provider === "openrouter") &&
				resolvedApiKey
					? await providerGenerator.listModels(resolvedApiKey, config.baseURL!)
					: await providerGenerator.listModels(config.baseURL!);

			// Populate dropdown with models
			modelDropdown.innerHTML = "";
			const selectOption = modelDropdown.createEl("option", {
				value: "",
				text: "Select a model",
			});
			modelDropdown.appendChild(selectOption);

			models.forEach((model) => {
				const option = modelDropdown.createEl("option", {
					value: model,
					text: model,
				});
				modelDropdown.appendChild(option);
			});

			// Restore selected value if it exists in the list
			if (config.modelName && models.includes(config.modelName)) {
				modelDropdown.value = config.modelName;
			}

			modelDropdown.disabled = false;
			return models;
		} catch (error) {
			console.error("Error loading models:", error);
			modelDropdown.innerHTML = "";
			const errorOption = modelDropdown.createEl("option", {
				value: "",
				text: "Failed to load models",
			});
			modelDropdown.appendChild(errorOption);
			modelDropdown.disabled = false;
			return [];
		} finally {
			isLoadingModels.value = false;
		}
	}
}