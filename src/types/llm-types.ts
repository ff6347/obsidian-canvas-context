import { providerName as ollama } from "../llm/providers/ollama.ts";
import { providerName as lmstudio } from "../llm/providers/lmstudio.ts";
import { providerName as openai } from "../llm/providers/openai.ts";
export type CurrentProviderType =
	| typeof ollama
	| typeof lmstudio
	| typeof openai
	| "";
