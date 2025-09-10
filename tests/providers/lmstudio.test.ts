import { describe, it, expect } from "vitest";
import { server } from "../mocks/server.ts";
import { http, HttpResponse } from "msw";
import * as lmstudio from "../../src/llm/providers/lmstudio.ts";

describe("LM Studio Provider", () => {
	describe("isProviderAlive", () => {
		it("should return true when LM Studio is running", async () => {
			const result = await lmstudio.isProviderAlive("http://localhost:1234");
			expect(result).toBe(true);
		});

		it("should return false when LM Studio is not available", async () => {
			const result = await lmstudio.isProviderAlive("http://localhost:9999");
			expect(result).toBe(false);
		});

		it("should use default baseURL when not provided", async () => {
			const result = await lmstudio.isProviderAlive();
			expect(result).toBe(true);
		});
	});

	describe("listModels", () => {
		it("should return list of model IDs", async () => {
			const models = await lmstudio.listModels("http://localhost:1234");

			expect(models).toEqual([
				"lmstudio-community/meta-llama-3.1-8b-instruct",
				"microsoft/DialoGPT-medium",
			]);
		});

		it("should return empty array on server error", async () => {
			server.use(
				http.get("http://localhost:1234/v1/models", () => {
					return HttpResponse.json(
						{ error: "Internal server error" },
						{ status: 500 },
					);
				}),
			);

			const models = await lmstudio.listModels("http://localhost:1234");
			expect(models).toEqual([]);
		});

		it("should return empty array on network error", async () => {
			const models = await lmstudio.listModels("http://localhost:9999");
			expect(models).toEqual([]);
		});

		it("should use default baseURL when not provided", async () => {
			const models = await lmstudio.listModels();
			expect(models).toEqual([
				"lmstudio-community/meta-llama-3.1-8b-instruct",
				"microsoft/DialoGPT-medium",
			]);
		});

		it("should handle malformed response gracefully", async () => {
			server.use(
				http.get("http://localhost:1234/v1/models", () => {
					return HttpResponse.json({ invalid: "response" });
				}),
			);

			const models = await lmstudio.listModels("http://localhost:1234");
			expect(models).toEqual([]);
		});

		it("should handle response with empty data array", async () => {
			server.use(
				http.get("http://localhost:1234/v1/models", () => {
					return HttpResponse.json({
						object: "list",
						data: [],
					});
				}),
			);

			const models = await lmstudio.listModels("http://localhost:1234");
			expect(models).toEqual([]);
		});
	});

	describe("createProvider", () => {
		it("should create provider with default baseURL", () => {
			const provider = lmstudio.createProvider();
			expect(provider).toBeDefined();
		});

		it("should create provider with custom baseURL", () => {
			const provider = lmstudio.createProvider("http://custom:1234");
			expect(provider).toBeDefined();
		});

		it("should have correct provider name", () => {
			expect(lmstudio.providerName).toBe("lmstudio");
		});
	});
});
