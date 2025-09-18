import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InferenceService } from "../../src/services/inference-service.ts";
import { createMockApp, createMockPlugin } from "../mocks/obsidian-extended.ts";
import {
	createMockSettings,
	createMockModelConfiguration,
	createMockApiKeyConfiguration,
} from "../mocks/factories.ts";
import type { InferenceResult } from "../../src/llm/llm.ts";
import type { CanvasContextSettings } from "../../src/ui/settings.ts";

// Mock the dependencies
vi.mock("../../src/canvas/walker.ts", () => ({
	canvasGraphWalker: vi.fn(),
}));

vi.mock("../../src/llm/llm.ts", () => ({
	inference: vi.fn(),
}));

vi.mock("../../src/lib/settings-utils.ts", () => ({
	resolveApiKey: vi.fn(),
}));

describe("InferenceService", () => {
	let service: InferenceService;
	let mockApp: ReturnType<typeof createMockApp>;
	let mockGetSettings: ReturnType<typeof vi.fn>;
	let mockShowLoading: ReturnType<typeof vi.fn>;
	let mockHideLoading: ReturnType<typeof vi.fn>;
	let mockSettings: CanvasContextSettings;

	// Import mocked modules
	let canvasGraphWalker: any;
	let inference: any;
	let resolveApiKey: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import mocked modules
		({ canvasGraphWalker } = await import("../../src/canvas/walker.ts"));
		({ inference } = await import("../../src/llm/llm.ts"));
		({ resolveApiKey } = await import("../../src/lib/settings-utils.ts"));

		mockApp = createMockApp();
		mockSettings = createMockSettings();
		mockGetSettings = vi.fn().mockReturnValue(mockSettings);
		mockShowLoading = vi.fn();
		mockHideLoading = vi.fn();

		service = new InferenceService(
			mockApp as any,
			mockGetSettings,
			mockShowLoading,
			mockHideLoading,
		);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("runInference", () => {
		const mockNodeId = "test-node";
		const mockCanvasData = { nodes: [], edges: [] };
		const mockMessages = [
			{ role: "user" as const, content: "Test message" },
		];

		beforeEach(() => {
			vi.mocked(canvasGraphWalker).mockResolvedValue(mockMessages);
			vi.mocked(resolveApiKey).mockReturnValue("test-api-key");
		});

		it("should complete successful inference workflow", async () => {
			const mockResult: InferenceResult = {
				success: true,
				text: "Test response",
			};
			vi.mocked(inference).mockResolvedValue(mockResult);

			const result = await service.runInference(mockNodeId, mockCanvasData);

			expect(canvasGraphWalker).toHaveBeenCalledWith(
				mockNodeId,
				mockCanvasData,
				mockApp,
			);
			expect(mockShowLoading).toHaveBeenCalledWith("Running inference...");
			expect(inference).toHaveBeenCalledWith({
				messages: mockMessages,
				currentProviderName: mockSettings.modelConfigurations[0].provider,
				currentModelName: mockSettings.modelConfigurations[0].modelName,
				baseURL: mockSettings.modelConfigurations[0].baseURL,
				apiKey: "test-api-key",
			});
			expect(mockHideLoading).toHaveBeenCalled();
			expect(result).toEqual(mockResult);
		});

		it("should handle canvas walker errors", async () => {
			const walkerError = new Error("Canvas walker failed");
			vi.mocked(canvasGraphWalker).mockRejectedValue(walkerError);

			await expect(
				service.runInference(mockNodeId, mockCanvasData),
			).rejects.toThrow("Error processing canvas data. Check console for details.");

			expect(mockShowLoading).not.toHaveBeenCalled();
			expect(inference).not.toHaveBeenCalled();
		});

		it("should handle missing model configuration", async () => {
			mockGetSettings.mockReturnValue({
				...mockSettings,
				currentModel: "non-existent-model",
			});

			await expect(
				service.runInference(mockNodeId, mockCanvasData),
			).rejects.toThrow("Please select a valid model configuration in settings.");

			expect(mockShowLoading).not.toHaveBeenCalled();
			expect(inference).not.toHaveBeenCalled();
		});

		it("should handle disabled model configuration", async () => {
			const disabledModel = createMockModelConfiguration({ enabled: false });
			mockGetSettings.mockReturnValue({
				...mockSettings,
				modelConfigurations: [disabledModel],
				currentModel: disabledModel.id,
			});

			await expect(
				service.runInference(mockNodeId, mockCanvasData),
			).rejects.toThrow("Please select a valid model configuration in settings.");
		});

		it("should handle missing provider in model configuration", async () => {
			const modelWithoutProvider = createMockModelConfiguration({
				provider: undefined,
			});
			mockGetSettings.mockReturnValue({
				...mockSettings,
				modelConfigurations: [modelWithoutProvider],
				currentModel: modelWithoutProvider.id,
			});

			await expect(
				service.runInference(mockNodeId, mockCanvasData),
			).rejects.toThrow("Please select a valid model configuration in settings.");
		});

		it("should call inference without API key when none resolved", async () => {
			vi.mocked(resolveApiKey).mockReturnValue(undefined);
			const mockResult: InferenceResult = {
				success: true,
				text: "Test response",
			};
			vi.mocked(inference).mockResolvedValue(mockResult);

			await service.runInference(mockNodeId, mockCanvasData);

			expect(inference).toHaveBeenCalledWith({
				messages: mockMessages,
				currentProviderName: mockSettings.modelConfigurations[0].provider,
				currentModelName: mockSettings.modelConfigurations[0].modelName,
				baseURL: mockSettings.modelConfigurations[0].baseURL,
			});
		});

		it("should track failed inference results", async () => {
			const failedResult: InferenceResult = {
				success: false,
				text: "",
				error: "Inference failed",
				errorType: "connection",
			};
			vi.mocked(inference).mockResolvedValue(failedResult);

			const result = await service.runInference(mockNodeId, mockCanvasData);

			expect(result).toEqual(failedResult);
			const recentErrors = service.getRecentErrors();
			expect(recentErrors).toHaveLength(1);
			expect(recentErrors[0]).toMatchObject({
				success: false,
				error: "Inference failed",
				errorType: "connection",
			});
			expect(recentErrors[0]).toHaveProperty("timestamp");
		});

		it("should handle inference exceptions", async () => {
			const inferenceError = new Error("LLM service unavailable");
			vi.mocked(inference).mockRejectedValue(inferenceError);

			await expect(
				service.runInference(mockNodeId, mockCanvasData),
			).rejects.toThrow("Error during LLM inference. Check console for details.");

			expect(mockHideLoading).toHaveBeenCalled();
		});

		it("should always call hideLoading even on error", async () => {
			const inferenceError = new Error("Test error");
			vi.mocked(inference).mockRejectedValue(inferenceError);

			await expect(
				service.runInference(mockNodeId, mockCanvasData),
			).rejects.toThrow();

			expect(mockShowLoading).toHaveBeenCalled();
			expect(mockHideLoading).toHaveBeenCalled();
		});
	});

	describe("addRecentError", () => {
		it("should not add successful results to recent errors", () => {
			const successResult: InferenceResult = {
				success: true,
				text: "Success",
			};

			service.addRecentError(successResult);

			expect(service.getRecentErrors()).toHaveLength(0);
		});

		it("should add failed results with timestamp", () => {
			const failedResult: InferenceResult = {
				success: false,
				text: "",
				error: "Test error",
				errorType: "model",
			};

			const beforeTime = Date.now();
			service.addRecentError(failedResult);
			const afterTime = Date.now();

			const recentErrors = service.getRecentErrors();
			expect(recentErrors).toHaveLength(1);
			expect(recentErrors[0]).toMatchObject(failedResult);
			expect(recentErrors[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
			expect(recentErrors[0].timestamp).toBeLessThanOrEqual(afterTime);
		});

		it("should maintain maximum of 5 recent errors", () => {
			// Add 7 errors
			for (let i = 0; i < 7; i++) {
				service.addRecentError({
					success: false,
					text: "",
					error: `Error ${i}`,
					errorType: "unknown",
				});
			}

			const recentErrors = service.getRecentErrors();
			expect(recentErrors).toHaveLength(5);
			// Should keep the most recent 5 errors (errors 2-6)
			expect(recentErrors[0].error).toBe("Error 6");
			expect(recentErrors[4].error).toBe("Error 2");
		});

		it("should maintain chronological order (newest first)", () => {
			const errors = ["First", "Second", "Third"];

			errors.forEach((error) => {
				service.addRecentError({
					success: false,
					text: "",
					error,
					errorType: "unknown",
				});
			});

			const recentErrors = service.getRecentErrors();
			expect(recentErrors[0].error).toBe("Third");
			expect(recentErrors[1].error).toBe("Second");
			expect(recentErrors[2].error).toBe("First");
		});
	});

	describe("getRecentErrors", () => {
		it("should return empty array when no errors", () => {
			expect(service.getRecentErrors()).toEqual([]);
		});

		it("should return copy of errors array", () => {
			const error: InferenceResult = {
				success: false,
				text: "",
				error: "Test error",
			};
			service.addRecentError(error);

			const errors1 = service.getRecentErrors();
			const errors2 = service.getRecentErrors();

			expect(errors1).toEqual(errors2);
			expect(errors1).not.toBe(errors2); // Different array instances
		});
	});

	describe("getErrorTroubleshootingText", () => {
		it("should return connection troubleshooting steps", () => {
			const text = service.getErrorTroubleshootingText("connection");

			expect(text).toContain("Check if the provider service is running");
			expect(text).toContain("Verify the base URL is correct");
			expect(text).toContain("Ensure network connectivity");
		});

		it("should return model troubleshooting steps", () => {
			const text = service.getErrorTroubleshootingText("model");

			expect(text).toContain("Verify the model name exists on the provider");
			expect(text).toContain("Check if the model is properly loaded");
			expect(text).toContain("Try refreshing available models");
		});

		it("should return provider troubleshooting steps", () => {
			const text = service.getErrorTroubleshootingText("provider");

			expect(text).toContain("Ensure the provider is properly configured");
			expect(text).toContain("Check provider settings in the plugin");
		});

		it("should return default troubleshooting steps for unknown error type", () => {
			const text = service.getErrorTroubleshootingText();

			expect(text).toContain("Check the console for detailed error information");
			expect(text).toContain("Verify all configuration settings");
			expect(text).toContain("Try running inference again");
		});

		it("should include Ollama-specific steps", () => {
			const text = service.getErrorTroubleshootingText("connection", "ollama");

			expect(text).toContain("Ollama Setup");
			expect(text).toContain("http://localhost:11434");
			expect(text).toContain("ollama serve");
			expect(text).toContain("ollama list");
			expect(text).toContain("ollama pull");
		});

		it("should include LM Studio-specific steps", () => {
			const text = service.getErrorTroubleshootingText("model", "lmstudio");

			expect(text).toContain("LM Studio Setup");
			expect(text).toContain("http://localhost:1234");
			expect(text).toContain("Start Server");
			expect(text).toContain("Local Server tab");
			expect(text).toContain("/v1/models");
		});

		it("should not include provider-specific steps for unknown provider", () => {
			const text = service.getErrorTroubleshootingText("connection", "unknown");

			expect(text).not.toContain("Ollama Setup");
			expect(text).not.toContain("LM Studio Setup");
			expect(text).toContain("Check if the provider service is running");
		});
	});

	describe("createErrorDetails", () => {
		beforeEach(() => {
			const modelConfig = createMockModelConfiguration({
				name: "Test Model",
				provider: "ollama",
				modelName: "llama3.1",
				baseURL: "http://localhost:11434",
			});
			mockGetSettings.mockReturnValue({
				...mockSettings,
				modelConfigurations: [modelConfig],
				currentModel: modelConfig.id,
			});
		});

		it("should return empty string for successful results", () => {
			const successResult: InferenceResult = {
				success: true,
				text: "Success",
			};

			const details = service.createErrorDetails(successResult);

			expect(details).toBe("");
		});

		it("should create detailed error information", () => {
			const errorResult: InferenceResult = {
				success: false,
				text: "",
				error: "Connection failed",
				errorType: "connection",
			};

			const details = service.createErrorDetails(errorResult);

			expect(details).toContain("❌ Inference Error");
			expect(details).toContain("Error Type:** connection");
			expect(details).toContain("Message:** Connection failed");
			expect(details).toContain("## Configuration");
			expect(details).toContain("Model:** Test Model");
			expect(details).toContain("Provider:** ollama");
			expect(details).toContain("Model Name:** llama3.1");
			expect(details).toContain("Base URL:** http://localhost:11434");
			expect(details).toContain("## Troubleshooting");
		});

		it("should handle missing model configuration", () => {
			mockGetSettings.mockReturnValue({
				...mockSettings,
				modelConfigurations: [],
				currentModel: "non-existent",
			});

			const errorResult: InferenceResult = {
				success: false,
				text: "",
				error: "Test error",
			};

			const details = service.createErrorDetails(errorResult);

			expect(details).toContain("⚠️ No model configuration found");
		});

		it("should include provider-specific troubleshooting", () => {
			const errorResult: InferenceResult = {
				success: false,
				text: "",
				error: "Test error",
				errorType: "connection",
			};

			const details = service.createErrorDetails(errorResult);

			expect(details).toContain("ollama serve");
			expect(details).toContain("http://localhost:11434");
		});

		it("should handle unknown error types", () => {
			const errorResult: InferenceResult = {
				success: false,
				text: "",
				error: "Mystery error",
			};

			const details = service.createErrorDetails(errorResult);

			expect(details).toContain("Error Type:** unknown");
			expect(details).toContain("Message:** Mystery error");
		});
	});
});