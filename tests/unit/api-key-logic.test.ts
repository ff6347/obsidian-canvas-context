import { describe, expect, it } from "vitest";
import {
	createApiKeySettingConfig,
	findModelsUsingApiKey,
	formatApiKeyDescription,
	generateDeletionErrorMessage,
	generateDeletionSuccessMessage,
	validateApiKeyDeletion,
} from "../../src/lib/api-key-logic.ts";
import type {
	ApiKeyConfiguration,
	ModelConfiguration,
} from "../../src/types/settings-types.ts";

describe("api-key-logic", () => {
	const sampleApiKey: ApiKeyConfiguration = {
		id: "key1",
		name: "Personal OpenAI",
		provider: "openai",
		apiKey: "sk-1234567890abcdef",
		description: "Personal development key",
	};

	const sampleApiKeyWithoutDescription: ApiKeyConfiguration = {
		id: "key2",
		name: "Work Account",
		provider: "openrouter",
		apiKey: "or-key-123",
	};

	const sampleModels: ModelConfiguration[] = [
		{
			id: "model1",
			name: "GPT-4",
			provider: "openai",
			modelName: "gpt-4",
			baseURL: "https://api.openai.com/v1",
			enabled: true,
			apiKeyId: "key1",
		},
		{
			id: "model2",
			name: "OpenRouter Model",
			provider: "openrouter",
			modelName: "anthropic/claude-3-sonnet",
			baseURL: "https://openrouter.ai/api/v1",
			enabled: true,
			apiKeyId: "key2",
		},
		{
			id: "model3",
			name: "Local Model",
			provider: "ollama",
			modelName: "llama2",
			baseURL: "http://localhost:11434",
			enabled: true,
		},
	];

	describe("validateApiKeyDeletion", () => {
		it("allows deletion when no models use the API key", () => {
			const unusedKey = { ...sampleApiKey, id: "unused-key" };
			const result = validateApiKeyDeletion(unusedKey, sampleModels);

			expect(result.canDelete).toBe(true);
			expect(result.dependentModels).toBeUndefined();
			expect(result.errorMessage).toBeUndefined();
		});

		it("prevents deletion when models depend on API key", () => {
			const result = validateApiKeyDeletion(sampleApiKey, sampleModels);

			expect(result.canDelete).toBe(false);
			expect(result.dependentModels).toEqual(["GPT-4"]);
			expect(result.errorMessage).toBe(
				'Cannot delete API key "Personal OpenAI". It\'s being used by: GPT-4',
			);
		});

		it("prevents deletion when multiple models depend on API key", () => {
			const modelsWithDuplicateKey = [
				...sampleModels,
				{
					id: "model4",
					name: "GPT-3.5",
					provider: "openai",
					modelName: "gpt-3.5-turbo",
					baseURL: "https://api.openai.com/v1",
					enabled: true,
					apiKeyId: "key1",
				},
			] as ModelConfiguration[];

			const result = validateApiKeyDeletion(
				sampleApiKey,
				modelsWithDuplicateKey,
			);

			expect(result.canDelete).toBe(false);
			expect(result.dependentModels).toEqual(["GPT-4", "GPT-3.5"]);
			expect(result.errorMessage).toBe(
				'Cannot delete API key "Personal OpenAI". It\'s being used by: GPT-4, GPT-3.5',
			);
		});

		it("allows deletion when models have undefined apiKeyId", () => {
			const modelsWithoutApiKey = [
				{
					id: "model1",
					name: "Local Model",
					provider: "ollama",
					modelName: "llama2",
					baseURL: "http://localhost:11434",
					enabled: true,
				},
			] as ModelConfiguration[];

			const result = validateApiKeyDeletion(sampleApiKey, modelsWithoutApiKey);

			expect(result.canDelete).toBe(true);
		});
	});

	describe("findModelsUsingApiKey", () => {
		it("returns models that use the specified API key", () => {
			const result = findModelsUsingApiKey("key1", sampleModels);

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe("GPT-4");
			expect(result[0]!.apiKeyId).toBe("key1");
		});

		it("returns empty array when no models use the API key", () => {
			const result = findModelsUsingApiKey("nonexistent-key", sampleModels);

			expect(result).toHaveLength(0);
		});

		it("returns multiple models when they share the same API key", () => {
			const modelsWithSharedKey = [
				...sampleModels,
				{
					id: "model4",
					name: "GPT-3.5",
					provider: "openai",
					modelName: "gpt-3.5-turbo",
					baseURL: "https://api.openai.com/v1",
					enabled: true,
					apiKeyId: "key1",
				},
			] as ModelConfiguration[];

			const result = findModelsUsingApiKey("key1", modelsWithSharedKey);

			expect(result).toHaveLength(2);
			expect(result.map((m) => m.name)).toEqual(["GPT-4", "GPT-3.5"]);
		});

		it("ignores models with undefined apiKeyId", () => {
			const result = findModelsUsingApiKey("key1", [
				{
					id: "model1",
					name: "Local Model",
					provider: "ollama",
					modelName: "llama2",
					baseURL: "http://localhost:11434",
					enabled: true,
				},
			] as ModelConfiguration[]);

			expect(result).toHaveLength(0);
		});
	});

	describe("createApiKeySettingConfig", () => {
		it("creates complete setting configuration with description", () => {
			const maskedKey = "sk-****...cdef";
			const result = createApiKeySettingConfig(sampleApiKey, maskedKey);

			expect(result.name).toBe("Personal OpenAI");
			expect(result.descriptionLines).toHaveLength(3);
			expect(result.descriptionLines[0]).toEqual({
				text: "Provider: openai",
				type: "provider",
			});
			expect(result.descriptionLines[1]).toEqual({
				text: "API Key: sk-****...cdef",
				type: "apiKey",
			});
			expect(result.descriptionLines[2]).toEqual({
				text: "Description: Personal development key",
				type: "description",
			});
			expect(result.editButtonConfig).toEqual({
				text: "Edit",
				tooltip: "Edit API key",
			});
			expect(result.deleteButtonConfig).toEqual({
				text: "Delete",
				tooltip: "Delete API key",
				isWarning: true,
			});
		});

		it("creates setting configuration without description", () => {
			const maskedKey = "or-****...123";
			const result = createApiKeySettingConfig(
				sampleApiKeyWithoutDescription,
				maskedKey,
			);

			expect(result.name).toBe("Work Account");
			expect(result.descriptionLines).toHaveLength(2);
			expect(result.descriptionLines[0]).toEqual({
				text: "Provider: openrouter",
				type: "provider",
			});
			expect(result.descriptionLines[1]).toEqual({
				text: "API Key: or-****...123",
				type: "apiKey",
			});
		});
	});

	describe("formatApiKeyDescription", () => {
		it("formats description with all fields", () => {
			const maskedKey = "sk-****...cdef";
			const result = formatApiKeyDescription(sampleApiKey, maskedKey);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual({
				text: "Provider: openai",
				type: "provider",
			});
			expect(result[1]).toEqual({
				text: "API Key: sk-****...cdef",
				type: "apiKey",
			});
			expect(result[2]).toEqual({
				text: "Description: Personal development key",
				type: "description",
			});
		});

		it("formats description without optional description field", () => {
			const maskedKey = "or-****...123";
			const result = formatApiKeyDescription(
				sampleApiKeyWithoutDescription,
				maskedKey,
			);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				text: "Provider: openrouter",
				type: "provider",
			});
			expect(result[1]).toEqual({
				text: "API Key: or-****...123",
				type: "apiKey",
			});
		});

		it("handles undefined provider gracefully", () => {
			const keyWithUndefinedProvider = {
				...sampleApiKey,
				provider: undefined,
			};
			const maskedKey = "sk-****...cdef";
			const result = formatApiKeyDescription(
				keyWithUndefinedProvider,
				maskedKey,
			);

			expect(result[0]).toEqual({
				text: "Provider: undefined",
				type: "provider",
			});
		});
	});

	describe("generateDeletionErrorMessage", () => {
		it("generates error message for single model", () => {
			const result = generateDeletionErrorMessage("Personal OpenAI", ["GPT-4"]);

			expect(result).toBe(
				'Cannot delete API key "Personal OpenAI". It\'s being used by: GPT-4',
			);
		});

		it("generates error message for multiple models", () => {
			const result = generateDeletionErrorMessage("Personal OpenAI", [
				"GPT-4",
				"GPT-3.5",
			]);

			expect(result).toBe(
				'Cannot delete API key "Personal OpenAI". It\'s being used by: GPT-4, GPT-3.5',
			);
		});

		it("handles special characters in names", () => {
			const result = generateDeletionErrorMessage('API Key "Special"', [
				"Model with spaces",
			]);

			expect(result).toBe(
				'Cannot delete API key "API Key "Special"". It\'s being used by: Model with spaces',
			);
		});
	});

	describe("generateDeletionSuccessMessage", () => {
		it("returns standard success message", () => {
			const result = generateDeletionSuccessMessage();

			expect(result).toBe("API key deleted.");
		});
	});
});
