import { generateText, type ModelMessage } from "ai";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { providers, type ProviderConfig } from "./providers/providers.ts";
export interface InferenceResult {
	success: boolean;
	text: string;
	error?: string;
	errorType?: "connection" | "model" | "provider" | "unknown";
}

export async function inference({
	messages,
	currentProviderName,
	currentModelName,
	baseURL,
	apiKey,
}: {
	messages: ModelMessage[];
	currentProviderName: CurrentProviderType;
	currentModelName: string;
	baseURL: string;
	apiKey?: string;
}): Promise<InferenceResult> {
	try {
		if (!messages || messages.length === 0) {
			return {
				success: false,
				text: "",
				error: "No messages provided for inference",
				errorType: "unknown",
			};
		}
	} catch (error) {
		console.error("Error in inference function:", error);
		return {
			success: false,
			text: "",
			error: `Invalid input: ${error instanceof Error ? error.message : "Unknown error"}`,
			errorType: "unknown",
		};
	}

	const providerGenerator: ProviderConfig | undefined =
		providers[currentProviderName as keyof typeof providers];
	if (!providerGenerator) {
		return {
			success: false,
			text: "",
			error: `Provider '${currentProviderName}' not found`,
			errorType: "provider",
		};
	}

	// For OpenAI and OpenRouter, pass the API key as the first parameter
	const provider =
		(currentProviderName === "openai" ||
			currentProviderName === "openrouter") &&
		apiKey
			? providerGenerator.createProvider(apiKey, baseURL)
			: providerGenerator.createProvider(baseURL);
	try {
		const { text } = await generateText({
			model: provider(currentModelName),
			messages,
		});
		return {
			success: true,
			text: text,
		};
	} catch (error) {
		console.error("Error generating text:", error);

		// Determine error type based on error content
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		let errorType: InferenceResult["errorType"] = "unknown";

		if (
			errorMessage.includes("connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("network")
		) {
			errorType = "connection";
		} else if (
			errorMessage.includes("model") ||
			errorMessage.includes("not found")
		) {
			errorType = "model";
		}

		return {
			success: false,
			text: "",
			error: `Failed to generate response: ${errorMessage}`,
			errorType: errorType,
		};
	}
}
