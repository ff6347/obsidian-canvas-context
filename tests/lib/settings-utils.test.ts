/* oxlint-disable	eslint/max-lines-per-function */

import { describe, expect, it } from "vitest";
import {
	computeDisplayName,
	maskApiKey,
	resolveApiKey,
} from "../../src/lib/settings-utils.ts";
import type {
	ApiKeyConfiguration,
	ModelConfiguration,
} from "../../src/ui/settings.ts";

describe("settings-utils", () => {
	describe("maskApiKey", () => {
		it("should mask API key with 8 dots and show last 4 characters", () => {
			const apiKey = "sk-1234567890abcdef1234567890abcdef";
			const result = maskApiKey(apiKey);
			expect(result).toBe("••••••••cdef");
		});

		it("should handle short API keys (less than 4 characters)", () => {
			const shortKey = "abc";
			const result = maskApiKey(shortKey);
			expect(result).toBe("••••••••abc");
		});

		it("should handle very short API keys (1 character)", () => {
			const shortKey = "a";
			const result = maskApiKey(shortKey);
			expect(result).toBe("••••••••a");
		});

		it("should handle empty string", () => {
			const result = maskApiKey("");
			expect(result).toBe("");
		});

		it("should handle different API key formats", () => {
			// OpenAI format
			expect(maskApiKey("sk-proj-abc123def456")).toBe("••••••••f456");

			// OpenRouter format
			expect(maskApiKey("sk-or-v1-1234567890abcdef")).toBe("••••••••cdef");

			// Custom format
			expect(maskApiKey("custom-key-xyz789")).toBe("••••••••z789");
		});

		it("should always return consistent length format (8 dots + last 4)", () => {
			const keys = [
				"sk-1234567890abcdef1234567890abcdef",
				"very-long-api-key-with-many-characters-1234",
				"short-key-abcd",
			];

			keys.forEach((key) => {
				const masked = maskApiKey(key);
				expect(masked).toMatch(/^••••••••.{0,4}$/); // 8 dots + up to 4 chars
				expect(masked.slice(0, 8)).toBe("••••••••"); // First 8 should always be dots
			});
		});

		it("should preserve last 4 characters exactly", () => {
			const testCases = [
				{ key: "sk-1234567890abcdef", expected: "cdef" },
				{ key: "test-key-9876", expected: "9876" },
				{ key: "api-key-WXYZ", expected: "WXYZ" },
			];

			testCases.forEach(({ key, expected }) => {
				const result = maskApiKey(key);
				const lastFour = result.slice(-4);
				expect(lastFour).toBe(expected);
			});
		});

		it("should handle null and undefined inputs", () => {
			// TypeScript won't allow these, but JavaScript might pass them
			expect(maskApiKey(null as any)).toBe("");
			expect(maskApiKey(undefined as any)).toBe("");
		});
	});

	describe("resolveApiKey", () => {
		const mockApiKeys: ApiKeyConfiguration[] = [
			{
				id: "api-key-1",
				name: "Personal OpenAI",
				provider: "openai",
				apiKey: "sk-1234567890abcdef1234567890abcdef",
				description: "My personal OpenAI key",
			},
			{
				id: "api-key-2",
				name: "Work OpenRouter",
				provider: "openrouter",
				apiKey: "sk-or-v1-1234567890abcdef1234567890abcdef",
			},
		];

		it("should resolve API key by apiKeyId", () => {
			const config: ModelConfiguration = {
				id: "model-1",
				name: "Test Model",
				provider: "openai",
				modelName: "gpt-4",
				baseURL: "https://api.openai.com",
				enabled: true,
				apiKeyId: "api-key-1",
			};

			const result = resolveApiKey(config, mockApiKeys);
			expect(result).toBe("sk-1234567890abcdef1234567890abcdef");
		});

		it("should return undefined when apiKeyId is not found", () => {
			const config: ModelConfiguration = {
				id: "model-1",
				name: "Test Model",
				provider: "openai",
				modelName: "gpt-4",
				baseURL: "https://api.openai.com",
				enabled: true,
				apiKeyId: "non-existent-key",
			};

			const result = resolveApiKey(config, mockApiKeys);
			expect(result).toBeUndefined();
		});

		it("should return undefined when apiKeyId is not set", () => {
			const config: ModelConfiguration = {
				id: "model-1",
				name: "Test Model",
				provider: "openai",
				modelName: "gpt-4",
				baseURL: "https://api.openai.com",
				enabled: true,
				// no apiKeyId
			};

			const result = resolveApiKey(config, mockApiKeys);
			expect(result).toBeUndefined();
		});

		it("should return undefined when apiKeys array is empty", () => {
			const config: ModelConfiguration = {
				id: "model-1",
				name: "Test Model",
				provider: "openai",
				modelName: "gpt-4",
				baseURL: "https://api.openai.com",
				enabled: true,
				apiKeyId: "api-key-1",
			};

			const result = resolveApiKey(config, []);
			expect(result).toBeUndefined();
		});

		it("should handle multiple API keys correctly", () => {
			const config1: ModelConfiguration = {
				id: "model-1",
				name: "OpenAI Model",
				provider: "openai",
				modelName: "gpt-4",
				baseURL: "https://api.openai.com",
				enabled: true,
				apiKeyId: "api-key-1",
			};

			const config2: ModelConfiguration = {
				id: "model-2",
				name: "OpenRouter Model",
				provider: "openrouter",
				modelName: "claude-3",
				baseURL: "https://openrouter.ai/api/v1",
				enabled: true,
				apiKeyId: "api-key-2",
			};

			expect(resolveApiKey(config1, mockApiKeys)).toBe(
				"sk-1234567890abcdef1234567890abcdef",
			);
			expect(resolveApiKey(config2, mockApiKeys)).toBe(
				"sk-or-v1-1234567890abcdef1234567890abcdef",
			);
		});
	});

	describe("computeDisplayName", () => {
		it("should compute display name from provider and model", () => {
			const result = computeDisplayName("openai", "gpt-4");
			expect(result).toBe("openai:gpt-4");
		});

		it("should handle different providers correctly", () => {
			expect(computeDisplayName("ollama", "llama2")).toBe("ollama:llama2");
			expect(computeDisplayName("openrouter", "claude-3-sonnet")).toBe(
				"openrouter:claude-3-sonnet",
			);
			expect(computeDisplayName("lmstudio", "mistral-7b")).toBe(
				"lmstudio:mistral-7b",
			);
		});

		it("should return empty string when provider is undefined", () => {
			const result = computeDisplayName(undefined, "gpt-4");
			expect(result).toBe("");
		});

		it("should return empty string when provider is null", () => {
			// TypeScript won't allow null, but JavaScript might pass it
			const result = computeDisplayName(null as any, "gpt-4");
			expect(result).toBe("");
		});

		it("should return empty string when modelName is empty", () => {
			const result = computeDisplayName("openai", "");
			expect(result).toBe("");
		});

		it("should return empty string when both provider and modelName are empty", () => {
			const result = computeDisplayName(undefined, "");
			expect(result).toBe("");
		});

		it("should handle special characters in model names", () => {
			expect(computeDisplayName("openai", "gpt-4-turbo-preview")).toBe(
				"openai:gpt-4-turbo-preview",
			);
			expect(computeDisplayName("ollama", "llama2:13b-chat")).toBe(
				"ollama:llama2:13b-chat",
			);
		});

		it("should handle long model names", () => {
			const longModelName =
				"very-long-model-name-with-many-characters-and-details";
			const result = computeDisplayName("openrouter", longModelName);
			expect(result).toBe(`openrouter:${longModelName}`);
		});

		it("should be consistent with colon separator", () => {
			// Test that the separator is always a single colon
			const result = computeDisplayName("openai", "gpt-4");
			expect(result).toMatch(/^[^:]+:[^:]+$/); // Should have exactly one colon
			expect(result.split(":").length).toBe(2);
		});
	});

	describe("integration scenarios", () => {
		it("should work together for complete model resolution workflow", () => {
			const apiKeys: ApiKeyConfiguration[] = [
				{
					id: "key-1",
					name: "Test Key",
					provider: "openai",
					apiKey: "sk-test123",
				},
			];

			const config: ModelConfiguration = {
				id: "model-1",
				name: "Custom Name", // This would be overridden in auto mode
				provider: "openai",
				modelName: "gpt-4",
				baseURL: "https://api.openai.com",
				enabled: true,
				apiKeyId: "key-1",
				useCustomDisplayName: false,
			};

			// Test API key resolution
			const resolvedKey = resolveApiKey(config, apiKeys);
			expect(resolvedKey).toBe("sk-test123");

			// Test display name computation (what would be auto-computed)
			const computedName = computeDisplayName(
				config.provider,
				config.modelName,
			);
			expect(computedName).toBe("openai:gpt-4");

			// Test API key masking
			const maskedKey = maskApiKey(resolvedKey!);
			expect(maskedKey).toBe("••••••••t123");

			// In practice, when useCustomDisplayName is false,
			// the UI would use computedName instead of config.name
		});

		it("should handle edge cases in combination", () => {
			const config: ModelConfiguration = {
				id: "model-1",
				name: "Test",
				provider: undefined,
				modelName: "",
				baseURL: "",
				enabled: true,
				// No apiKeyId
			};

			expect(resolveApiKey(config, [])).toBeUndefined();
			expect(computeDisplayName(config.provider, config.modelName)).toBe("");
			expect(maskApiKey("")).toBe("");
		});
	});
});
