import { generateText, type ModelMessage } from "ai";
import type { CurrentProviderType } from "../types/llm-types.ts";
import { providers, type ProviderConfig } from "./providers/providers.ts";
export async function inference({
	messages,
	currentProviderName,
	currentModelName,
	baseURL,
}: {
	messages: ModelMessage[];
	currentProviderName: CurrentProviderType;
	currentModelName: string;
	baseURL: string;
}): Promise<string> {
	let responseText = "";
	try {
		if (!messages || messages.length === 0) {
			throw new Error("No messages provided");
		}
	} catch (error) {
		console.error("Error in inference function:", error);
		throw error;
	}

	const providerGenerator: ProviderConfig | undefined =
		providers[currentProviderName as keyof typeof providers];
	if (!providerGenerator) {
		throw new Error(`Provider ${currentProviderName} not found`);
	}

	// Here you can add additional checks to see if the model exists in the provider
	// For simplicity, we assume the model exists

	// Call the generateText function from the AI library

	const provider = providerGenerator.createProvider(baseURL);
	try {
		const { text } = await generateText({
			model: provider(currentModelName),
			messages,
		});
		responseText = text;
	} catch (error) {
		console.error("Error generating text:", error);

		responseText = "Error generating text from the model.";
	}

	return responseText;
}
