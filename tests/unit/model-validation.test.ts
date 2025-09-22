/* oxlint-disable eslint/max-lines-per-function */

import { describe, expect, it } from "vitest";
import {
	canLoadModels,
	getProvidersRequiringApiKeys,
	providerRequiresApiKey,
	validateApiKeyRequirements,
	validateModelConfiguration,
	validateRequiredFields,
} from "../../src/lib/model-validation.ts";
import type { ModelConfiguration } from "src/types/settings-types.ts";

/**
 * Pure unit tests for model validation logic
 * Zero mocks, zero Obsidian dependencies, fast execution
 */

describe("validateRequiredFields", () => {
	it("should validate complete configuration", () => {
		const config: Partial<ModelConfiguration> = {
			name: "Test Model",
			provider: "ollama",
			modelName: "llama2",
			baseURL: "http://localhost:11434",
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(true);
		expect(result.missingFields).toBeUndefined();
	});

	it("should identify missing name field", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "ollama",
			modelName: "llama2",
			baseURL: "http://localhost:11434",
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual(["name"]);
	});

	it("should identify missing provider field", () => {
		const config: Partial<ModelConfiguration> = {
			name: "Test Model",
			modelName: "llama2",
			baseURL: "http://localhost:11434",
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual(["provider"]);
	});

	it("should identify missing modelName field", () => {
		const config: Partial<ModelConfiguration> = {
			name: "Test Model",
			provider: "ollama",
			baseURL: "http://localhost:11434",
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual(["modelName"]);
	});

	it("should identify missing baseURL field", () => {
		const config: Partial<ModelConfiguration> = {
			name: "Test Model",
			provider: "ollama",
			modelName: "llama2",
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual(["baseURL"]);
	});

	it("should identify multiple missing fields", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "ollama",
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual(["name", "modelName", "baseURL"]);
	});

	it("should handle empty configuration", () => {
		const config: Partial<ModelConfiguration> = {};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual([
			"name",
			"provider",
			"modelName",
			"baseURL",
		]);
	});

	it("should handle empty string values as missing", () => {
		const config: Partial<ModelConfiguration> = {
			name: "",
			provider: "ollama",
			modelName: "",
			baseURL: "",
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual(["name", "modelName", "baseURL"]);
	});
});

describe("validateApiKeyRequirements", () => {
	it("should validate OpenAI with API key", () => {
		const result = validateApiKeyRequirements("openai", true);
		expect(result.isValid).toBe(true);
		expect(result.errors).toBeUndefined();
	});

	it("should validate OpenRouter with API key", () => {
		const result = validateApiKeyRequirements("openrouter", true);
		expect(result.isValid).toBe(true);
		expect(result.errors).toBeUndefined();
	});

	it("should validate Ollama without API key", () => {
		const result = validateApiKeyRequirements("ollama", false);
		expect(result.isValid).toBe(true);
		expect(result.errors).toBeUndefined();
	});

	it("should validate LM Studio without API key", () => {
		const result = validateApiKeyRequirements("lmstudio", false);
		expect(result.isValid).toBe(true);
		expect(result.errors).toBeUndefined();
	});

	it("should reject OpenAI without API key", () => {
		const result = validateApiKeyRequirements("openai", false);
		expect(result.isValid).toBe(false);
		expect(result.errors).toEqual(["API Key is required for openai provider"]);
	});

	it("should reject OpenRouter without API key", () => {
		const result = validateApiKeyRequirements("openrouter", false);
		expect(result.isValid).toBe(false);
		expect(result.errors).toEqual([
			"API Key is required for openrouter provider",
		]);
	});

	it("should handle undefined provider", () => {
		const result = validateApiKeyRequirements(undefined, false);
		expect(result.isValid).toBe(true);
		expect(result.errors).toBeUndefined();
	});
});

describe("canLoadModels", () => {
	it("should allow Ollama with complete config", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "ollama",
			baseURL: "http://localhost:11434",
		};

		const result = canLoadModels(config, false);
		expect(result).toBe(true);
	});

	it("should allow LM Studio with complete config", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "lmstudio",
			baseURL: "http://localhost:1234",
		};

		const result = canLoadModels(config, false);
		expect(result).toBe(true);
	});

	it("should allow OpenAI with API key", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "openai",
			baseURL: "https://api.openai.com",
		};

		const result = canLoadModels(config, true);
		expect(result).toBe(true);
	});

	it("should allow OpenRouter with API key", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "openrouter",
			baseURL: "https://openrouter.ai/api/v1",
		};

		const result = canLoadModels(config, true);
		expect(result).toBe(true);
	});

	it("should reject OpenAI without API key", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "openai",
			baseURL: "https://api.openai.com",
		};

		const result = canLoadModels(config, false);
		expect(result).toBe(false);
	});

	it("should reject OpenRouter without API key", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "openrouter",
			baseURL: "https://openrouter.ai/api/v1",
		};

		const result = canLoadModels(config, false);
		expect(result).toBe(false);
	});

	it("should reject missing provider", () => {
		const config: Partial<ModelConfiguration> = {
			baseURL: "http://localhost:11434",
		};

		const result = canLoadModels(config, false);
		expect(result).toBe(false);
	});

	it("should reject missing baseURL", () => {
		const config: Partial<ModelConfiguration> = {
			provider: "ollama",
		};

		const result = canLoadModels(config, false);
		expect(result).toBe(false);
	});
});

