import { HttpResponse, http } from "msw";

// Mock responses for different providers
const ollamaModelsResponse = {
	models: [
		{
			name: "llama2:7b",
			model: "llama2:7b",
			modified_at: new Date("2024-01-15T10:00:00.000Z"),
			size: 3825819519,
			digest:
				"sha256:8934d96d3f08982e95922b2b7a2c626a1fe873d7c3b06e8e56d7bc0a1fef9cd1",
			details: {
				parent_model: "",
				format: "gguf",
				family: "llama",
				families: ["llama"],
				parameter_size: "7B",
				quantization_level: "Q4_0",
			},
		},
		{
			name: "codellama:13b",
			model: "codellama:13b",
			modified_at: new Date("2024-01-10T15:30:00.000Z"),
			size: 7365960935,
			digest:
				"sha256:9f438cb9cd581fc025612d27f7c1a6669ff83a8bb0ed86c94fcf4c5440555697",
			details: {
				parent_model: "",
				format: "gguf",
				family: "llama",
				families: ["llama"],
				parameter_size: "13B",
				quantization_level: "Q4_0",
			},
		},
	],
};

const openaiModelsResponse = {
	object: "list",
	data: [
		{
			id: "gpt-3.5-turbo",
			object: "model",
			created: 1677610602,
			owned_by: "openai",
		},
		{
			id: "gpt-4",
			object: "model",
			created: 1678936860,
			owned_by: "openai",
		},
		{
			id: "gpt-4-turbo",
			object: "model",
			created: 1712361441,
			owned_by: "system",
		},
	],
};

const lmstudioModelsResponse = {
	object: "list",
	data: [
		{
			id: "lmstudio-community/meta-llama-3.1-8b-instruct",
			object: "model",
			created: 1677610602,
			owned_by: "lmstudio-community",
		},
		{
			id: "microsoft/DialoGPT-medium",
			object: "model",
			created: 1677610602,
			owned_by: "microsoft",
		},
	],
};

const openrouterModelsResponse = {
	data: [
		{
			id: "anthropic/claude-3-sonnet",
			name: "Claude 3 Sonnet",
			description: "Claude 3 Sonnet by Anthropic",
			pricing: {
				prompt: "0.000003",
				completion: "0.000015",
			},
			context_length: 200000,
			architecture: {
				modality: "text",
				tokenizer: "Claude",
				instruct_type: "none",
			},
			top_provider: {
				context_length: 200000,
				max_completion_tokens: 4096,
				is_moderated: false,
			},
			per_request_limits: {
				prompt_tokens: "131072",
				completion_tokens: "4096",
			},
		},
		{
			id: "openai/gpt-4",
			name: "GPT-4",
			description: "GPT-4 by OpenAI via OpenRouter",
			pricing: {
				prompt: "0.00003",
				completion: "0.00006",
			},
			context_length: 8192,
			architecture: {
				modality: "text",
				tokenizer: "GPT",
				instruct_type: "none",
			},
			top_provider: {
				context_length: 8192,
				max_completion_tokens: 4096,
				is_moderated: true,
			},
			per_request_limits: {
				prompt_tokens: "8192",
				completion_tokens: "4096",
			},
		},
	],
};

export const handlers = [
	// Ollama endpoints
	http.get("http://localhost:11434", () => {
		return HttpResponse.text("Ollama is running");
	}),

	http.get("http://localhost:11434/api/tags", () => {
		return HttpResponse.json(ollamaModelsResponse);
	}),

	// LM Studio endpoints
	http.get("http://localhost:1234/v1/models", () => {
		return HttpResponse.json(lmstudioModelsResponse);
	}),

	// OpenAI endpoints
	http.get("https://api.openai.com/v1/models", ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return HttpResponse.json(
				{ error: { message: "You must provide an API key." } },
				{ status: 401 },
			);
		}

		const apiKey = authHeader.substring(7);
		if (apiKey === "invalid-key") {
			return HttpResponse.json(
				{ error: { message: "Invalid API key provided." } },
				{ status: 401 },
			);
		}

		return HttpResponse.json(openaiModelsResponse);
	}),

	// OpenRouter endpoints
	http.get("https://openrouter.ai/api/v1/models", ({ request }) => {
		const authHeader = request.headers.get("Authorization");
		const refererHeader = request.headers.get("HTTP-Referer");
		const titleHeader = request.headers.get("X-Title");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return HttpResponse.json(
				{ error: { message: "You must provide an API key." } },
				{ status: 401 },
			);
		}

		if (!refererHeader || !titleHeader) {
			return HttpResponse.json(
				{ error: { message: "Missing required headers." } },
				{ status: 400 },
			);
		}

		const apiKey = authHeader.substring(7);
		if (apiKey === "invalid-key") {
			return HttpResponse.json(
				{ error: { message: "Invalid API key provided." } },
				{ status: 401 },
			);
		}

		return HttpResponse.json(openrouterModelsResponse);
	}),

	// Error scenarios
	http.get("http://localhost:11434/api/tags", ({ request }) => {
		const url = new URL(request.url);
		if (url.searchParams.get("error") === "true") {
			return HttpResponse.json(
				{ error: "Internal server error" },
				{ status: 500 },
			);
		}
		return HttpResponse.json(ollamaModelsResponse);
	}),

	// Network error scenarios - simulate network failures
	http.get("http://localhost:9999/api/tags", () => {
		return Response.error();
	}),

	http.get("http://localhost:9999/v1/models", () => {
		return Response.error();
	}),

	http.get("http://localhost:9999", () => {
		return Response.error();
	}),
];
