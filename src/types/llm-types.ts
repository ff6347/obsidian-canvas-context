import { providerName as ollama } from "../llm/providers/ollama.ts";
import { providerName as lmstudio } from "../llm/providers/lmstudio.ts";
export type CurrentProviderType = typeof ollama | typeof lmstudio | "";
