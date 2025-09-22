import type {
	CanvasContextSettings,
	ModelConfiguration,
} from "src/types/settings-types.ts";
import type { InferenceResult, RecentError } from "../types/inference-types.ts";

// Re-export from types directory

export function findCurrentModelConfig(
	settings: CanvasContextSettings,
): ModelConfiguration | null {
	return (
		settings.modelConfigurations.find(
			(config) => config.id === settings.currentModel && config.enabled,
		) || null
	);
}

export function validateModelConfig(
	modelConfig: ModelConfiguration | null,
): string | null {
	if (!modelConfig?.provider) {
		return "Please select a valid model configuration in settings.";
	}
	return null;
}

export function addErrorToRecentList(
	result: InferenceResult,
	recentErrors: RecentError[],
): RecentError[] {
	if (result.success) {
		return recentErrors;
	}

	const errorWithTimestamp: RecentError = {
		...result,
		timestamp: Date.now(),
	};

	const updatedErrors = [errorWithTimestamp, ...recentErrors];
	return updatedErrors.slice(0, 5);
}

export function getErrorTroubleshootingText(
	errorType?: string,
	provider?: string,
): string {
	const baseSteps: string[] = [];

	switch (errorType) {
		case "connection":
			baseSteps.push(
				"- Check if the provider service is running",
				"- Verify the base URL is correct",
				"- Ensure network connectivity",
			);
			break;
		case "model":
			baseSteps.push(
				"- Verify the model name exists on the provider",
				"- Check if the model is properly loaded",
				"- Try refreshing available models in the modal",
			);
			break;
		case "provider":
			baseSteps.push(
				"- Ensure the provider is properly configured",
				"- Check provider settings in the plugin",
			);
			break;
		default:
			baseSteps.push(
				"- Check the console for detailed error information",
				"- Verify all configuration settings",
				"- Try running inference again",
			);
	}

	const providerSteps = getProviderSpecificSteps(provider);
	if (providerSteps.length > 0) {
		baseSteps.push("", "### Provider-Specific Tips:", ...providerSteps);
	}

	return baseSteps.join("\n");
}

function getProviderSpecificSteps(provider?: string): string[] {
	switch (provider) {
		case "ollama":
			return [
				"**Ollama Setup:**",
				"- Default URL: `http://localhost:11434`",
				"- Start Ollama: `ollama serve`",
				"- List models: `ollama list`",
				"- Pull models: `ollama pull llama3.2`",
				"- Check status: visit http://localhost:11434 in browser",
			];
		case "lmstudio":
			return [
				"**LM Studio Setup:**",
				"- Default URL: `http://localhost:1234`",
				'- Enable "Start Server" in LM Studio',
				"- Load a model in the Local Server tab",
				"- Verify server is running in the Server tab",
				"- Check endpoint: visit http://localhost:1234/v1/models",
			];
		default:
			return [];
	}
}

export function createErrorDetails(
	result: InferenceResult,
	modelConfig: ModelConfiguration | null,
): string {
	if (result.success) {
		return "";
	}

	return [
		`# ❌ Inference Error`,
		``,
		`**Error Type:** ${result.errorType || "unknown"}`,
		`**Message:** ${result.error || "Unknown error occurred"}`,
		``,
		`## Configuration`,
		modelConfig
			? [
					`**Model:** ${modelConfig.name}`,
					`**Provider:** ${modelConfig.provider}`,
					`**Model Name:** ${modelConfig.modelName}`,
					`**Base URL:** ${modelConfig.baseURL}`,
				].join("\n")
			: "⚠️ No model configuration found",
		``,
		`## Troubleshooting`,
		getErrorTroubleshootingText(result.errorType, modelConfig?.provider),
	].join("\n");
}

export function formatInferenceError(error: unknown, context: string): Error {
	console.error(`Error in ${context}:`, error);
	return new Error(`Error ${context}. Check console for details.`);
}
