import type {
	ApiKeyConfiguration,
	ModelConfiguration,
} from "../types/settings-types.ts";

export interface ApiKeyValidationResult {
	canDelete: boolean;
	dependentModels?: string[];
	errorMessage?: string;
}

export interface ApiKeyDescriptionLine {
	text: string;
	type: "provider" | "apiKey" | "description";
}

export interface ApiKeySettingConfig {
	name: string;
	descriptionLines: ApiKeyDescriptionLine[];
	editButtonConfig: {
		text: string;
		tooltip: string;
	};
	deleteButtonConfig: {
		text: string;
		tooltip: string;
		isWarning: boolean;
	};
}

export function validateApiKeyDeletion(
	apiKey: ApiKeyConfiguration,
	modelConfigurations: ModelConfiguration[],
): ApiKeyValidationResult {
	const dependentModels = findModelsUsingApiKey(apiKey.id, modelConfigurations);

	if (dependentModels.length === 0) {
		return { canDelete: true };
	}

	const modelNames = dependentModels.map((model) => model.name);
	const errorMessage = generateDeletionErrorMessage(apiKey.name, modelNames);

	return {
		canDelete: false,
		dependentModels: modelNames,
		errorMessage,
	};
}

export function findModelsUsingApiKey(
	apiKeyId: string,
	modelConfigurations: ModelConfiguration[],
): ModelConfiguration[] {
	return modelConfigurations.filter((config) => config.apiKeyId === apiKeyId);
}

export function createApiKeySettingConfig(
	apiKey: ApiKeyConfiguration,
	maskedApiKey: string,
): ApiKeySettingConfig {
	const descriptionLines = formatApiKeyDescription(apiKey, maskedApiKey);

	return {
		name: apiKey.name,
		descriptionLines,
		editButtonConfig: {
			text: "Edit",
			tooltip: "Edit API key",
		},
		deleteButtonConfig: {
			text: "Delete",
			tooltip: "Delete API key",
			isWarning: true,
		},
	};
}

export function formatApiKeyDescription(
	apiKey: ApiKeyConfiguration,
	maskedApiKey: string,
): ApiKeyDescriptionLine[] {
	const lines: ApiKeyDescriptionLine[] = [
		{
			text: `Provider: ${apiKey.provider}`,
			type: "provider",
		},
		{
			text: `API Key: ${maskedApiKey}`,
			type: "apiKey",
		},
	];

	if (apiKey.description) {
		lines.push({
			text: `Description: ${apiKey.description}`,
			type: "description",
		});
	}

	return lines;
}

export function generateDeletionErrorMessage(
	apiKeyName: string,
	modelNames: string[],
): string {
	const modelList = modelNames.join(", ");
	return `Cannot delete API key "${apiKeyName}". It's being used by: ${modelList}`;
}

export function generateDeletionSuccessMessage(): string {
	return "API key deleted.";
}
