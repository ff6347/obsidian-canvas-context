import type { CurrentProviderType } from "../types/llm-types.ts";
import type {
	ApiKeyConfiguration,
	ModelConfiguration,
} from "src/types/settings-types.ts";

/**
 * Masks an API key by showing only the last 4 characters and 8 dots
 */
export function maskApiKey(apiKey: string): string {
	if (!apiKey) {
		return "";
	}

	// Always show exactly 8 masked characters + last 4 characters = 12 total
	// This ensures consistent length regardless of actual API key length
	const lastFour = apiKey.slice(-4);
	return "••••••••" + lastFour;
}

/**
 * Resolves an API key from the centralized store using the model's apiKeyId
 */
export function resolveApiKey(
	config: ModelConfiguration,
	apiKeys: ApiKeyConfiguration[],
): string | undefined {
	if (config.apiKeyId) {
		const apiKeyConfig = apiKeys.find((key) => key.id === config.apiKeyId);
		return apiKeyConfig?.apiKey;
	}
	return undefined;
}

/**
 * Computes a display name from provider and model name in the format "provider:model"
 */
export function computeDisplayName(
	provider: CurrentProviderType | undefined,
	modelName: string,
): string {
	if (!provider || !modelName) {
		return "";
	}
	return `${provider}:${modelName}`;
}
