import { generateText, type ModelMessage } from "ai";
import { lmstudio } from "./lmstudio.ts";
const MODEL_NAME = "openai/gpt-oss-20b";

export async function inference(messages: ModelMessage[]): Promise<string> {
	let responseText = "";
	try {
		if (!messages || messages.length === 0) {
			throw new Error("No messages provided");
		}
	} catch (error) {
		console.error("Error in inference function:", error);
		throw error;
	}

	try {
		const { text } = await generateText({
			model: lmstudio(MODEL_NAME),
			messages,
		});
		responseText = text;
	} catch (error) {
		console.error("Error generating text:", error);

		responseText = "Error generating text from the model.";
	}

	return responseText;
}
