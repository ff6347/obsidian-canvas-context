import { describe, it, expect } from "vitest";
import {
	findCurrentModelConfig,
	validateModelConfig,
	addErrorToRecentList,
	getErrorTroubleshootingText,
	createErrorDetails,
	formatInferenceError,
} from "../../src/lib/inference-logic.ts";
import type {
	InferenceResult,
	RecentError,
} from "src/types/inference-types.ts";
import type {
	CanvasContextSettings,
	ModelConfiguration,
} from "src/types/settings-types.ts";

describe("findCurrentModelConfig", () => {
	it("should find enabled model config by current model id", () => {
		const settings: CanvasContextSettings = {
			currentModel: "model-2",
			modelConfigurations: [
				{
					id: "model-1",
					name: "Model 1",
					provider: "ollama",
					modelName: "llama3.2",
					baseURL: "http://localhost:11434",
					enabled: true,
					useCustomDisplayName: false,
				},
				{
					id: "model-2",
					name: "Model 2",
					provider: "openai",
					modelName: "gpt-4",
					baseURL: "https://api.openai.com",
					enabled: true,
					useCustomDisplayName: false,
				},
			],
			apiKeys: [],
		} as CanvasContextSettings;

		const result = findCurrentModelConfig(settings);

		expect(result).toEqual({
			id: "model-2",
			name: "Model 2",
			provider: "openai",
			modelName: "gpt-4",
			baseURL: "https://api.openai.com",
			enabled: true,
			useCustomDisplayName: false,
		});
	});

	it("should return null if current model id not found", () => {
		const settings: CanvasContextSettings = {
			currentModel: "nonexistent-model",
			modelConfigurations: [
				{
					id: "model-1",
					name: "Model 1",
					provider: "ollama",
					modelName: "llama3.2",
					baseURL: "http://localhost:11434",
					enabled: true,
					useCustomDisplayName: false,
				},
			],
			apiKeys: [],
		} as CanvasContextSettings;

		const result = findCurrentModelConfig(settings);

		expect(result).toBeNull();
	});

	it("should return null if current model is disabled", () => {
		const settings: CanvasContextSettings = {
			currentModel: "model-1",
			modelConfigurations: [
				{
					id: "model-1",
					name: "Model 1",
					provider: "ollama",
					modelName: "llama3.2",
					baseURL: "http://localhost:11434",
					enabled: false,
					useCustomDisplayName: false,
				},
			],
			apiKeys: [],
		} as CanvasContextSettings;

		const result = findCurrentModelConfig(settings);

		expect(result).toBeNull();
	});

	it("should handle empty model configurations", () => {
		const settings: CanvasContextSettings = {
			currentModel: "model-1",
			modelConfigurations: [],
			apiKeys: [],
		} as CanvasContextSettings;

		const result = findCurrentModelConfig(settings);

		expect(result).toBeNull();
	});
});

describe("validateModelConfig", () => {
	it("should return null for valid model config", () => {
		const modelConfig: ModelConfiguration = {
			id: "model-1",
			name: "Model 1",
			provider: "ollama",
			modelName: "llama3.2",
			baseURL: "http://localhost:11434",
			enabled: true,
			useCustomDisplayName: false,
		};

		const result = validateModelConfig(modelConfig);

		expect(result).toBeNull();
	});

	it("should return error message for null model config", () => {
		const result = validateModelConfig(null);

		expect(result).toBe(
			"Please select a valid model configuration in settings.",
		);
	});

	it("should return error message for model config without provider", () => {
		const modelConfig = {
			id: "model-1",
			name: "Model 1",
			modelName: "llama3.2",
			baseURL: "http://localhost:11434",
			enabled: true,
			useCustomDisplayName: false,
		} as ModelConfiguration;

		const result = validateModelConfig(modelConfig);

		expect(result).toBe(
			"Please select a valid model configuration in settings.",
		);
	});
});

describe("addErrorToRecentList", () => {
	it("should add error with timestamp to empty list", () => {
		const error: InferenceResult = {
			success: false,
			text: "",
			error: "Test error",
			errorType: "connection",
		};
		const recentErrors: RecentError[] = [];

		const result = addErrorToRecentList(error, recentErrors);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			success: false,
			text: "",
			error: "Test error",
			errorType: "connection",
		});
		expect(result[0]!.timestamp).toBeTypeOf("number");
		expect(result[0]!.timestamp).toBeGreaterThan(0);
	});

	it("should add error to existing list and maintain order", () => {
		const existingError: RecentError = {
			success: false,
			text: "",
			error: "Old error",
			timestamp: 1000,
		};
		const newError: InferenceResult = {
			success: false,
			text: "",
			error: "New error",
			errorType: "model",
		};
		const recentErrors = [existingError];

		const result = addErrorToRecentList(newError, recentErrors);

		expect(result).toHaveLength(2);
		expect(result[0]!.error).toBe("New error");
		expect(result[1]!.error).toBe("Old error");
	});

	it("should limit list to 5 errors", () => {
		const recentErrors: RecentError[] = Array.from({ length: 5 }, (_, i) => ({
			success: false,
			text: "",
			error: `Error ${i}`,
			timestamp: 1000 + i,
		}));

		const newError: InferenceResult = {
			success: false,
			text: "",
			error: "New error",
		};

		const result = addErrorToRecentList(newError, recentErrors);

		expect(result).toHaveLength(5);
		expect(result[0]!.error).toBe("New error");
		expect(result[4]!.error).toBe("Error 3");
	});

	it("should return unchanged list for successful result", () => {
		const successResult: InferenceResult = {
			success: true,
			text: "Success response",
		};
		const recentErrors: RecentError[] = [
			{
				success: false,
				text: "",
				error: "Existing error",
				timestamp: 1000,
			},
		];

		const result = addErrorToRecentList(successResult, recentErrors);

		expect(result).toBe(recentErrors);
		expect(result).toHaveLength(1);
		expect(result[0]!.error).toBe("Existing error");
	});
});

