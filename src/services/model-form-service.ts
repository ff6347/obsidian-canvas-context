import { ButtonComponent, Setting } from "obsidian";
import type { ModelConfiguration } from "../ui/settings.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { getProviderDocs } from "../llm/providers/providers.ts";
import { computeDisplayName } from "../lib/settings-utils.ts";

export interface ModelFormElements {
	nameInput: HTMLInputElement | null;
	modelDropdown: HTMLSelectElement | null;
	apiKeySetting: Setting | null;
	apiKeyDropdown: HTMLSelectElement | null;
	providerDocsButton: ButtonComponent | null;
	baseURLInput: HTMLInputElement | null;
}

export interface ApiKeyConfiguration {
	id: string;
	name: string;
	provider: CurrentProviderType | undefined;
	apiKey: string;
}

export class ModelFormService {
	constructor(
		private apiKeys: ApiKeyConfiguration[],
		private onConfigChange: (config: Partial<ModelConfiguration>) => void,
	) {}

	updateBaseURLPlaceholder(
		baseURLInput: HTMLInputElement,
		provider: CurrentProviderType | undefined,
	): string {
		if (baseURLInput && provider) {
			const placeholders = {
				ollama: "http://localhost:11434",
				lmstudio: "http://localhost:1234",
				openai: "https://api.openai.com",
				openrouter: "https://openrouter.ai/api/v1",
			};
			const placeholder =
				placeholders[provider as keyof typeof placeholders] || "";
			baseURLInput.placeholder = placeholder;
			return placeholder;
		}
		return "";
	}

	updateApiKeyFieldVisibility(
		apiKeySetting: Setting | null,
		provider: CurrentProviderType | undefined,
	): void {
		if (!apiKeySetting) {
			return;
		}

		if (provider === "openai" || provider === "openrouter") {
			apiKeySetting.settingEl.style.display = "";
		} else {
			apiKeySetting.settingEl.style.display = "none";
		}
	}

	updateApiKeyDropdown(
		apiKeyDropdown: HTMLSelectElement | null,
		provider: CurrentProviderType | undefined,
		currentApiKeyId?: string,
	): void {
		if (!apiKeyDropdown) {
			return;
		}

		// Clear existing options
		apiKeyDropdown.innerHTML = "";

		// Add default option
		const defaultOption = apiKeyDropdown.createEl("option", {
			value: "",
			text: "Select an API key",
		});
		apiKeyDropdown.appendChild(defaultOption);

		// Add named API keys for the current provider
		if (provider === "openai" || provider === "openrouter") {
			const relevantKeys = this.apiKeys.filter((key) => key.provider === provider);

			relevantKeys.forEach((key) => {
				const option = apiKeyDropdown.createEl("option", {
					value: key.id,
					text: key.name,
				});
				apiKeyDropdown.appendChild(option);
			});

			// Set current value
			if (currentApiKeyId) {
				apiKeyDropdown.value = currentApiKeyId;
			}
		}
	}

	updateProviderDocsLink(
		providerDocsButton: ButtonComponent | null,
		provider: CurrentProviderType | undefined,
	): void {
		if (!providerDocsButton) {
			return;
		}

		const docs = getProviderDocs(provider!);
		if (docs) {
			providerDocsButton.setDisabled(false);
			providerDocsButton.setTooltip(`View ${docs.displayName} documentation`);
		} else {
			providerDocsButton.setDisabled(true);
			providerDocsButton.setTooltip("Select a provider first");
		}
	}

	updateNameFieldState(
		nameInput: HTMLInputElement | null,
		config: Partial<ModelConfiguration>,
	): void {
		if (!nameInput) {
			return;
		}

		const shouldUseCustom = config.useCustomDisplayName || false;

		// Update field state
		nameInput.disabled = !shouldUseCustom;
		nameInput.style.opacity = shouldUseCustom ? "1" : "0.6";

		// Update value and placeholder
		if (shouldUseCustom) {
			nameInput.placeholder = "Enter custom display name";
			// Keep current value if it exists, otherwise use computed value
			if (!config.name) {
				const computedName = this.getDisplayName(config);
				this.onConfigChange({ ...config, name: computedName });
				nameInput.value = computedName;
			}
		} else {
			nameInput.placeholder = "Auto-computed from provider:model";
			// Always show computed value when in auto mode
			const computedName = computeDisplayName(
				config.provider,
				config.modelName || "",
			);
			nameInput.value = computedName;
			this.onConfigChange({ ...config, name: computedName });
		}
	}

	getDisplayName(config: Partial<ModelConfiguration>): string {
		// If using custom name and it exists, return it
		if (config.useCustomDisplayName && config.name) {
			return config.name;
		}
		// Otherwise compute from provider:model
		return computeDisplayName(config.provider, config.modelName || "");
	}

	clearModelDropdown(modelDropdown: HTMLSelectElement | null): void {
		if (!modelDropdown) {
			return;
		}

		modelDropdown.innerHTML = "";
		const defaultOption = modelDropdown.createEl("option", {
			value: "",
			text: "Select a model",
		});
		modelDropdown.appendChild(defaultOption);
	}

	addProviderDocsButton(
		providerSetting: Setting,
		provider: CurrentProviderType | undefined,
	): ButtonComponent {
		let providerDocsButton: ButtonComponent;

		providerSetting.addButton((button) => {
			providerDocsButton = button;
			button
				.setButtonText("📚 Docs")
				.setTooltip("View provider documentation")
				.onClick(() => {
					const docs = getProviderDocs(provider!);
					if (docs) {
						window.open(docs.docsUrl, "_blank");
					}
				});
		});

		this.updateProviderDocsLink(providerDocsButton!, provider);
		return providerDocsButton!;
	}
}