import { providerName as ollama } from "../llm/providers/ollama.ts";
import { providerName as lmstudio } from "../llm/providers/lmstudio.ts";
import { providerName as openai } from "../llm/providers/openai.ts";
import { providerName as openrouter } from "../llm/providers/openrouter.ts";
import { providers } from "../llm/providers/providers.ts";

export type CurrentProviderType =
	| typeof ollama
	| typeof lmstudio
	| typeof openai
	| typeof openrouter;

type ProvidersType = typeof providers;
type ProviderKey = keyof ProvidersType;
export type ProviderConfig = ProvidersType[ProviderKey];
