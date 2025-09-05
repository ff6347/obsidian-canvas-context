import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// should have end endpoint to get all the availalbe models
// should have an endpoint to get the details of a model
export const lmstudio = createOpenAICompatible({
	name: "lmstudio",
	baseURL: "http://localhost:1234/v1",
});
