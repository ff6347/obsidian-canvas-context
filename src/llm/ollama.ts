import { createOllama } from "ollama-ai-provider-v2";

const ollama = createOllama({
	name: "ollama",
	baseURL: "http://localhost:11434/api/v1",
});
