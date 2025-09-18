import type {
	ApiKeyConfiguration,
	CanvasContextSettings,
	ModelConfiguration,
} from "../../src/ui/settings.ts";
import type {
	CanvasData,
	CanvasNodeData,
	CanvasTextData,
	InferenceContext,
} from "../../src/types/canvas-types.ts";
import type { CurrentProviderType } from "../../src/types/llm-types.ts";

/**
 * Factory functions for generating consistent test data across all test files.
 * These factories provide sensible defaults with the ability to override specific properties.
 */

let idCounter = 1;

/**
 * Generate a unique test ID for consistent test data creation
 */
export const generateTestId = (prefix = "test"): string => `${prefix}-${idCounter++}`;

/**
 * Reset the ID counter for test isolation
 */
export const resetTestIds = (): void => {
	idCounter = 1;
};

/**
 * Create a mock ModelConfiguration with sensible defaults
 */
export const createMockModelConfiguration = (
	overrides?: Partial<ModelConfiguration>,
): ModelConfiguration => ({
	id: generateTestId("model"),
	name: "Test Model",
	provider: "ollama",
	modelName: "llama3.1",
	baseURL: "http://localhost:11434",
	enabled: true,
	useCustomDisplayName: false,
	...overrides,
});

/**
 * Create a mock ApiKeyConfiguration with sensible defaults
 */
export const createMockApiKeyConfiguration = (
	overrides?: Partial<ApiKeyConfiguration>,
): ApiKeyConfiguration => ({
	id: generateTestId("key"),
	name: "Test API Key",
	provider: "openai",
	apiKey: "sk-test-1234567890abcdef",
	description: "Test API key for unit tests",
	...overrides,
});

/**
 * Create mock canvas node data
 */
export const createMockCanvasNode = (
	overrides?: Partial<CanvasNodeData>,
): CanvasNodeData => ({
	id: generateTestId("node"),
	type: "text",
	x: 0,
	y: 0,
	width: 200,
	height: 100,
	...overrides,
});

/**
 * Create mock canvas text node data
 */
export const createMockCanvasTextNode = (
	overrides?: Partial<CanvasTextData>,
): CanvasTextData => ({
	...createMockCanvasNode({ type: "text" }),
	text: "---\nrole: user\n---\nTest content",
	...overrides,
});

/**
 * Create mock canvas edge data
 */
export const createMockCanvasEdge = (overrides?: {
	id?: string;
	fromNode?: string;
	toNode?: string;
	fromSide?: string;
	toSide?: string;
}) => ({
	id: generateTestId("edge"),
	fromNode: generateTestId("node"),
	toNode: generateTestId("node"),
	fromSide: "bottom",
	toSide: "top",
	...overrides,
});

/**
 * Create complete mock canvas data structure
 */
export const createMockCanvasData = (overrides?: {
	nodes?: CanvasNodeData[];
	edges?: ReturnType<typeof createMockCanvasEdge>[];
}): CanvasData => {
	const node1 = createMockCanvasNode({ id: "node1", type: "file" });
	const node2 = createMockCanvasTextNode({ id: "node2", x: 0, y: 200 });

	return {
		nodes: [node1, node2],
		edges: [
			createMockCanvasEdge({
				id: "edge1",
				fromNode: "node1",
				toNode: "node2",
			}),
		],
		...overrides,
	};
};

/**
 * Create mock CanvasContextSettings with sensible defaults
 */
export const createMockSettings = (
	overrides?: Partial<CanvasContextSettings>,
): CanvasContextSettings => {
	const modelConfig = createMockModelConfiguration();
	const apiKeyConfig = createMockApiKeyConfiguration();

	return {
		currentModel: modelConfig.id,
		modelConfigurations: [modelConfig],
		apiKeys: [apiKeyConfig],
		...overrides,
	};
};

/**
 * Create mock InferenceContext for canvas operations
 */
export const createMockInferenceContext = (
	overrides?: Partial<InferenceContext>,
): InferenceContext => ({
	id: generateTestId("inference"),
	canvasFileName: "Test Canvas.canvas",
	sourceNodeId: generateTestId("node"),
	sourceNodePosition: {
		x: 100,
		y: 200,
		width: 200,
		height: 100,
	},
	timestamp: Date.now(),
	...overrides,
});

/**
 * Create model configurations for all providers
 */
export const createAllProviderConfigurations = (): ModelConfiguration[] => {
	const providers: CurrentProviderType[] = ["ollama", "lmstudio", "openai", "openrouter"];

	return providers.map((provider) =>
		createMockModelConfiguration({
			provider,
			name: `${provider} Model`,
			modelName: provider === "ollama" ? "llama3.1" : "gpt-4",
			baseURL:
				provider === "ollama"
					? "http://localhost:11434"
					: provider === "lmstudio"
						? "http://localhost:1234"
						: provider === "openai"
							? "https://api.openai.com"
							: "https://openrouter.ai/api/v1",
		}),
	);
};

/**
 * Create API keys for cloud providers
 */
export const createCloudProviderApiKeys = (): ApiKeyConfiguration[] => [
	createMockApiKeyConfiguration({
		provider: "openai",
		name: "OpenAI Personal",
		apiKey: "sk-test-openai-key",
	}),
	createMockApiKeyConfiguration({
		provider: "openrouter",
		name: "OpenRouter Test",
		apiKey: "sk-or-test-key",
	}),
];

/**
 * Create a comprehensive test settings object with multiple configs
 */
export const createComprehensiveTestSettings = (): CanvasContextSettings => {
	const modelConfigs = createAllProviderConfigurations();
	const apiKeys = createCloudProviderApiKeys();

	return {
		currentModel: modelConfigs[0].id,
		modelConfigurations: modelConfigs,
		apiKeys,
	};
};