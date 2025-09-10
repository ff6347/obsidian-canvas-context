import { describe, it, expect } from "vitest";
import { server } from "../mocks/server.ts";
import { http, HttpResponse } from "msw";
import * as ollama from "../../src/llm/providers/ollama.ts";

describe("Ollama Provider", () => {
	describe("isProviderAlive", () => {
		it("should return true when Ollama is running", async () => {
			const result = await ollama.isProviderAlive("http://localhost:11434");
			expect(result).toBe(true);
		});

		it("should return false when Ollama is not available", async () => {
			// Test with an unhandled URL that MSW will not intercept
			// This simulates a real network failure
			const result = await ollama.isProviderAlive("http://localhost:9999");
			expect(result).toBe(false);
		});

		it("should use default baseURL when not provided", async () => {
			const result = await ollama.isProviderAlive();
			expect(result).toBe(true);
		});
	});

	describe("listModels", () => {
		it("should return list of model names", async () => {
			const models = await ollama.listModels("http://localhost:11434");

			expect(models).toEqual(["llama2:7b", "codellama:13b"]);
		});

		it("should return empty array on error", async () => {
			// Mock server error
			server.use(
				http.get("http://localhost:11434/api/tags", () => {
					return HttpResponse.json(
						{ error: "Internal server error" },
						{ status: 500 },
					);
				}),
			);

			const models = await ollama.listModels("http://localhost:11434");
			expect(models).toEqual([]);
		});

		it("should return empty array on network error", async () => {
			const models = await ollama.listModels("http://localhost:9999");
			expect(models).toEqual([]);
		});

		it("should use default baseURL when not provided", async () => {
			const models = await ollama.listModels();
			expect(models).toEqual(["llama2:7b", "codellama:13b"]);
		});

		it("should handle malformed response gracefully", async () => {
			server.use(
				http.get("http://localhost:11434/api/tags", () => {
					return HttpResponse.json({ invalid: "response" });
				}),
			);

			const models = await ollama.listModels("http://localhost:11434");
			expect(models).toEqual([]);
		});
	});

	describe("createProvider", () => {
		it("should create provider with default baseURL", () => {
			const provider = ollama.createProvider();
			expect(provider).toBeDefined();
		});

		it("should create provider with custom baseURL", () => {
			const provider = ollama.createProvider("http://custom:11434");
			expect(provider).toBeDefined();
		});

		it("should have correct provider name", () => {
			expect(ollama.providerName).toBe("ollama");
		});
	});
});
