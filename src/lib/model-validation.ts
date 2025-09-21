import type { ModelConfiguration } from "../ui/settings.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";

/**
 * Pure validation functions for model configurations
 * No Obsidian dependencies - can be tested without mocks
 */

export interface ValidationResult {
	isValid: boolean;
	missingFields?: string[] | undefined;
	errors?: string[] | undefined;
}

/**
 * Validates that all required fields are present in a model configuration
 */
export function validateRequiredFields(config: Partial<ModelConfiguration>): ValidationResult {
	const missingFields: string[] = [];

	if (!config.name) missingFields.push("name");
	if (!config.provider) missingFields.push("provider");
	if (!config.modelName) missingFields.push("modelName");
	if (!config.baseURL) missingFields.push("baseURL");

	return {
		isValid: missingFields.length === 0,
		missingFields: missingFields.length > 0 ? missingFields : undefined,
	};
}

/**
 * Validates API key requirements for providers that need them
 */
export function validateApiKeyRequirements(
	provider: CurrentProviderType | undefined,
	hasApiKey: boolean,
): ValidationResult {
	const errors: string[] = [];

	if ((provider === "openai" || provider === "openrouter") && !hasApiKey) {
		errors.push(`API Key is required for ${provider} provider`);
	}

	return {
		isValid: errors.length === 0,
		errors: errors.length > 0 ? errors : undefined,
	};
}

/**
 * Determines if a configuration has all prerequisites for loading models
 */
export function canLoadModels(
	config: Partial<ModelConfiguration>,
	hasApiKey: boolean,
): boolean {
	if (!config.provider || !config.baseURL) {
		return false;
	}

	// For OpenAI and OpenRouter, also require API key
	if ((config.provider === "openai" || config.provider === "openrouter") && !hasApiKey) {
		return false;
	}

	return true;
}

/**
 * Validates complete model configuration including all requirements
 */
export function validateModelConfiguration(
	config: Partial<ModelConfiguration>,
	hasApiKey: boolean,
): ValidationResult {
	// Check required fields
	const fieldValidation = validateRequiredFields(config);
	if (!fieldValidation.isValid) {
		return fieldValidation;
	}

	// Check API key requirements
	const apiKeyValidation = validateApiKeyRequirements(config.provider, hasApiKey);
	if (!apiKeyValidation.isValid) {
		return apiKeyValidation;
	}

	return { isValid: true };
}

/**
 * Gets list of providers that require API keys
 */
export function getProvidersRequiringApiKeys(): CurrentProviderType[] {
	return ["openai", "openrouter"];
}

/**
 * Checks if a provider requires an API key
 */
export function providerRequiresApiKey(provider: CurrentProviderType | undefined): boolean {
	if (!provider) return false;
	return getProvidersRequiringApiKeys().includes(provider);
}