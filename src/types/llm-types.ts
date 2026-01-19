import { providerName as ollama } from "../llm/providers/ollama.ts";
import { providerName as lmstudio } from "../llm/providers/lmstudio.ts";
import { providerName as openai } from "../llm/providers/openai.ts";
import { providerName as openrouter } from "../llm/providers/openrouter.ts";
import { providerName as google } from "../llm/providers/google.ts";
export type CurrentProviderType =
	| typeof ollama
	| typeof lmstudio
	| typeof openai
	| typeof openrouter
	| typeof google;
