import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const providerName = "google" as const;

interface GeminiModel {
    name: string;
    supportedGenerationMethods: string[];
}

interface GeminiModelsResponse {
    models: GeminiModel[];
}

export function createProvider(apiKey: string, baseURL?: string) {
    const google = createGoogleGenerativeAI({
        apiKey,
        // Defaults to Google v1beta API address
        baseURL: baseURL || "https://generativelanguage.googleapis.com/v1beta",
    });

    return google;
}

export async function isProviderAlive(
    apiKey: string,
    baseURL: string = "https://generativelanguage.googleapis.com/v1beta",
) {
    try {
        // Google passes the API key as a query parameter (?key=...)
        const response = await fetch(`${baseURL}/models?key=${apiKey}`);
        return response.ok && response.status === 200;
    } catch (error) {
        console.error("Error checking Google availability:", error);
        return false;
    }
}

export async function listModels(
    apiKey: string,
    baseURL: string = "https://generativelanguage.googleapis.com/v1beta",
): Promise<string[]> {
    try {
        // Remove trailing slash if present
        const cleanBaseURL = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
        const response = await fetch(`${cleanBaseURL}/models?key=${apiKey}`);

        if (!response.ok) {
            throw new Error(`Error fetching models: ${response.statusText}`);
        }

        const data = (await response.json()) as GeminiModelsResponse;

        // 1. Filter for models that support 'generateContent' (response generation)
        // 2. Remove the 'models/' prefix from the model name (e.g., 'models/gemini-3-flash-preview-> 'gemini-3-flash-preview')
        console.log(data.models)
        return data.models
            .filter((model) =>
                model.supportedGenerationMethods.includes("generateContent"),
            )
            .map((model) => model.name.replace(/^models\//, ""))
            .sort();
    } catch (error) {
        console.error("Error fetching Google models:", error);
        return [];
    }
}