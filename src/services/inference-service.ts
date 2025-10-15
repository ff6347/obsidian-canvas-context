import { App } from "obsidian";
import type { ModelMessage } from "ai";

import { canvasGraphWalker } from "../canvas/walker.ts";
import { resolveApiKey } from "../lib/settings-utils.ts";
import type { CanvasContextSettings } from "../types/settings-types.ts";
import type { CurrentProviderType } from "../types/llm-types.ts";
import type {
	InferenceResult,
	RecentError,
} from "src/types/inference-types.ts";
import {
	findCurrentModelConfig,
	validateModelConfig,
	addErrorToRecentList,
	getErrorTroubleshootingText,
	createErrorDetails,
	formatInferenceError,
} from "../lib/inference-logic.ts";
import { inference } from "../llm/llm.ts";

export class InferenceService {
	private recentErrors: RecentError[] = [];

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
			throw formatInferenceError(error, "processing canvas data");
		}

		const settings = this.getSettings();
		const currentModelConfig = findCurrentModelConfig(settings);

		const validationError = validateModelConfig(currentModelConfig);
		if (validationError) {
			throw new Error(validationError);
		}

		this.showLoadingStatus("Running inference...");

		try {
			const resolvedApiKey = resolveApiKey(
				currentModelConfig!,
				settings.apiKeys,
			);
			const result = await inference({
				messages,
				currentProviderName: currentModelConfig!
					.provider as CurrentProviderType,
				currentModelName: currentModelConfig!.modelName,
				baseURL: currentModelConfig!.baseURL,
				...(resolvedApiKey && { apiKey: resolvedApiKey }),
			});

			if (!result.success) {
				this.recentErrors = addErrorToRecentList(result, this.recentErrors);
			}

			return result;
		} catch (error) {
			throw formatInferenceError(error, "during LLM inference");
		} finally {
			this.hideLoadingStatus();
		}
	}

	addRecentError(result: InferenceResult) {
		this.recentErrors = addErrorToRecentList(result, this.recentErrors);
	}

	getRecentErrors(): RecentError[] {
		return [...this.recentErrors];
	}

	getErrorTroubleshootingText(errorType?: string, provider?: string): string {
		return getErrorTroubleshootingText(errorType, provider);
	}

	createErrorDetails(result: InferenceResult): string {
		const settings = this.getSettings();
		const currentModelConfig = findCurrentModelConfig(settings);
		return createErrorDetails(result, currentModelConfig);
	}
}
