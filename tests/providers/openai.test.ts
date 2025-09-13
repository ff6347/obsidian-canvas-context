import { describe, expect, it } from "vitest";
import { server } from "../mocks/server.ts";
import { HttpResponse, http } from "msw";
import * as openai from "../../src/llm/providers/openai.ts";

describe("OpenAI Provider", () => {
	const validApiKey = "sk-test-valid-key";
	const invalidApiKey = "invalid-key";

	describe("isProviderAlive", () => {
		it("should return true with valid API key", async () => {
			const result = await openai.isProviderAlive(
				validApiKey,
				"https://api.openai.com",
			);
			expect(result).toBe(true);
		});

		it("should return false with invalid API key", async () => {
			const result = await openai.isProviderAlive(
				invalidApiKey,
				"https://api.openai.com",
			);
			expect(result).toBe(false);
		});

		it("should return false on network error", async () => {
			const result = await openai.isProviderAlive(
				validApiKey,
				"https://nonexistent-api.com",
			);
			expect(result).toBe(false);
		});

		it("should use default baseURL when not provided", async () => {
			const result = await openai.isProviderAlive(validApiKey);
			expect(result).toBe(true);
		});

		it("should return false without API key", async () => {
			const result = await openai.isProviderAlive("", "https://api.openai.com");
			expect(result).toBe(false);
		});
	});

	describe("listModels", () => {
		it("should return sorted list of model IDs with valid API key", async () => {
			const models = await openai.listModels(
				validApiKey,
				"https://api.openai.com",
			);

			expect(models).toEqual(["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]);
		});

		it("should return empty array with invalid API key", async () => {
			const models = await openai.listModels(
				invalidApiKey,
				"https://api.openai.com",
			);
			expect(models).toEqual([]);
		});

		it("should return empty array on network error", async () => {
			const models = await openai.listModels(
				validApiKey,
				"https://nonexistent-api.com",
			);
			expect(models).toEqual([]);
		});

		it("should return empty array on server error", async () => {
			server.use(
				http.get("https://api.openai.com/v1/models", () => {
					return HttpResponse.json(
						{ error: { message: "Internal server error" } },
						{ status: 500 },
					);
				}),
			);

			const models = await openai.listModels(
				validApiKey,
				"https://api.openai.com",
			);
			expect(models).toEqual([]);
		});

		it("should use default baseURL when not provided", async () => {
			const models = await openai.listModels(validApiKey);
			expect(models).toEqual(["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]);
		});

		it("should handle malformed response gracefully", async () => {
			server.use(
				http.get("https://api.openai.com/v1/models", () => {
					return HttpResponse.json({ invalid: "response" });
				}),
			);

			const models = await openai.listModels(
				validApiKey,
				"https://api.openai.com",
			);
			expect(models).toEqual([]);
		});

		it("should handle response with empty data array", async () => {
			server.use(
				http.get("https://api.openai.com/v1/models", () => {
					return HttpResponse.json({
						object: "list",
						data: [],
					});
				}),
			);

			const models = await openai.listModels(
				validApiKey,
				"https://api.openai.com",
			);
			expect(models).toEqual([]);
		});

		it("should return empty array without API key", async () => {
			const models = await openai.listModels("", "https://api.openai.com");
			expect(models).toEqual([]);
		});
	});

	describe("createProvider", () => {
		it("should create provider with API key and default baseURL", () => {
			const provider = openai.createProvider(validApiKey);
			expect(provider).toBeDefined();
		});

		it("should create provider with custom baseURL", () => {
			const provider = openai.createProvider(
				validApiKey,
				"https://custom-api.com",
			);
			expect(provider).toBeDefined();
		});

		it("should have correct provider name", () => {
			expect(openai.providerName).toBe("openai");
		});
	});
});
