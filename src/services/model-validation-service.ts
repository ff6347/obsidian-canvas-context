import { ButtonComponent, Notice } from "obsidian";
import type { ModelConfiguration } from "../ui/settings.ts";
import { providers } from "../llm/providers/providers.ts";
import {
	canLoadModels,
	providerRequiresApiKey,
	validateModelConfiguration,
} from "../lib/model-validation.ts";

export class ModelValidationService {
	constructor(
		private getResolvedApiKey: (config: Partial<ModelConfiguration>) => string | undefined,
	) {}

	validateRequiredFields(config: Partial<ModelConfiguration>): boolean {
		const hasApiKey = Boolean(this.getResolvedApiKey(config));
		const validation = validateModelConfiguration(config, hasApiKey);

		if (!validation.isValid) {
			if (validation.missingFields) {
				// oxlint-disable-next-line no-new
				new Notice("Please fill in all required fields.");
			} else if (validation.errors && validation.errors.length > 0) {
				// oxlint-disable-next-line no-new
				new Notice(validation.errors[0]);
			}
			return false;
		}

		return true;
	}

	canLoadModels(config: Partial<ModelConfiguration>): boolean {
		const hasApiKey = Boolean(this.getResolvedApiKey(config));
		return canLoadModels(config, hasApiKey);
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

			// For providers requiring API keys, pass the API key as the first parameter
			const resolvedApiKey = this.getResolvedApiKey(config);
			const needsApiKey = providerRequiresApiKey(config.provider);
			const models = needsApiKey && resolvedApiKey
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

			// For providers requiring API keys, pass the API key as the first parameter
			const resolvedApiKey = this.getResolvedApiKey(config);
			const needsApiKey = providerRequiresApiKey(config.provider);
			const models = needsApiKey && resolvedApiKey
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