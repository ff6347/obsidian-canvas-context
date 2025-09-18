import { App } from "obsidian";
import type { ModelMessage } from "ai";

import { canvasGraphWalker } from "../canvas/walker.ts";
import { resolveApiKey } from "../lib/settings-utils.ts";
import { type InferenceResult, inference } from "../llm/llm.ts";
import type {
	CanvasContextSettings,
} from "../types/canvas-types.ts";

export class InferenceService {
	private recentErrors: InferenceResult[] = [];

	constructor(
		private app: App,
		private getSettings: () => CanvasContextSettings,
		private showLoadingStatus: (text?: string) => void,
		private hideLoadingStatus: () => void,
	) {}

	async runInference(
		nodeId: string,
		canvasData: unknown,
	): Promise<InferenceResult> {
		let messages: ModelMessage[];
		try {
			messages = await canvasGraphWalker(nodeId, canvasData as any, this.app);
		} catch (error) {
			console.error("Error in canvasGraphWalker:", error);
			throw new Error("Error processing canvas data. Check console for details.");
		}

		const settings = this.getSettings();
		const currentModelConfig = settings.modelConfigurations.find(
			(config) => config.id === settings.currentModel && config.enabled,
		);

		if (!currentModelConfig?.provider) {
			throw new Error("Please select a valid model configuration in settings.");
		}

		this.showLoadingStatus("Running inference...");

		try {
			const resolvedApiKey = resolveApiKey(currentModelConfig, settings.apiKeys);
			const result = await inference({
				messages,
				currentProviderName: currentModelConfig.provider,
				currentModelName: currentModelConfig.modelName,
				baseURL: currentModelConfig.baseURL,
				...(resolvedApiKey && { apiKey: resolvedApiKey }),
			});

			if (!result.success) {
				this.addRecentError(result);
			}

			return result;
		} catch (error) {
			console.error("Inference error:", error);
			throw new Error("Error during LLM inference. Check console for details.");
		} finally {
			this.hideLoadingStatus();
		}
	}

	addRecentError(result: InferenceResult) {
		if (result.success) {
			return;
		}

		const errorWithTimestamp = {
			...result,
			timestamp: Date.now(),
		};

		this.recentErrors.unshift(errorWithTimestamp as InferenceResult);
		if (this.recentErrors.length > 5) {
			this.recentErrors = this.recentErrors.slice(0, 5);
		}
	}

	getRecentErrors(): InferenceResult[] {
		return [...this.recentErrors];
	}

	getErrorTroubleshootingText(errorType?: string, provider?: string): string {
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

		const providerSteps = this.getProviderSpecificSteps(provider);
		if (providerSteps.length > 0) {
			baseSteps.push("", "### Provider-Specific Tips:", ...providerSteps);
		}

		return baseSteps.join("\n");
	}

	private getProviderSpecificSteps(provider?: string): string[] {
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

	createErrorDetails(result: InferenceResult): string {
		if (result.success) {
			return "";
		}

		const settings = this.getSettings();
		const currentModelConfig = settings.modelConfigurations.find(
			(config) => config.id === settings.currentModel,
		);

		return [
			`# ❌ Inference Error`,
			``,
			`**Error Type:** ${result.errorType || "unknown"}`,
			`**Message:** ${result.error || "Unknown error occurred"}`,
			``,
			`## Configuration`,
			currentModelConfig
				? [
						`**Model:** ${currentModelConfig.name}`,
						`**Provider:** ${currentModelConfig.provider}`,
						`**Model Name:** ${currentModelConfig.modelName}`,
						`**Base URL:** ${currentModelConfig.baseURL}`,
					].join("\n")
				: "⚠️ No model configuration found",
			``,
			`## Troubleshooting`,
			this.getErrorTroubleshootingText(
				result.errorType,
				currentModelConfig?.provider,
			),
		].join("\n");
	}
}