describe("getErrorTroubleshootingText", () => {
	it("should return connection troubleshooting steps", () => {
		const result = getErrorTroubleshootingText("connection");

		expect(result).toContain("Check if the provider service is running");
		expect(result).toContain("Verify the base URL is correct");
		expect(result).toContain("Ensure network connectivity");
	});

	it("should return model troubleshooting steps", () => {
		const result = getErrorTroubleshootingText("model");

		expect(result).toContain("Verify the model name exists on the provider");
		expect(result).toContain("Check if the model is properly loaded");
		expect(result).toContain("Try refreshing available models in the modal");
	});

	it("should return provider troubleshooting steps", () => {
		const result = getErrorTroubleshootingText("provider");

		expect(result).toContain("Ensure the provider is properly configured");
		expect(result).toContain("Check provider settings in the plugin");
	});

	it("should return default troubleshooting steps for unknown error type", () => {
		const result = getErrorTroubleshootingText("unknown");

		expect(result).toContain(
			"Check the console for detailed error information",
		);
		expect(result).toContain("Verify all configuration settings");
		expect(result).toContain("Try running inference again");
	});

	it("should include Ollama-specific steps", () => {
		const result = getErrorTroubleshootingText("connection", "ollama");

		expect(result).toContain("Provider-Specific Tips:");
		expect(result).toContain("Ollama Setup:");
		expect(result).toContain("Default URL: `http://localhost:11434`");
		expect(result).toContain("Start Ollama: `ollama serve`");
		expect(result).toContain("List models: `ollama list`");
	});

	it("should include LM Studio-specific steps", () => {
		const result = getErrorTroubleshootingText("model", "lmstudio");

		expect(result).toContain("Provider-Specific Tips:");
		expect(result).toContain("LM Studio Setup:");
		expect(result).toContain("Default URL: `http://localhost:1234`");
		expect(result).toContain('Enable "Start Server" in LM Studio');
		expect(result).toContain("Load a model in the Local Server tab");
	});

	it("should not include provider-specific steps for unknown provider", () => {
		const result = getErrorTroubleshootingText(
			"connection",
			"unknown-provider",
		);

		expect(result).not.toContain("Provider-Specific Tips:");
		expect(result).toContain("Check if the provider service is running");
	});
});

describe("createErrorDetails", () => {
	const mockModelConfig: ModelConfiguration = {
		id: "model-1",
		name: "Test Model",
		provider: "ollama",
		modelName: "llama3.2",
		baseURL: "http://localhost:11434",
		enabled: true,
		useCustomDisplayName: false,
	};

	it("should return empty string for successful result", () => {
		const successResult: InferenceResult = {
			success: true,
			text: "Success response",
		};

		const result = createErrorDetails(successResult, mockModelConfig);

		expect(result).toBe("");
	});

	it("should create detailed error message with model config", () => {
		const errorResult: InferenceResult = {
			success: false,
			text: "",
			error: "Connection failed",
			errorType: "connection",
		};

		const result = createErrorDetails(errorResult, mockModelConfig);

		expect(result).toContain("# ❌ Inference Error");
		expect(result).toContain("**Error Type:** connection");
		expect(result).toContain("**Message:** Connection failed");
		expect(result).toContain("**Model:** Test Model");
		expect(result).toContain("**Provider:** ollama");
		expect(result).toContain("**Model Name:** llama3.2");
		expect(result).toContain("**Base URL:** http://localhost:11434");
		expect(result).toContain("## Troubleshooting");
		expect(result).toContain("Check if the provider service is running");
	});

	it("should handle missing model config", () => {
		const errorResult: InferenceResult = {
			success: false,
			text: "",
			error: "No model configured",
		};

		const result = createErrorDetails(errorResult, null);

		expect(result).toContain("# ❌ Inference Error");
		expect(result).toContain("**Error Type:** unknown");
		expect(result).toContain("**Message:** No model configured");
		expect(result).toContain("⚠️ No model configuration found");
	});

	it("should handle missing error details", () => {
		const errorResult: InferenceResult = {
			success: false,
			text: "",
		};

		const result = createErrorDetails(errorResult, mockModelConfig);

		expect(result).toContain("**Error Type:** unknown");
		expect(result).toContain("**Message:** Unknown error occurred");
	});
});

describe("formatInferenceError", () => {
	it("should format error with context", () => {
		const originalError = new Error("Original error message");
		const context = "during canvas processing";

		const result = formatInferenceError(originalError, context);

		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe(
			"Error during canvas processing. Check console for details.",
		);
	});

	it("should handle non-error objects", () => {
		const originalError = "String error";
		const context = "during inference";

		const result = formatInferenceError(originalError, context);

		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe(
			"Error during inference. Check console for details.",
		);
	});

	it("should handle null/undefined errors", () => {
		const context = "during validation";

		const result = formatInferenceError(null, context);

		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe(
			"Error during validation. Check console for details.",
		);
	});
});