describe("validateModelConfiguration", () => {
	it("should validate complete Ollama configuration", () => {
		const config: Partial<ModelConfiguration> = {
			name: "Local Llama",
			provider: "ollama",
			modelName: "llama2",
			baseURL: "http://localhost:11434",
		};

		const result = validateModelConfiguration(config, false);
		expect(result.isValid).toBe(true);
	});

	it("should validate complete OpenAI configuration with API key", () => {
		const config: Partial<ModelConfiguration> = {
			name: "GPT-4",
			provider: "openai",
			modelName: "gpt-4",
			baseURL: "https://api.openai.com",
		};

		const result = validateModelConfiguration(config, true);
		expect(result.isValid).toBe(true);
	});

	it("should reject incomplete configuration", () => {
		const config: Partial<ModelConfiguration> = {
			name: "Incomplete",
			provider: "ollama",
		};

		const result = validateModelConfiguration(config, false);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual(["modelName", "baseURL"]);
	});

	it("should reject OpenAI without API key", () => {
		const config: Partial<ModelConfiguration> = {
			name: "GPT-4",
			provider: "openai",
			modelName: "gpt-4",
			baseURL: "https://api.openai.com",
		};

		const result = validateModelConfiguration(config, false);
		expect(result.isValid).toBe(false);
		expect(result.errors).toEqual(["API Key is required for openai provider"]);
	});
});

describe("getProvidersRequiringApiKeys", () => {
	it("should return correct list of providers requiring API keys", () => {
		const providers = getProvidersRequiringApiKeys();
		expect(providers).toEqual(["openai", "openrouter"]);
	});

	it("should return consistent results", () => {
		const first = getProvidersRequiringApiKeys();
		const second = getProvidersRequiringApiKeys();
		expect(first).toEqual(second);
	});
});

describe("providerRequiresApiKey", () => {
	it("should return true for OpenAI", () => {
		expect(providerRequiresApiKey("openai")).toBe(true);
	});

	it("should return true for OpenRouter", () => {
		expect(providerRequiresApiKey("openrouter")).toBe(true);
	});

	it("should return false for Ollama", () => {
		expect(providerRequiresApiKey("ollama")).toBe(false);
	});

	it("should return false for LM Studio", () => {
		expect(providerRequiresApiKey("lmstudio")).toBe(false);
	});

	it("should return false for undefined", () => {
		expect(providerRequiresApiKey(undefined)).toBe(false);
	});
});

describe("edge cases and error conditions", () => {
	it("should handle null values in configuration", () => {
		const config = {
			name: null as any,
			provider: null as any,
			modelName: null as any,
			baseURL: null as any,
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(false);
		expect(result.missingFields).toEqual([
			"name",
			"provider",
			"modelName",
			"baseURL",
		]);
	});

	it("should handle whitespace-only values", () => {
		const config: Partial<ModelConfiguration> = {
			name: "   ",
			provider: "ollama",
			modelName: "\t",
			baseURL: "\n",
		};

		// Note: Current implementation treats whitespace as truthy
		// This test documents current behavior
		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(true);
	});

	it("should handle very long field values", () => {
		const longString = "a".repeat(1000);
		const config: Partial<ModelConfiguration> = {
			name: longString,
			provider: "ollama",
			modelName: longString,
			baseURL: longString,
		};

		const result = validateRequiredFields(config);
		expect(result.isValid).toBe(true);
	});
});
